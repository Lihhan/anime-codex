import {selectSettingsTab} from "./settings-navigation.mjs";
import { _electron as electron } from "playwright";
import electronPath from "electron";
import { useChatLayout } from "./ui-layout.mjs";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import path from "node:path";
await fs.mkdir("test-results", { recursive: true });
const dataDirectory = await fs.mkdtemp(
  path.resolve("test-results/ui-profile-"),
);
const app = await electron.launch({
  executablePath: process.env.ANIME_CODEX_EXECUTABLE || electronPath,
  args: process.env.ANIME_CODEX_EXECUTABLE ? [] : ["."],
  env: {
    ...process.env,
    // This native file is only resolved; the stub below prevents any launch.
    CODEX_PATH: electronPath,
    ANIME_CODEX_DEV: "0",
    ANIME_CODEX_SURFACE: "workbench",
    ANIME_CODEX_AUTOCONNECT: "0",
    ANIME_CODEX_DATA_DIR: dataDirectory,
  },
  timeout: 30000,
});
try {
  const page = await app.firstWindow();
  await useChatLayout(page);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.getByText("今天想做点什么？").waitFor();
  assert.equal(
    await page.locator(".messages").evaluate((el) => el.scrollTop),
    0,
  );
  const setup = page.getByRole("button", {
    name: "连接 Codex 并选择项目",
    exact: true,
  });
  assert.equal(await setup.isEnabled(), true);
  // A failed automatic connection must retain the draft, without starting a real backend.
  await app.evaluate(({ app }) => {
    const require = process
      .getBuiltinModule("module")
      .createRequire(app.getAppPath() + "/package.json");
    require("./electron/rpc.cjs").Rpc.prototype.start = async () => {
      throw new Error("UI fixture: connection failed");
    };
  });
  await page.getByTestId("message-input").fill("尚未连接时尝试发送");
  await page.getByTestId("message-input").press("Enter");
  await page
    .getByRole("alert")
    .getByText("UI fixture: connection failed")
    .waitFor();
  assert.equal(await page.locator(".userMessage").count(), 0);
  await page.getByRole("alert").getByRole("button").click();
  await page.getByTestId("settings-toggle").click();
  await selectSettingsTab(page,"character");
  await page.locator(".settings").evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await page.getByTestId("settings-close").click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.equal(
    await page
      .getByTestId("settings-toggle")
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page.getByTestId("settings-toggle").click();
  await selectSettingsTab(page,"character");
  await page.getByTestId("character-name").fill("Draft name");
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByTestId("settings-toggle").click();
  await selectSettingsTab(page,"character");
  assert.equal(
    await page.getByTestId("character-name").inputValue(),
    "Draft name",
  );
  await page.getByTestId("settings-close").click();
  await page.waitForFunction(() =>
    [...document.images].every((i) => i.complete),
  );
  await page.waitForTimeout(800);
  const imageLoaded = await page.evaluate(async () => {
    const image = new Image();
    image.src = "./characters/rin/sheet.png";
    await image.decode();
    return [image.naturalWidth, image.naturalHeight];
  });
  assert.deepEqual(imageLoaded, [1536, 1024]);
  assert.equal(await page.evaluate(() => typeof window.require), "undefined");
  assert.equal(
    await app.evaluate(
      ({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences()
          .contextIsolation,
    ),
    true,
  );
  await page.getByRole("button", { name: "先帮我了解这个项目的结构" }).click();
  assert.equal(
    await page.getByTestId("message-input").inputValue(),
    "先帮我了解这个项目的结构",
  );
  await page.getByTestId("message-input").fill("");
  await page.screenshot({
    path: "test-results/desktop.png",
    omitBackground: true,
  });
  assert.equal(
    await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
    "rgba(0, 0, 0, 0)",
  );
  assert.equal(
    await app.evaluate(
      ({ nativeImage }, file) => nativeImage.createFromPath(file).toBitmap()[3],
      path.resolve("test-results/desktop.png"),
    ),
    0,
  );
  await page.getByRole("button", { name: "收起对话", exact: true }).click();
  await page.screenshot({
    path: "test-results/character-only.png",
    omitBackground: true,
  });
  await page.getByTestId("toggle-chat").click();
  // Inject protocol events through the real main->preload channel. This is a UI fixture, not an execution result.
  await app.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows()[0];
    w.webContents.send("codex:event", {
      method: "turn/started",
      params: { turn: { id: "ui-fixture" } },
    });
    w.webContents.send("codex:event", {
      id: 7,
      method: "item/commandExecution/requestApproval",
      params: {
        command: "fixture command (not executed)",
        cwd: "C:\\test",
        availableDecisions: ["accept", "decline"],
      },
    });
  });
  await page.getByRole("dialog").waitFor();
  assert.equal(
    await page.getByRole("button", { name: "仅批准这一次" }).count(),
    1,
  );
  await page.screenshot({ path: "test-results/approval.png" });
  await app.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows()[0];
    w.webContents.send("codex:event", {
      method: "turn/completed",
      params: {
        turn: {
          id: "ui-fixture",
          status: "failed",
          error: { message: "Fixture failure; no command executed" },
        },
      },
    });
  });
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByText("Fixture failure; no command executed").waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "Electron UI: layout, images, isolated renderer, input, approval dialog and failure passed.",
  );
} finally {
  await app.close();
}
