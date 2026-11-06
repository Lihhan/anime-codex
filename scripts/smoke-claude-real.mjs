// Explicit opt-in: one real Claude turn plus two independent Codex translations.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { ClaudeBackend } = require("../electron/claude.cjs");
const { TranslationService } = require("../electron/translation.cjs");
const {
  loginEnvironment,
  resolveClaude,
} = require("../electron/claude-environment.cjs");
if (process.env.RUN_REAL_CLAUDE !== "1")
  throw new Error("Set RUN_REAL_CLAUDE=1 to use real Claude and Codex quota.");
const directory = await fs.mkdtemp(
  path.join(os.tmpdir(), "anime-claude-real-"),
);
const marker = "ANIME_" + randomUUID();
const file = path.join(directory, "marker.txt");
await fs.writeFile(file, marker);
const env = await loginEnvironment();
const translator = new TranslationService(path.join(directory, "app"));
await translator.load({ enabled: true });
const backend = new ClaudeBackend({
  executable: await resolveClaude({ env }),
  env,
  directory: path.join(directory, "history"),
  translator,
});
let deadline;
try {
  await backend.start();
  console.log(
    "Native Claude version verified; login-shell environment captured without modification.",
  );
  const { thread } = await backend.request("thread/start", {
    cwd: directory,
    developerInstructions:
      "Reply in English. Use the Read tool to read the requested file. Do not modify files.",
  });
  const done = new Promise((resolve, reject) => {
    deadline = setTimeout(
      () => reject(new Error("Real workflow timed out.")),
      300000,
    );
    backend.on("event", (event) => {
      if (event.id !== undefined) {
        // Approve only the fixture Read request, if the user's rules require it.
        const input = event.params.input;
        const allow = event.params.tool === "Read" && input?.file_path === file;
        backend.reply(event.id, { decision: allow ? "accept" : "decline" });
        backend.event("serverRequest/resolved", { requestId: event.id });
      }
      if (event.method === "client/translation")
        console.log("Stage:", event.params.stage);
      if (event.method === "turn/completed") resolve(event.params.turn);
    });
  });
  await backend.request("turn/start", {
    threadId: thread.id,
    input: [
      {
        text:
          "请读取 `" +
          file +
          "`，原样给出文件内容，并用一句话说明你没有修改文件。",
      },
    ],
  });
  const result = await done;
  assert.equal(result.status, "completed", result.error?.message);
  const user = result.items.find((i) => i.type === "userMessage");
  const replies = result.items.filter((i) => i.type === "agentMessage");
  assert.ok(user.translated && user.sentText !== user.content[0].text);
  assert.ok(
    result.items.some(
      (i) => i.tool === "Read" && i.aggregatedOutput?.includes(marker),
    ),
  );
  assert.ok(replies.some((i) => i.originalText.includes(marker)));
  assert.ok(
    replies.some((i) => i.translated && /[\u4e00-\u9fff]/u.test(i.text)),
  );
  assert.ok(replies.every((i) => !i.translationError));
  assert.equal(await fs.readFile(file, "utf8"), marker);
  await backend.saveQueue;
  const stored = JSON.parse(
    await fs.readFile(path.join(directory, "history/threads.json"), "utf8"),
  );
  assert.equal(
    stored[0].turns[0].items.find((i) => i.type === "userMessage").sentText,
    user.sentText,
  );
  await fs.mkdir("test-results", { recursive: true });
  await fs.writeFile(
    "test-results/claude-real.json",
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        version: backend.version,
        inputTranslated: true,
        actualRead: true,
        outputTranslated: true,
        fixtureUnchanged: true,
        localHistoryPersisted: true,
        original: user.content[0].text,
        sent: user.sentText,
        replies: replies.map((i) => ({
          original: i.originalText,
          chinese: i.text,
        })),
      },
      null,
      2,
    ),
  );
  console.log(
    "Real workflow passed: independent Codex translation → Claude Read → independent Chinese translation.",
  );
} finally {
  clearTimeout(deadline);
  backend.close();
}
