import { _electron as electron } from "playwright";
import electronPath from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
if (process.env.RUN_REAL_CODEX !== "1") throw Error("Set RUN_REAL_CODEX=1");
const directory = await fs.mkdtemp(path.resolve("test-results/computer-ui-"));
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
try {
  const page = await app.firstWindow();
  await page.getByTestId("character-images").waitFor();
  await app.evaluate(async ({ BrowserWindow, dialog }, directory) => {
    const main = BrowserWindow.getAllWindows()[0];
    main.setAlwaysOnTop(false);
    main.hide();
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [directory],
    });
    const w = new BrowserWindow({
      width: 740,
      height: 480,
      title: "Anime Codex Computer Test",
      alwaysOnTop: true,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });
    await w.loadURL(
      "data:text/html;charset=utf-8," +
        encodeURIComponent(
          '<html><head><title>Anime Codex Computer Test</title></head><body style="background:#eef3f6;font:20px system-ui;padding:45px;color:#17342d"><h2>Computer Use Test</h2><p>Only this window is a test fixture.</p><label for="token">Test token</label><input id="token" style="display:block;margin:16px 0;padding:15px;font:20px system-ui;width:90%"><button style="padding:15px 28px;font:20px system-ui" onclick="document.getElementById(\'receipt\').textContent=document.getElementById(\'token\').value">Confirm test</button><p id="receipt"></p></body></html>',
        ),
    );
    w.show();
    w.focus();
  }, directory);
  const result = await page.evaluate(async (appPath) => {
    const api = window.animeCodex;
    await api.connect();
    await api.chooseWorkspace();
    const t = await api.newThread({
      persona:
        "Perform only the bounded test request. Do not delegate. Report actual tool evidence.",
      mode: "inherit",
    });
    window.testEvents = [];
    api.onEvent((e) => window.testEvents.push(e));
    await api.send({
      id: t.thread.id,
      text: "Use cua.getApp with the exact full app path " + JSON.stringify(appPath) + " (do not use Anime Codex name or its shared bundle ID). Use the native computer-use tool (cua) to interact ONLY with the window titled Anime Codex Computer Test, which contains a heading Computer Use Test. Locate that specific test window, click its Test token input, type CUA_VERIFIED_42, and click Confirm test. Verify the text appears below the button. Use actual computer mouse/keyboard tools; do not use shell, browser tools, JavaScript evaluation, file writes, clipboard reads or other shortcuts to operate the UI. Do not interact with any other window or application. Read tool documentation as needed. No delegation. Report success/failure and actual method names.",
    });
    return { threadId: t.thread.id };
  }, path.resolve(process.env.ANIME_CODEX_EXECUTABLE || electronPath, "../../.."));
  await page.waitForFunction(
    () => window.testEvents.some((e) => e.method === "turn/completed"),
    {},
    { timeout: 180000 },
  );
  const fixture = app.windows().find((w) => w !== page);
  const receipt = await fixture.locator("#receipt").textContent();
  const events = await page.evaluate(() => window.testEvents);
  await fs.writeFile(
    path.join(directory, "events.json"),
    JSON.stringify(events, null, 2),
  );
  const report = {
    ...result,
    directory,
    receipt,
    status: events.find((e) => e.method === "turn/completed").params.turn
      .status,
    passed: receipt === "CUA_VERIFIED_42",
  };
  await fs.writeFile(
    "test-results/computer-ui.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
  assert.equal(receipt, "CUA_VERIFIED_42");
} finally {
  await app.close();
}
