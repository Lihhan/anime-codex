import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
const require = createRequire(import.meta.url),
  { Rpc } = require("../electron/rpc.cjs"),
  { loginEnvironment } = require("../electron/claude-environment.cjs");
if (process.env.RUN_REAL_CODEX !== "1") throw Error("Set RUN_REAL_CODEX=1");
const env = { ...process.env };
delete env.CODEX_HOME;
const dir = await fs.mkdtemp(path.resolve("test-results/agent-"));
const rpc = new Rpc(
  process.env.HOME + "/.local/bin/codex",
  undefined,
  await loginEnvironment({ env }),
);
const events = [];
let finish;
const done = new Promise((r) => (finish = r));
let timer;
rpc.on("event", (e) => {
  events.push(e);
  if (e.id !== undefined) rpc.reject(e.id);
  if (e.method === "turn/completed") finish(e.params.turn);
});
try {
  await rpc.start();
  const t = await rpc.request("thread/start", {
    cwd: dir,
    developerInstructions:
      "Only perform the explicit bounded validation task. Never send messages, modify remote files, change settings or delegate. Report evidence accurately.",
  });
  console.log(
    "Native config:",
    t.model,
    t.reasoningEffort,
    t.sandbox.type,
    t.approvalPolicy,
  );
  await rpc.request("turn/start", {
    threadId: t.thread.id,
    input: [
      {
        type: "text",
        text: "Validate this local agent integration. 1. Create sum.mjs exporting sum(a,b), create test.mjs using node:assert to test sum(2,3)===5 and sum(-1,1)===0, and execute node test.mjs. All writes ONLY in current working directory. 2. Use existing SSH alias a800-16 to run only hostname and printf AGENT_SSH_OK (BatchMode=yes, ConnectTimeout=10). No remote writes. 3. Discover the available computer-use tool, read its skill, and use it only to list open applications or inspect desktop screenshot; do not click/type or expose screen image in the reply. Save a compact report.json in cwd with code test exit status, ssh status, computer-use actual tool/method used and success/error. No delegation, no configuration changes. Reply in Chinese.",
        text_elements: [],
      },
    ],
  });
  timer = setTimeout(() => finish({ status: "timeout" }), 240000);
  const turn = await done;
  await fs.writeFile(
    path.join(dir, "events.json"),
    JSON.stringify(events, null, 2),
  );
  console.log("Result", dir, turn.status);
  try {
    console.log(await fs.readFile(path.join(dir, "report.json"), "utf8"));
  } catch {
    console.log("No report file");
  }
  if (turn.status !== "completed") process.exitCode = 1;
} finally {
  clearTimeout(timer);
  rpc.close();
}
