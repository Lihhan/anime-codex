import { _electron as electron } from "playwright";
import electronPath from "electron";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import path from "node:path";
await fs.mkdir("test-results", { recursive: true });
const app = await electron.launch({
  executablePath: process.env.ANIME_CODEX_EXECUTABLE || electronPath,
  args: process.env.ANIME_CODEX_EXECUTABLE ? [] : ["."],
  env: { ...process.env, ANIME_CODEX_DEV: "0" },
  timeout: 30000,
});
try {
  const page = await app.firstWindow();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.getByText("今天想做点什么？").waitFor();
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
    await page.getByLabel("给凛的消息").inputValue(),
    "先帮我了解这个项目的结构",
  );
  await page.getByLabel("给凛的消息").fill("");
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
  await page.getByRole("button", { name: "和凛说话", exact: true }).click();
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
    "Electron UI: layout, sprite, isolated renderer, input, approval dialog and failure passed.",
  );
} finally {
  await app.close();
}
