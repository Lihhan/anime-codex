const fs = require("node:fs/promises");
const { spawn } = require("node:child_process");
const { createInterface } = require("node:readline");
const { translationArgs } = require("./translation.cjs");
const { loginEnvironment } = require("./claude-environment.cjs");
const { resolveCodex } = require("./codex-executable.cjs");
// Text-only coordinator. Native execution sessions use a separate, unchanged environment.
async function think({
  directory,
  prompt,
  model = "",
  effort = "low",
  signal,
}) {
  const env = await loginEnvironment();
  const executable = await resolveCodex({ env });
  await fs.mkdir(directory, { recursive: true });
  signal?.throwIfAborted();
  const args = translationArgs(directory, model);
  const i = args.indexOf('model_reasoning_effort="low"');
  args[i] = `model_reasoning_effort=${JSON.stringify(effort || "low")}`;
  delete env.OPENAI_API_KEY;
  delete env.CODEX_API_KEY;
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: directory,
      env,
      shell: false,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let text = "",
      complete = false,
      failed = null,
      settled = false;
    const finish = (e) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      if (e) {
        child.kill();
        const force = setTimeout(() => {
          if (child.exitCode === null) child.kill("SIGKILL");
        }, 2000);
        force.unref();
        reject(e);
      } else resolve(text);
    };
    const abort = () => finish(Error("角色回复已停止。"));
    const timer = setTimeout(
      () => finish(Error("角色回复超时，请检查本机 Codex 登录或额度。")),
      180000,
    );
    signal?.addEventListener("abort", abort, { once: true });
    child.stderr.on("data", () => {});
    child.on("error", finish);
    child.stdin.on("error", finish);
    createInterface({ input: child.stdout }).on("line", (line) => {
      let e;
      try {
        e = JSON.parse(line);
      } catch {
        return;
      }
      if (e.type === "turn.completed") complete = true;
      if (["error", "turn.failed"].includes(e.type))
        failed = e.message || e.error?.message || "角色模型请求失败。";
      if (
        e.item &&
        !["agent_message", "reasoning", "error"].includes(e.item.type)
      )
        return finish(
          Error("角色尝试调用执行工具，已停止；请通过任务线程执行。"),
        );
      if (e.type === "item.completed" && e.item?.type === "agent_message")
        text = e.item.text;
    });
    child.on("close", (code) =>
      finish(
        code !== 0 || failed || !complete || !text.trim()
          ? Error(failed || "角色没有返回完整回复。")
          : null,
      ),
    );
    if (signal?.aborted) return abort();
    child.stdin.end(prompt);
  });
}
function parseReply(text) {
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*/, "")
    .replace(/\s*```$/, "");
  let data;
  try {
    data = JSON.parse(stripped);
  } catch {
    return { reply: text, memories: [], task: null };
  }
  if (typeof data.reply !== "string") throw Error("角色返回了无效回复。");
  return {
    reply: data.reply.slice(0, 20000),
    memories: Array.isArray(data.memories)
      ? data.memories
          .filter((x) => typeof x === "string" && x.length <= 1000)
          .slice(0, 3)
      : [],
    task:
      data.task && typeof data.task.prompt === "string"
        ? {
            prompt: data.task.prompt.slice(0, 20000),
            engine: data.task.engine === "claude" ? "claude" : "codex",
            title: String(data.task.title || "新任务").slice(0, 100),
          }
        : null,
  };
}
module.exports = { think, parseReply };
