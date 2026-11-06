const { EventEmitter } = require("node:events");
const { spawn, execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { createInterface } = require("node:readline");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { claudeArguments } = require("./claude-environment.cjs");

class ClaudeBackend extends EventEmitter {
  constructor({ executable, env, directory, translator, spawnFn = spawn }) {
    super();
    Object.assign(this, {
      executable,
      env: { ...env },
      directory,
      translator,
      spawnFn,
    });
    this.records = [];
    this.pending = new Map();
    this.controls = new Map();
    this.saveQueue = Promise.resolve();
    this.outputQueue = Promise.resolve();
    this.child = null;
    this.connected = false;
    this.active = null;
  }
  async start() {
    const { stdout } = await promisify(execFile)(
      this.executable,
      ["--version"],
      {
        env: this.env,
        timeout: 15000,
        maxBuffer: 1024 * 1024,
      },
    );
    if (!stdout.includes("Claude Code"))
      throw new Error("The selected executable is not Claude Code.");
    this.version = stdout.trim();
    await fs.mkdir(this.directory, { recursive: true });
    try {
      this.records = JSON.parse(
        await fs.readFile(path.join(this.directory, "threads.json"), "utf8"),
      );
      if (!Array.isArray(this.records))
        throw new Error("Invalid Claude conversation store.");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    this.connected = true;
  }
  save() {
    const body = JSON.stringify(this.records);
    const file = path.join(this.directory, "threads.json");
    this.saveQueue = this.saveQueue
      .catch(() => {})
      .then(async () => {
        await fs.writeFile(file + ".tmp", body, { mode: 0o600 });
        await fs.rename(file + ".tmp", file);
      });
    return this.saveQueue;
  }
  event(method, params = {}, id) {
    this.emit("event", { method, params, ...(id === undefined ? {} : { id }) });
  }
  find(id) {
    const record = this.records.find((r) => r.id === id);
    if (!record) throw new Error("Unknown Claude conversation.");
    return record;
  }
  async request(method, params = {}) {
    if (method === "account/read")
      return { account: { type: this.version }, requiresOpenaiAuth: false };
    if (method === "thread/start") {
      const record = {
        id: randomUUID(),
        cwd: params.cwd,
        persona: params.developerInstructions,
        preview: "",
        updatedAt: Date.now() / 1000,
        turns: [],
        started: false,
      };
      if (!path.isAbsolute(record.cwd))
        throw new Error("Select an absolute project directory.");
      this.records.push(record);
      await this.save();
      return { thread: { ...record, turns: [] } };
    }
    if (method === "thread/list")
      return {
        data: this.records
          .filter((r) => r.cwd === params.cwd)
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .map(({ turns, persona, ...r }) => r),
        nextCursor: null,
      };
    if (method === "thread/read" || method === "thread/resume") {
      const record = this.find(params.threadId);
      return { thread: { ...record, turns: [] } };
    }
    if (method === "thread/turns/list")
      return {
        data: [...this.find(params.threadId).turns].reverse(),
        nextCursor: null,
      };
    if (method === "turn/interrupt") {
      this.interrupt();
      return {};
    }
    if (method === "turn/start") {
      if (this.active) throw new Error("Claude is already working.");
      const record = this.find(params.threadId);
      const text = params.input[0].text;
      const turn = { id: randomUUID(), status: "inProgress", items: [] };
      record.turns.push(turn);
      record.preview ||= text.slice(0, 120);
      record.updatedAt = Date.now() / 1000;
      const context = {
        record,
        turn,
        abort: new AbortController(),
        toolItems: new Map(),
        done: false,
      };
      this.active = context;
      this.outputQueue = Promise.resolve();
      this.event("turn/started", { threadId: record.id, turn });
      setImmediate(() =>
        this.run(context, text).catch((error) => this.fail(context, error)),
      );
      return { turn: { id: turn.id, status: "inProgress" } };
    }
    throw new Error("Unsupported Claude operation: " + method);
  }
  isActive(context) {
    return !!context && this.active === context && !context.done;
  }
  item(context, item, completed = true) {
    if (!this.isActive(context)) return;
    const old = context.turn.items.find((i) => i.id === item.id);
    if (old) Object.assign(old, item);
    else context.turn.items.push(item);
    this.event(completed ? "item/completed" : "item/started", {
      threadId: context.record.id,
      turnId: context.turn.id,
      item,
    });
  }
  async run(context, original) {
    const userItem = {
      id: randomUUID(),
      type: "userMessage",
      content: [{ type: "text", text: original }],
      backend: "claude",
      translated: false,
    };
    this.item(context, userItem);
    this.event("client/translation", {
      stage: "input",
      active: this.translator.config.enabled,
    });
    const text = await this.translator.translate(
      original,
      "input",
      context.abort.signal,
    );
    if (!this.isActive(context)) return;
    this.item(context, {
      ...userItem,
      sentText: text,
      translated: this.translator.config.enabled,
    });
    await this.ensureProcess(context);
    if (!this.isActive(context)) return;
    await this.save();
    this.event("client/translation", { stage: "working", active: false });
    this.write({
      type: "user",
      session_id: context.record.id,
      parent_tool_use_id: null,
      client_composed: true,
      message: { role: "user", content: text },
    });
  }
  write(message) {
    if (!this.child?.stdin.writable)
      throw new Error("Claude Code is disconnected.");
    this.child.stdin.write(JSON.stringify(message) + "\n");
  }
  async ensureProcess(context) {
    if (this.child && this.processThread === context.record.id) return;
    this.stopProcess();
    const child = this.spawnFn(
      this.executable,
      claudeArguments(context.record),
      {
        cwd: context.record.cwd,
        env: { ...this.env },
        shell: false,
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    this.child = child;
    this.processThread = context.record.id;
    child.stderr.on("data", () => {}); // Do not expose environment/auth diagnostics in the renderer.
    child.stdin.on("error", (error) => {
      if (this.child === child) this.fail(this.active, error);
    });
    child.on("error", (error) => {
      if (this.child === child) this.fail(this.active, error);
    });
    child.on("exit", (code) => {
      if (this.child !== child) return;
      this.child = null;
      this.rejectControls(new Error("Claude Code exited before responding."));
      const current = this.active;
      this.outputQueue = this.outputQueue.then(() => {
        if (this.isActive(current))
          this.fail(
            current,
            new Error(
              `Claude Code exited (${code}) before completing the turn.`,
            ),
          );
      });
    });
    createInterface({ input: child.stdout }).on("line", (line) => {
      if (this.child !== child) return;
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        return;
      }
      this.receive(message);
    });
    await this.control({ subtype: "initialize" });
  }
  control(request) {
    return new Promise((resolve, reject) => {
      const id = randomUUID();
      const timer = setTimeout(() => {
        this.controls.delete(id);
        reject(new Error("Claude initialization timed out."));
      }, 60000);
      this.controls.set(id, { resolve, reject, timer });
      try {
        this.write({ type: "control_request", request_id: id, request });
      } catch (error) {
        clearTimeout(timer);
        this.controls.delete(id);
        reject(error);
      }
    });
  }
  receive(message) {
    if (message.type === "control_response") {
      const response = message.response;
      const pending = this.controls.get(response?.request_id);
      if (pending) {
        clearTimeout(pending.timer);
        this.controls.delete(response.request_id);
        response.subtype === "error"
          ? pending.reject(new Error(response.error))
          : pending.resolve(response.response);
      }
      return;
    }
    if (message.type === "control_cancel_request") {
      this.pending.delete(message.request_id);
      this.event("serverRequest/resolved", { requestId: message.request_id });
      return;
    }
    const context = this.active;
    if (!context) return;
    if (message.type === "control_request")
      return this.permission(context, message);
    if (message.type === "system" && message.subtype === "init") {
      context.record.started = true;
      context.record.nativeSessionId = message.session_id;
      this.save().catch((error) => this.fail(context, error));
      return;
    }
    if (message.type === "stream_event" && !message.parent_tool_use_id) {
      const event = message.event;
      if (event?.type === "message_start") {
        context.streamId = event.message.id;
        context.streamText = "";
      }
      if (
        event?.type === "content_block_delta" &&
        event.delta?.type === "text_delta" &&
        context.streamId
      ) {
        context.streamText += event.delta.text;
        this.item(
          context,
          {
            id: context.streamId,
            type: "agentMessage",
            backend: "claude",
            originalText: context.streamText,
            text: this.translator.config.enabled ? "" : context.streamText,
            translationPending: this.translator.config.enabled,
          },
          false,
        );
      }
      return;
    }
    // Tool activity and approvals are never delayed behind translation requests.
    if (message.type === "user") {
      for (const block of message.message?.content || [])
        if (block.type === "tool_result") {
          const item = context.toolItems.get(block.tool_use_id);
          if (item)
            this.item(context, {
              ...item,
              status: block.is_error ? "failed" : "completed",
              aggregatedOutput:
                typeof block.content === "string"
                  ? block.content
                  : JSON.stringify(block.content),
              rawResult: block,
            });
        }
    }
    if (message.type === "assistant") {
      for (const block of message.message?.content || [])
        if (block.type === "tool_use") {
          const item = {
            id: block.id,
            type:
              block.name === "Bash"
                ? "commandExecution"
                : ["Write", "Edit", "MultiEdit", "NotebookEdit"].includes(
                      block.name,
                    )
                  ? "fileChange"
                  : "mcpToolCall",
            tool: block.name,
            command: block.input?.command,
            input: block.input,
            status: "inProgress",
            backend: "claude",
          };
          context.toolItems.set(block.id, item);
          this.item(context, item, false);
        }
      const text = (message.message?.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      if (text && !message.parent_tool_use_id) {
        const id = message.message.id || message.uuid || randomUUID();
        this.outputQueue = this.outputQueue
          .then(() => this.response(context, id, text))
          .catch((error) => this.fail(context, error));
      }
    }
    if (message.type === "result") {
      this.outputQueue = this.outputQueue
        .then(async () => {
          if (!this.isActive(context)) return;
          if (
            !context.turn.items.some((i) => i.type === "agentMessage") &&
            message.result
          )
            await this.response(context, randomUUID(), message.result);
          const failed = message.is_error || message.subtype !== "success";
          await this.finish(
            context,
            failed ? "failed" : "completed",
            failed
              ? {
                  message:
                    message.errors?.join("\n") ||
                    message.result ||
                    message.subtype,
                }
              : null,
          );
        })
        .catch((error) => this.fail(context, error));
    }
  }
  async response(context, id, originalText) {
    if (!this.isActive(context)) return;
    const item = {
      id,
      type: "agentMessage",
      backend: "claude",
      originalText,
      text: originalText,
      translated: false,
    };
    if (this.translator.config.enabled) {
      this.item(
        context,
        { ...item, text: "", translationPending: true },
        false,
      );
      this.event("client/translation", { stage: "output", active: true });
      try {
        item.text = await this.translator.translate(
          originalText,
          "output",
          context.abort.signal,
        );
        item.translated = true;
      } catch (error) {
        if (!this.isActive(context)) return;
        item.translationError =
          "Chinese translation failed; original response preserved. " +
          error.message;
      }
    }
    item.translationPending = false;
    this.item(context, item);
    await this.save();
  }
  permission(context, message) {
    const request = message.request || {};
    this.pending.set(message.request_id, request);
    if (request.subtype === "can_use_tool") {
      if (request.tool_name === "AskUserQuestion") {
        this.event(
          "item/tool/requestUserInput",
          {
            threadId: context.record.id,
            questions: (request.input?.questions || []).map((q, i) => ({
              ...q,
              id: String(i),
            })),
            originalRequest: request,
          },
          message.request_id,
        );
      } else
        this.event(
          "item/commandExecution/requestApproval",
          {
            threadId: context.record.id,
            tool: request.tool_name,
            input: request.input,
            command: request.input?.command,
            cwd: context.record.cwd,
            originalRequest: request,
            availableDecisions: ["accept", "decline"],
          },
          message.request_id,
        );
    } else
      this.event(
        "claude/unsupportedRequest",
        { originalRequest: request },
        message.request_id,
      );
  }
  reply(id, result) {
    const request = this.pending.get(String(id));
    if (!request) throw new Error("This Claude request has expired.");
    let response = {
      behavior: "deny",
      message: "The user declined this request.",
    };
    if (
      request.subtype === "can_use_tool" &&
      request.tool_name === "AskUserQuestion" &&
      result.answers
    ) {
      const answers = {};
      (request.input.questions || []).forEach((question, i) => {
        const text = result.answers[String(i)]?.answers?.[0];
        if (!text) throw new Error("Answer every question.");
        answers[question.question] = text;
      });
      response = {
        behavior: "allow",
        updatedInput: { ...request.input, answers },
      };
    } else if (
      request.subtype === "can_use_tool" &&
      result.decision === "accept"
    )
      response = { behavior: "allow", updatedInput: request.input };
    if (request.subtype !== "can_use_tool") return this.reject(id);
    this.write({
      type: "control_response",
      response: { subtype: "success", request_id: String(id), response },
    });
    this.pending.delete(String(id));
  }
  reject(id) {
    if (!this.pending.has(String(id)))
      throw new Error("This Claude request has expired.");
    this.write({
      type: "control_response",
      response: {
        subtype: "error",
        request_id: String(id),
        error: "Unsupported request; no permission granted.",
      },
    });
    this.pending.delete(String(id));
  }
  async finish(context, status, error = null) {
    if (!this.isActive(context)) return;
    for (const item of context.turn.items) {
      if (item.type === "agentMessage" && item.translationPending)
        this.item(context, {
          ...item,
          text: item.originalText || "",
          translationPending: false,
          translationError:
            "Translation interrupted; partial original preserved.",
        });
    }
    context.done = true;
    context.turn.status = status;
    context.turn.error = error;
    this.active = null;
    this.pending.clear();
    this.event("client/translation", { active: false, stage: "idle" });
    this.event("turn/completed", {
      threadId: context.record.id,
      turn: context.turn,
    });
    try {
      await this.save();
    } catch {
      this.emit("disconnect", "Could not save Claude conversation history.");
    }
  }
  fail(context, error) {
    if (!context || !this.isActive(context)) return;
    context.abort.abort();
    this.stopProcess();
    void this.finish(context, "failed", { message: error.message });
  }
  interrupt() {
    const context = this.active;
    if (!context) return;
    context.abort.abort();
    this.stopProcess();
    void this.finish(context, "interrupted");
  }
  rejectControls(error) {
    for (const control of this.controls.values()) {
      clearTimeout(control.timer);
      control.reject(error);
    }
    this.controls.clear();
  }
  stopProcess() {
    const child = this.child;
    this.child = null;
    this.processThread = null;
    this.rejectControls(new Error("Claude Code was stopped."));
    if (child) {
      child.stdin.end();
      child.kill();
      const timer = setTimeout(() => {
        if (child.exitCode === null) child.kill("SIGKILL");
      }, 2000);
      timer.unref();
    }
  }
  close() {
    this.interrupt();
    this.stopProcess();
    this.connected = false;
  }
}
module.exports = { ClaudeBackend };
