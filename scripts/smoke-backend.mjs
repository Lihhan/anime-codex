import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
const { Rpc } = createRequire(import.meta.url)("../electron/rpc.cjs");
if (process.env.RUN_REAL_CODEX !== "1")
  throw new Error("此检查会调用真实 Codex。请设置 RUN_REAL_CODEX=1 后运行。");
const cwd = path.resolve("test-results/backend-workspace");
await fs.mkdir(cwd, { recursive: true });
const token = "anime-codex-" + Date.now();
await fs.writeFile(path.join(cwd, "input.txt"), token);
const rpc = new Rpc(process.env.CODEX_PATH || "codex");
let threadId;
const events = [];
let complete;
const done = new Promise((resolve, reject) => {
  const timer = setTimeout(
    () => reject(new Error("真实 turn 超过 150 秒")),
    150000,
  );
  complete = (t) => {
    clearTimeout(timer);
    resolve(t);
  };
});
rpc.on("event", (e) => {
  events.push(e);
  if (e.id !== undefined) {
    if (
      e.method.endsWith("/requestApproval") &&
      !e.method.includes("permissions")
    )
      rpc.reply(e.id, { decision: "decline" });
    else rpc.reject(e.id);
  }
  if (e.method === "turn/completed") complete(e.params.turn);
});
try {
  await rpc.start();
  const a = await rpc.request("account/read", { refreshToken: false });
  console.log("Authenticated:", !!a.account);
  const r = await rpc.request("thread/start", {
    cwd,
    sandbox: "workspace-write",
    approvalPolicy: "on-request",
    approvalsReviewer: "user",
    developerInstructions:
      "你是凛。用自然中文回答。只报告真实执行结果。此任务只允许读写当前测试目录。",
  });
  threadId = r.thread.id;
  await rpc.request("turn/start", {
    threadId,
    input: [
      {
        type: "text",
        text: "读取 input.txt，把其中原始内容写入 output.txt。只读写当前目录，不联网，不运行其他任务。完成后用中文报告。",
        text_elements: [],
      },
    ],
  });
  const turn = await done;
  const output = await fs.readFile(path.join(cwd, "output.txt"), "utf8");
  if (output.trim() !== token) throw new Error("输出文件内容不匹配");
  const history = await rpc.request("thread/turns/list", {
    threadId,
    limit: 10,
    itemsView: "full",
  });
  if (!history.data.length) throw new Error("历史为空");
  const resumed = await rpc.request("thread/resume", {
    threadId,
    excludeTurns: true,
    cwd,
    sandbox: "read-only",
    approvalPolicy: "on-request",
  });
  if (resumed.thread.id !== threadId) throw new Error("恢复了错误线程");
  const report = {
    testedAt: new Date().toISOString(),
    threadId,
    status: turn.status,
    fileVerified: true,
    historyTurns: history.data.length,
    deltaCount: events.filter((e) => e.method === "item/agentMessage/delta")
      .length,
    eventMethods: [...new Set(events.map((e) => e.method))],
  };
  await fs.writeFile(
    "test-results/backend.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
  if (turn.status !== "completed") throw new Error("Turn 未完成");
} finally {
  rpc.close();
  complete?.({ status: "interrupted" });
  await done.catch(() => {});
}
