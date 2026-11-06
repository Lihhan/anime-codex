import { _electron as electron } from "playwright";
import electronPath from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const directory = await fs.mkdtemp(
    path.resolve("test-results/companion-real-"),
  ),
  codexProject = path.join(directory, "codex-project"),
  claudeProject = path.join(directory, "claude-project");
await fs.mkdir(codexProject);
await fs.mkdir(claudeProject);
const snack = path.join(directory, "test-snack.txt");
await fs.writeFile(snack, "COMPANION_SNACK_42\n");
const hashes = {};
for (const p of [
  path.join(process.env.HOME, ".codex/config.toml"),
  path.join(process.env.HOME, ".claude/settings.json"),
])
  try {
    hashes[p] = createHash("sha256")
      .update(await fs.readFile(p))
      .digest("hex");
  } catch {}
const env = {
  ...process.env,
  ANIME_CODEX_DATA_DIR: directory,
  ANIME_CODEX_DEV: "0",
};
delete env.CODEX_HOME;
const options = {
  executablePath: process.env.ANIME_CODEX_EXECUTABLE || electronPath,
  args: process.env.ANIME_CODEX_EXECUTABLE ? [] : ["."],
  env,
};
let app = await electron.launch(options);
let report = { directory };
try {
  const page = await app.firstWindow();
  page.on("pageerror", (e) => {
    console.log("PAGE_ERROR", e.stack);
    report.pageError = e.stack;
  });
  await page.getByTestId("companion-app").waitFor();
  await page.evaluate(() =>
    window.animeCodex.companionSettings({
      brainModel: "gpt-6-astra",
      brainEffort: "low",
    }),
  );
  const models = await page.evaluate(() => window.animeCodex.companionModels());
  assert.ok(models.length);
  report.models = models.map((m) => m.model);
  console.log("MODELS", report.models.join(","));
  const preview = await page.evaluate(
    (p) => window.animeCodex.companionFiles({ paths: [p] }),
    snack,
  );
  const eaten = await page.evaluate(
    (token) => window.animeCodex.companionEat({ token }),
    preview.token,
  );
  assert.equal(eaten[0].status, "eaten");
  await assert.rejects(fs.access(snack));
  await page.evaluate(
    (id) => window.animeCodex.companionRestore({ id }),
    eaten[0].id,
  );
  assert.equal(await fs.readFile(snack, "utf8"), "COMPANION_SNACK_42\n");
  report.trashRestore = true;
  console.log("TRASH_RESTORE_OK");
  async function choose(project) {
    await app.evaluate(({ dialog }, project) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [project],
      });
    }, project);
    await page.evaluate(() => window.animeCodex.companionWorkspace());
  }
  await choose(codexProject);
  const codex = await page.evaluate(() =>
    window.animeCodex.companionTask({
      engine: "codex",
      prompt:
        "In this disposable test directory, write proof.mjs using node:assert/strict to verify [2,3,5].reduce((a,b)=>a+b,0) equals 10. Run node proof.mjs. Print COMPANION_CODEX_OK. Do not access other directories, network or delegate. Report actual command and exit result.",
      verificationCommand: "node proof.mjs",
      title: "Codex 本机编写与执行验证",
    }),
  );
  console.log("CODEX_STARTED", codex.id);
  await choose(claudeProject);
  const claude = await page.evaluate(() =>
    window.animeCodex.companionTask({
      engine: "claude",
      prompt:
        "In this disposable test directory, write proof.mjs using node:assert/strict to verify 6*7 equals 42. Run node proof.mjs. Print COMPANION_CLAUDE_OK. Do not access other directories, network or delegate. Report actual command and exit result.",
      verificationCommand: "node proof.mjs",
      title: "Claude 本机编写与执行验证",
    }),
  );
  console.log("CLAUDE_STARTED", claude.id);
  await page.getByTitle("聊天", { exact: true }).click();
  await page
    .getByLabel("和角色说话")
    .fill(
      "两个后台测试任务让他们做就好，我们聊一句：我喜欢薄荷绿，以后称呼我小明。请简短回复，不要新增任务。",
    );
  await page.getByRole("button", { name: "发送 ↗", exact: true }).click();
  await page.locator(".thinking-dots").waitFor({ timeout: 10000 });
  await page.waitForFunction(
    () => !document.querySelector(".thinking-dots"),
    null,
    { timeout: 180000 },
  );
  console.log("CHAT_FINISHED");
  const deadline = Date.now() + 240000;
  while (Date.now() < deadline) {
    const state = await page.evaluate(() => window.animeCodex.companionState());
    for (const task of state.tasks)
      for (const r of task.requests || []) {
        if (
          [
            "item/commandExecution/requestApproval",
            "item/fileChange/requestApproval",
          ].includes(r.method)
        )
          await page.evaluate(
            (args) => window.animeCodex.companionAnswer(args),
            { taskId: task.id, id: r.id, decision: "accept" },
          );
      }
    if (
      state.tasks.every((t) =>
        ["completed", "failed", "interrupted"].includes(t.status),
      )
    ) {
      report.tasks = state.tasks;
      report.messages = state.messages;
      report.memories = state.memories;
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  assert.ok(report.tasks, "tasks timed out");
  for (const task of report.tasks) {
    console.log(
      task.engine,
      task.status,
      task.error || task.output.slice(0, 300),
    );
    assert.equal(task.status, "completed", task.error || task.output);
    assert.equal(task.verification, "passed");
    assert.equal(task.check.exitCode, 0);
  }
  for (const project of [codexProject, claudeProject])
    assert.ok(
      (await fs.readFile(path.join(project, "proof.mjs"), "utf8")).includes(
        "assert",
      ),
    );
  if (!(await page.locator(".companion-tabs").count()))
    await page.getByTitle("聊天", { exact: true }).click();
  await page
    .locator(".companion-tabs")
    .getByRole("button", { name: "任务", exact: true })
    .click();
  await page.screenshot({ path: "test-results/companion-real-tasks.png" });
  await page
    .locator(".companion-tabs")
    .getByRole("button", { name: "聊聊", exact: true })
    .click();
  await page.screenshot({ path: "test-results/companion-real-chat.png" });
  await page.evaluate(() =>
    window.animeCodex.companionMemory({
      text: "验证用记忆：喜欢薄荷绿，称呼小明。",
    }),
  );
  await app.close();
  app = await electron.launch(options);
  const again = await app.firstWindow();
  await again.getByTestId("companion-app").waitFor();
  const restored = await again.evaluate(() =>
    window.animeCodex.companionState(),
  );
  assert.equal(restored.tasks.length, 2);
  assert.ok(restored.messages.some((m) => m.text.includes("薄荷绿")));
  assert.ok(restored.memories.some((m) => m.status === "confirmed"));
  report.restart = true;
  for (const [file, hash] of Object.entries(hashes))
    assert.equal(
      createHash("sha256")
        .update(await fs.readFile(file))
        .digest("hex"),
      hash,
    );
  report.configUnchanged = true;
  await fs.writeFile(
    "test-results/companion-real.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify({ directory, success: true }));
} catch (e) {
  report.error = e.stack;
  await fs.writeFile(
    "test-results/companion-real.json",
    JSON.stringify(report, null, 2),
  );
  throw e;
} finally {
  await app.close();
}
