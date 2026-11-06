import { _electron as electron } from "playwright";
import electronPath from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const directory = await fs.mkdtemp(path.resolve("test-results/workbench-")),
  workspace = path.join(directory, "project");
await fs.mkdir(workspace);
const config = path.join(process.env.HOME, ".codex/config.toml"),
  hash = (b) => createHash("sha256").update(b).digest("hex"),
  before = hash(await fs.readFile(config));
const env = {
  ...process.env,
  ANIME_CODEX_DEV: "0",
  ANIME_CODEX_DATA_DIR: directory,
};
delete env.CODEX_HOME;
const app = await electron.launch({
  executablePath: process.env.ANIME_CODEX_EXECUTABLE || electronPath,
  args: process.env.ANIME_CODEX_EXECUTABLE ? [] : ["."],
  env,
});
const errors = [];
try {
  const page = await app.firstWindow();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.getByTestId("character-images").waitFor();
  await app.evaluate(({ BrowserWindow, dialog }, workspace) => {
    BrowserWindow.getAllWindows()[0].webContents.send("codex:event", {
      method: "client/inputRestored",
      params: {},
    });
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [workspace],
    });
  }, workspace);
  await page.getByTestId("gal-connect").click();
  await page.getByTestId("settings-toggle").click();
  await page.getByTestId("codex-model").selectOption("gpt-6-astra");
  await page.getByTestId("codex-effort").selectOption("high");
  await page.getByTestId("save-codex-model").click();
  await page
    .getByText("已保存，下一条消息使用新会话。", { exact: true })
    .waitFor();
  await page.screenshot({ path: "test-results/workbench-models.png" });
  const result = await page.evaluate(async () => {
    const api = window.animeCodex;
    await api.chooseWorkspace();
    const t = await api.newThread({
      persona: "Report actual evidence clearly.",
      mode: "inherit",
    });
    return {
      id: t.thread.id,
      model: t.model,
      effort: t.reasoningEffort,
      sandbox: t.sandbox,
      approval: t.approvalPolicy,
    };
  });
  assert.equal(result.model, "gpt-6-astra");
  assert.equal(result.effort, "high");
  assert.equal(result.sandbox.type, "dangerFullAccess");
  assert.equal(result.approval, "never");
  if (process.env.RUN_REAL_CODEX === "1") {
    await page.evaluate(async (id) => {
      window.testEvents = [];
      window.animeCodex.onEvent((e) => window.testEvents.push(e));
      await window.animeCodex.send({
        id,
        text: "Create ui-agent-proof.mjs in this current directory that imports node:assert/strict and asserts 6*7===42; execute it with node. Do not access or modify other files. No delegation. Report the test exit status.",
      });
    }, result.id);
    await page.waitForFunction(
      () => window.testEvents.some((e) => e.method === "turn/completed"),
      {},
      { timeout: 180000 },
    );
    const events = await page.evaluate(() => window.testEvents);
    assert.equal(
      events.find((e) => e.method === "turn/completed").params.turn.status,
      "completed",
    );
    assert.ok(
      (
        await fs.readFile(path.join(workspace, "ui-agent-proof.mjs"), "utf8")
      ).includes("42"),
    );
    await fs.writeFile(
      path.join(directory, "agent-events.json"),
      JSON.stringify(events, null, 2),
    );
  }
  await page.getByTestId("settings-tab-character").click();
  await page.getByTestId("studio-name").fill("小苔");
  await page.getByTestId("studio-work").fill("原创角色");
  await page.screenshot({ path: "test-results/workbench-studio.png" });
  await page.getByTestId("settings-close").click();
  await page.getByRole("button", { name: "展开工作台", exact: true }).click();
  await page.screenshot({ path: "test-results/workbench-overview.png" });
  assert.deepEqual(errors, []);
  assert.equal(hash(await fs.readFile(config)), before);
  const persisted = JSON.parse(
    await fs.readFile(path.join(directory, "preferences.json")),
  );
  assert.deepEqual(persisted.codexModel, {
    model: "gpt-6-astra",
    effort: "high",
  });
  await fs.writeFile(
    process.env.RUN_REAL_CODEX === "1"
      ? "test-results/workbench-real.json"
      : "test-results/workbench.json",
    JSON.stringify(
      {
        directory,
        result,
        globalConfigUnchanged: true,
        errors,
        real: process.env.RUN_REAL_CODEX === "1",
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({ directory, result, globalConfigUnchanged: true, errors }),
  );
} finally {
  await app.close();
}
