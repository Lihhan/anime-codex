const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { Rpc } = require("./rpc.cjs");
const { ClaudeBackend } = require("./claude.cjs");
const { loginEnvironment, resolveClaude } = require("./claude-environment.cjs");
const { resolveCodex } = require("./codex-executable.cjs");
const { approvalMethods, approvalResult } = require("./policy.cjs");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { checkCommand } = require("./check-command.cjs");
class TaskManager {
  constructor({ store, notify, onFinish, translator, createConnection }) {
    Object.assign(this, {
      store,
      notify,
      onFinish,
      translator,
      createConnection,
    });
    this.active = new Map();
    this.closed = false;
  }
  async create(input) {
    const {
      engine = "codex",
      workspace,
      prompt,
      characterId,
      model = "",
      effort = "",
    } = input;
    if (
      !["codex", "claude"].includes(engine) ||
      !path.isAbsolute(workspace || "") ||
      !(await fs.stat(workspace)).isDirectory()
    )
      throw Error("请选择有效项目目录和执行器。");
    if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 50000)
      throw Error("任务不能为空或超过 50000 字。");
    if (
      typeof model !== "string" ||
      model.length > 200 ||
      !["", "minimal", "low", "medium", "high", "xhigh", "max"].includes(effort)
    )
      throw Error("模型设置无效。");
    const verificationCommand =
      typeof input.verificationCommand === "string"
        ? input.verificationCommand.trim().slice(0, 4000)
        : "";
    const task = {
      id: randomUUID(),
      characterId,
      engine,
      workspace: await fs.realpath(workspace),
      prompt,
      title: String(input.title || prompt).slice(0, 100),
      model,
      effort,
      status: "queued",
      createdAt: new Date().toISOString(),
      events: [],
      output: "",
      verification: "unverified",
      verificationCommand,
      threadId: null,
      turnId: null,
      requests: [],
    };
    this.store.state.tasks.push(task);
    await this.store.save();
    this.notify();
    this.pump();
    return task;
  }
  pump() {
    if (this.closed) return;
    for (const t of this.store.state.tasks) {
      if (this.active.size >= 2) break;
      if (
        t.status !== "queued" ||
        [...this.active.values()].some((x) => x.task.workspace === t.workspace)
      )
        continue;
      const handle = { task: t, control: new AbortController(), rpc: null };
      this.active.set(t.id, handle);
      void this.run(handle).catch((e) => {
        t.status = "failed";
        t.error = e.message;
        this.notify();
      });
    }
  }
  async run(handle) {
    const { task: t, control } = handle;
    let rpc, timer;
    let settle;
    const done = new Promise((resolve, reject) => {
      settle = { resolve, reject };
    });
    done.catch(() => {});
    const cancel = () => {
      rpc?.close();
      settle.reject(Error("任务已停止。"));
    };
    control.signal.addEventListener("abort", cancel, { once: true });
    try {
      t.status = "running";
      t.error = null;
      t.check = null;
      t.verification = "unverified";
      t.currentActivity = "thinking";
      t.finishedAt = null;
      t.requests = [];
      t.output = "";
      await this.store.save();
      this.notify();
      const env = await loginEnvironment();
      control.signal.throwIfAborted();
      rpc = this.createConnection
        ? await this.createConnection(t, env)
        : t.engine === "codex"
          ? new Rpc(await resolveCodex({ env }), undefined, env)
          : new ClaudeBackend({
              executable: await resolveClaude({ env }),
              env,
              directory: path.join(this.store.directory, "workers", t.id),
              translator: this.translator,
            });
      handle.rpc = rpc;
      control.signal.throwIfAborted();
      rpc.on("disconnect", (message) => settle.reject(Error(message)));
      rpc.on("event", (e) => {
        if (control.signal.aborted || handle.cancelling) return;
        if (e.id !== undefined) {
          t.requests.push({ id: e.id, method: e.method, params: e.params });
          t.status = "waiting";
          void this.store.save().catch(() => {});
          this.notify();
          return;
        }
        if (e.method === "turn/started") t.turnId = e.params.turn.id;
        if (e.method === "item/started") {
          t.currentActivity = e.params.item.type;
          this.notify();
        }
        if (e.method === "serverRequest/resolved") {
          t.requests = t.requests.filter(
            (r) => String(r.id) !== String(e.params.requestId),
          );
          if (!t.requests.length) t.status = "running";
        }
        if (e.method === "item/completed") {
          const item = e.params.item;
          if (item.type === "agentMessage") t.output = item.text || t.output;
          else {
            const record = {
              time: new Date().toISOString(),
              type: item.type,
              status: item.status,
              exitCode: item.exitCode,
              command: item.command,
              output:
                typeof item.aggregatedOutput === "string"
                  ? item.aggregatedOutput.slice(-4000)
                  : undefined,
            };
            t.events.push(record);
            if (t.events.length > 100) t.events.shift();
          }
          void this.store.save().catch(() => {});
          this.notify();
        }
        if (e.method === "turn/completed") {
          t.turnId = e.params.turn.id;
          e.params.turn.status === "completed"
            ? settle.resolve()
            : settle.reject(
                Error(e.params.turn.error?.message || "执行线程未正常完成。"),
              );
        }
      });
      await rpc.start();
      control.signal.throwIfAborted();
      const options = {
        cwd: t.workspace,
        developerInstructions:
          "Complete the user task in this workspace. Preserve native permission boundaries. Report files changed, commands actually run, exit results, and unresolved limitations. Do not claim checks you did not run.",
      };
      if (t.engine === "codex") {
        if (t.model) options.model = t.model;
        if (t.effort) options.config = { model_reasoning_effort: t.effort };
      }
      const result = await rpc.request(
        t.threadId ? "thread/resume" : "thread/start",
        { ...options, ...(t.threadId ? { threadId: t.threadId } : {}) },
      );
      t.threadId = result.thread.id;
      t.effectiveModel = result.model || null;
      await this.store.save();
      this.notify();
      control.signal.throwIfAborted();
      timer = setTimeout(() => {
        rpc.close();
        settle.reject(
          Error("任务超过一小时，已停止。可检查结果后继续原线程。"),
        );
      }, 3600000);
      await rpc.request("turn/start", {
        threadId: t.threadId,
        input: [
          { type: "text", text: t.followup || t.prompt, text_elements: [] },
        ],
      });
      await done;
      t.status = "completed";
      t.verification = "unverified";
      if (t.verificationCommand) {
        t.status = "running";
        t.currentActivity = "verification";
        this.notify();
        try {
          const check = checkCommand(t.verificationCommand, env);
          const r = await promisify(execFile)(check.executable, check.args, {
            cwd: t.workspace,
            env,
            windowsHide: true,
            timeout: 60000,
            maxBuffer: 1024 * 1024,
            signal: control.signal,
          });
          t.check = {
            command: t.verificationCommand,
            exitCode: 0,
            output: (r.stdout + "\n" + r.stderr).slice(-16000),
          };
          t.verification = "passed";
        } catch (e) {
          if (control.signal.aborted) throw e;
          t.check = {
            command: t.verificationCommand,
            exitCode: e.code,
            output: (
              (e.stdout || "") +
              "\n" +
              (e.stderr || "") +
              "\n" +
              e.message
            ).slice(-16000),
          };
          t.verification = "failed";
        }
        t.status = "completed";
      }
    } catch (e) {
      t.status =
        control.signal.aborted || handle.cancelling ? "interrupted" : "failed";
      t.error = e.message;
    } finally {
      clearTimeout(timer);
      control.signal.removeEventListener("abort", cancel);
      t.requests = [];
      t.finishedAt = new Date().toISOString();
      rpc?.close();
      try {
        if (rpc?.saveQueue) await rpc.saveQueue;
        await this.store.save();
      } finally {
        this.active.delete(t.id);
      }
      this.notify();
      this.pump();
      if (!this.closed) await this.onFinish(structuredClone(t));
    }
  }
  async cancel(id) {
    const t = this.find(id);
    if (t.status === "queued") {
      t.status = "interrupted";
      t.error = "任务在执行前已取消。";
      await this.store.save();
      this.notify();
      return;
    }
    const handle = this.active.get(id);
    if (!handle) return;
    handle.cancelling = true;
    if (handle.rpc && t.threadId && t.turnId) {
      let timeout;
      try {
        await Promise.race([
          handle.rpc.request("turn/interrupt", {
            threadId: t.threadId,
            turnId: t.turnId,
          }),
          new Promise((resolve) => {
            timeout = setTimeout(resolve, 2000);
          }),
        ]);
      } catch {
      } finally {
        clearTimeout(timeout);
      }
    }
    handle.control.abort();
  }
  find(id) {
    const t = this.store.state.tasks.find((t) => t.id === id);
    if (!t) throw Error("任务不存在。");
    return t;
  }
  async resume(id, text) {
    const t = this.find(id);
    if (["running", "waiting", "queued"].includes(t.status))
      throw Error("任务仍在运行。");
    if (!t.threadId) throw Error("尚无可恢复线程，请新建任务。");
    t.followup =
      typeof text === "string" && text.trim()
        ? text.trim().slice(0, 50000)
        : "检查已有改动与执行结果，继续完成原任务。不要重复已经完成的外部操作。";
    t.status = "queued";
    await this.store.save();
    this.notify();
    this.pump();
  }
  async answer({ taskId, id, decision, answers }) {
    const t = this.find(taskId),
      h = this.active.get(taskId),
      r = t.requests.find((r) => String(r.id) === String(id));
    if (!h?.rpc || h.cancelling || h.control.signal.aborted || !r)
      throw Error("请求已失效。");
    let result;
    if (approvalMethods.includes(r.method))
      result = approvalResult(r, decision);
    else if (r.method === "item/tool/requestUserInput") {
      result = { answers: {} };
      for (const q of r.params.questions) {
        if (!answers?.[q.id]?.trim()) throw Error("请回答所有问题。");
        result.answers[q.id] = { answers: [answers[q.id]] };
      }
    } else if (r.method === "item/permissions/requestApproval")
      result = { permissions: {}, scope: "turn" };
    else if (r.method === "mcpServer/elicitation/request")
      result = { action: "decline", content: null, _meta: null };
    else {
      h.rpc.reject(r.id);
      t.requests = t.requests.filter((x) => x !== r);
      if (!t.requests.length) t.status = "running";
      this.notify();
      return;
    }
    h.rpc.reply(r.id, result);
    t.requests = t.requests.filter((x) => x !== r);
    if (!t.requests.length) t.status = "running";
    await this.store.save();
    this.notify();
  }
  async close() {
    this.closed = true;
    await Promise.allSettled(
      [...this.active.keys()].map((id) => this.cancel(id)),
    );
    while (this.active.size) await new Promise((r) => setTimeout(r, 25));
    await this.store.queue;
  }
}
module.exports = { TaskManager };
