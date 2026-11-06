import { _electron as electron } from "playwright";
import electronPath from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const directory = await fs.mkdtemp(path.resolve("test-results/companion-"));
const env = {
  ...process.env,
  ANIME_CODEX_DATA_DIR: directory,
  ANIME_CODEX_DEV: "0",
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
  await page.getByTestId("companion-app").waitFor({ timeout: 30000 });
  await page.getByTitle("聊天", { exact: true }).click();
  await page.getByTestId("companion-panel").waitFor();
  await page.screenshot({ path: "test-results/companion-chat.png" });
  await page
    .locator(".companion-tabs")
    .getByText("记忆", { exact: true })
    .click();
  await page.getByLabel("新增记忆").fill("我喜欢薄荷绿，测试专用。");
  await page.getByText("记住这件事", { exact: true }).click();
  await page.getByText("已经记住", { exact: true }).waitFor();
  await page
    .locator(".companion-tabs")
    .getByText("生活", { exact: true })
    .click();
  await page.getByText("一起玩", { exact: true }).click();
  await page.getByLabel("接住星星").click();
  await page.screenshot({ path: "test-results/companion-life.png" });
  await page
    .locator(".companion-tabs")
    .getByText("设置", { exact: true })
    .click();
  await page.screenshot({ path: "test-results/companion-settings.png" });
  await page.getByLabel("跟随全局键鼠节奏（只读取计数）").click();
  await page.waitForFunction(
    async () =>
      (await window.animeCodex.companionState()).settings.keyboard === true,
    null,
    { timeout: 70000 },
  );
  await page.locator(".pet-keyboard").waitFor();
  await page.getByLabel("跟随全局键鼠节奏（只读取计数）").click();
  await page.waitForFunction(
    async () =>
      (await window.animeCodex.companionState()).settings.keyboard === false,
  );
  await page.getByLabel("切换角色").selectOption({ index: 1 });
  await page.waitForFunction(
    () =>
      !document
        .querySelector(".companion-header h1")
        .textContent.startsWith("凛"),
  );
  assert.equal(
    (await page.evaluate(() => window.animeCodex.companionState())).memories
      .length,
    0,
  );
  await page.getByLabel("切换角色").selectOption({ index: 0 });
  await page.waitForFunction(
    async () =>
      (await window.animeCodex.companionState()).memories.length === 1,
  );
  await page.getByTitle("收起面板，角色继续陪伴").click();
  assert.equal(await page.getByTestId("companion-panel").count(), 0);
  await page.screenshot({ path: "test-results/companion-desktop.png" });
  const snapshot = await page.evaluate(() =>
    window.animeCodex.companionState(),
  );
  assert.equal(snapshot.memories.length, 1);
  await page.getByTitle("收成小挂件").click();
  await page.locator(".pet-world.is-mini").waitFor();
  await page.getByTitle("展开角色").click();
  await page.evaluate(() =>
    window.animeCodex.windowControl({ action: "close" }),
  );
  assert.equal(
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].isVisible(),
    ),
    false,
  );
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].show(),
  );
  assert.deepEqual(errors, []);
  await fs.writeFile(
    "test-results/companion-ui.json",
    JSON.stringify(
      {
        directory,
        memories: snapshot.memories,
        keyboardHelper: true,
        hideKeepsAlive: true,
        roleIsolation: true,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ directory, success: true }));
} finally {
  await app.close();
}
