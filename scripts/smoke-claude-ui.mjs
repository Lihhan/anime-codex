import { _electron as electron } from "playwright";
import electronPath from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const real = process.env.RUN_REAL_CLAUDE === "1";
await fs.mkdir("test-results", { recursive: true });
const directory = await fs.mkdtemp(path.resolve("test-results/claude-ui-"));
const workspace = path.join(directory, "project");
await fs.mkdir(workspace);
const marker = "UI_" + randomUUID();
await fs.writeFile(path.join(workspace, "marker.txt"), marker);
const options = {
  executablePath: process.env.ANIME_CODEX_EXECUTABLE || electronPath,
  args: process.env.ANIME_CODEX_EXECUTABLE ? [] : ["."],
  env: {
    ...process.env,
    ANIME_CODEX_DEV: "0",
    ANIME_CODEX_SURFACE: "workbench",
    ANIME_CODEX_AUTOCONNECT: "0",
    ANIME_CODEX_DATA_DIR: directory,
  },
};
let app = await electron.launch(options);
app
  .process()
  .on("exit", (code, signal) => console.log("Electron exit:", code, signal));
app.process().stderr.on("data", (data) => {
  void fs.appendFile(path.join(directory, "electron-stderr.log"), data);
});
let threadId;
const errors = [];
try {
  let page = await app.firstWindow();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.getByTestId("character-images").waitFor();
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].webContents.send("codex:event", {
      method: "client/inputRestored",
      params: {},
    }),
  );
  await page.getByTestId("language-select").selectOption("en");
  await page.waitForFunction(() => document.documentElement.lang === "en");
  await page.getByTestId("settings-toggle").click();
  await page.getByTestId("backend-select").selectOption("claude");
  await page.waitForFunction(
    async () => (await window.animeCodex.bootstrap()).backend === "claude",
  );
  assert.equal(await page.getByTestId("translation-enabled").isChecked(), true);
  assert.equal(
    await page.getByText("Read-only (default)", { exact: true }).count(),
    0,
  );
  await page.getByTestId("translation-save").click();
  await page
    .getByText("Saved; the next message will start a new conversation.", {
      exact: true,
    })
    .waitFor();
  await page.getByTestId("settings-close").click();
  await app.evaluate(({ dialog }, dir) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [dir] });
  }, workspace);
  await page.getByTestId("gal-connect").click();
  await page
    .getByTestId("gal-connect")
    .waitFor({ state: "hidden", timeout: 60000 });
  if (real) {
    await page.evaluate(() => {
      window.__testEvents = [];
      window.animeCodex.onEvent((event) => window.__testEvents.push(event));
    });
    await page
      .getByTestId("gal-input")
      .fill(
        "请使用 Read 工具读取 `marker.txt`，原样给出其内容，并说明没有修改文件。不要调用其他工具。",
      );
    await page.getByTestId("gal-send").click();
    await page.getByTestId("gal-stop").waitFor({ timeout: 30000 });
    await page.getByTestId("settings-toggle").click();
    assert.equal(await page.getByTestId("backend-select").isDisabled(), true);
    await page.getByTestId("settings-close").click();
    // No blanket auto-approval: only a Read of this disposable fixture may be accepted.
    const end = Date.now() + 300000;
    while (
      !(await page.evaluate(() =>
        window.__testEvents.some((e) => e.method === "turn/completed"),
      ))
    ) {
      if (Date.now() > end) throw new Error("UI workflow timed out.");
      const request = page.getByRole("dialog");
      if (await request.count()) {
        const text = await request.innerText();
        const allow =
          text.includes('"tool": "Read"') && text.includes("marker.txt");
        await request
          .getByRole("button", {
            name: allow ? "Approve once" : "Decline",
            exact: true,
          })
          .click();
      }
      await page.waitForTimeout(300);
    }
    await page.evaluate(() =>
      window.animeCodex.desktopControl({ action: "expand" }),
    );
    if (await page.locator(".app.dialogue-closed").count())
      await page.getByTestId("toggle-chat").click();
    if (await page.locator(".app.workbench-open").count())
      await page
        .getByRole("button", { name: "Hide workspace", exact: true })
        .click();
    await page.getByTestId("gal-history").click();
    const replies = await page
      .locator(".agentMessage .message-body")
      .allTextContents();
    await fs.writeFile(
      path.join(directory, "ui-evidence.json"),
      JSON.stringify(
        {
          replies,
          errors: await page.locator(".error").allTextContents(),
          events: await page.evaluate(() => window.__testEvents),
        },
        null,
        2,
      ),
    );
    assert.ok(replies.join("").includes(marker));
    assert.match(replies.join(""), /[\u4e00-\u9fff]/u);
    assert.equal(await page.locator(".translation-error").count(), 0);
    assert.equal(await page.locator(".error").count(), 0);
    assert.ok((await page.locator(".translation-original").count()) >= 2);
    const list = await page.evaluate(() => window.animeCodex.listThreads());
    threadId = list.data[0].id;
    assert.equal(
      await fs.readFile(path.join(workspace, "marker.txt"), "utf8"),
      marker,
    );
    await page.screenshot({ path: "test-results/claude-translated-ui.png" });
  }
  await app.close();
  app = await electron.launch(options);
  page = await app.firstWindow();
  await page.getByTestId("character-images").waitFor();
  const prefs = await page.evaluate(() => window.animeCodex.bootstrap());
  assert.equal(prefs.backend, "claude");
  assert.equal(prefs.translation.provider, "codex");
  assert.equal(prefs.translation.enabled, true);
  await app.evaluate(({ dialog }, dir) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [dir] });
  }, workspace);
  await page.getByTestId("gal-connect").click();
  await page
    .getByTestId("gal-connect")
    .waitFor({ state: "hidden", timeout: 60000 });
  if (threadId) {
    const history = await page.evaluate(async (id) => {
      await window.animeCodex.resume({ id, persona: "", mode: "read-only" });
      return window.animeCodex.history({ id });
    }, threadId);
    assert.ok(
      history.data[0].items.some(
        (i) => i.translated && i.originalText?.includes(marker),
      ),
    );
  }
  await page.getByTestId("settings-toggle").click();
  await page.getByTestId("backend-select").selectOption("codex");
  await page.waitForFunction(
    async () => (await window.animeCodex.bootstrap()).backend === "codex",
  );
  await page.getByTestId("settings-close").click();
  await page.getByTestId("gal-connect").waitFor();
  assert.deepEqual(errors, []);
  await fs.writeFile(
    real ? "test-results/claude-ui-real.json" : "test-results/claude-ui.json",
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        realModelTurn: real,
        packaged: !!process.env.ANIME_CODEX_EXECUTABLE,
        backendSwitch: true,
        settingsPersisted: true,
        connection: true,
        originalAndTranslation: !!threadId,
        restartHistory: !!threadId,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    "Claude UI passed: backend selection, native connection, settings persistence, switching back" +
      (real
        ? ", real translated file read and restart history."
        : ". No model turn."),
  );
} finally {
  await app.close();
}
