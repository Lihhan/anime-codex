import {selectSettingsTab} from "./settings-navigation.mjs";
import { _electron as electron } from "playwright";
import electronPath from "electron";
import { useChatLayout } from "./ui-layout.mjs";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { roster } from "../shared/play-catalog.mjs";
await fs.mkdir("test-results", { recursive: true });
const directory = await fs.mkdtemp(path.resolve("test-results/play-profile-"));
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
const errors = [];
try {
  let page = await app.firstWindow();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.getByTestId("character-images").waitFor();
  await useChatLayout(page);
  await page.getByTestId("language-select").selectOption("en");
  assert.equal(
    await page
      .getByTestId("message-input")
      .evaluate((el) => getComputedStyle(el).fontSize),
    "18px",
  );
  await page.getByTestId("settings-toggle").click();
  await selectSettingsTab(page,"appearance");
  await page.getByTestId("font-size").focus();
  await page.getByTestId("font-size").press("End");
  await page.getByTestId("font-size").press("ArrowLeft");
  await page.getByTestId("font-size").press("ArrowLeft");
  await page.waitForFunction(
    () =>
      getComputedStyle(document.querySelector('[data-testid="message-input"]'))
        .fontSize === "22px",
  );
  await page.getByTestId("settings-close").click();
  await page.waitForTimeout(950);
  const b = await page.getByTestId("character").boundingBox();
  await page.mouse.click(b.x + b.width * 0.5, b.y + b.height * 0.18);
  await page.getByTestId("touch-bubble").waitFor();
  assert.equal(await page.locator(".react-hair").count(), 1);
  await page.getByTestId("settings-toggle").click();
  await selectSettingsTab(page,"appearance");
  await page.getByTestId("touch-enabled").uncheck();
  await page.getByTestId("touch-bubble").waitFor({ state: "detached" });
  await page.getByTestId("settings-close").click();
  await page.mouse.click(b.x + b.width * 0.5, b.y + b.height * 0.18);
  assert.equal(await page.getByTestId("touch-bubble").count(), 0);
  await page.getByTestId("settings-toggle").click();
  await selectSettingsTab(page,"appearance");
  await page.getByTestId("touch-enabled").check();
  await page.getByTestId("settings-close").click();
  const next = app.waitForEvent("window");
  await page.getByTestId("open-play").click();
  const game = await next;
  game.on("pageerror", (e) => errors.push(e.message));
  await game.getByTestId("guess-tab").waitFor();
  assert.equal(
    await game.evaluate(() => typeof window.animeCodex),
    "undefined",
  );
  assert.equal(await game.evaluate(() => typeof window.require), "undefined");
  assert.deepEqual(
    await game.evaluate(() => Object.keys(window.animePlay).sort()),
    ["bootstrap", "close", "onRefresh", "onStatus", "showMain"].sort(),
  );
  await game.waitForFunction(() => document.documentElement.lang === "en");
  assert.equal(
    (await game.evaluate(() => window.animePlay.bootstrap())).character.persona,
    undefined,
  );
  await game.screenshot({ path: "test-results/playroom.png" });
  if (process.env.CAPTURE_PLAY_DEMO === "1")
    await fs.copyFile("test-results/playroom.png", "docs/images/playroom.png");
  await page.getByTestId("open-play").click();
  assert.equal(app.windows().length, 2);
  // Explicit UI-only working fixtures; no programming task is claimed as executed.
  await app.evaluate(({ BrowserWindow }) => {
    const windows = BrowserWindow.getAllWindows(),
      main = windows.find(
        (w) => !w.webContents.getURL().includes("surface=play"),
      ),
      child = windows.find((w) =>
        w.webContents.getURL().includes("surface=play"),
      );
    main.webContents.send("codex:event", {
      method: "turn/started",
      params: { turn: { id: "play-ui-fixture" } },
    });
    child.webContents.send("companion:status", {
      working: true,
      approval: false,
      connected: true,
    });
  });
  await game
    .getByTestId("play-work-status")
    .getByText("I'm still working", { exact: false })
    .waitFor();
  const target = roster.find((c) => c.id === "anya");
  for (let i = 0; i < 10; i++) {
    const q = await game
      .getByTestId("play-speech")
      .getAttribute("data-question");
    if (!q) break;
    await game
      .getByTestId("answer-" + (target.traits.includes(q) ? "yes" : "no"))
      .click();
    await game.waitForFunction(
      (q) =>
        document.querySelector('[data-testid="play-speech"]').dataset
          .question !== q,
      q,
    );
  }
  await game.getByTestId("guess-correct").waitFor();
  assert.ok(
    (await game.getByTestId("play-speech").innerText()).includes("Anya"),
  );
  await game.getByTestId("guess-correct").click();
  await game.getByText("Yes! I guessed it.", { exact: false }).waitFor();
  await game.getByTestId("memory-tab").click();
  for (let id = 0; id < 6; id++) {
    await game.getByTestId("memory-card-" + id).click();
    await game.getByTestId("memory-card-" + (id + 6)).click();
  }
  assert.equal(await game.locator(".memory-card.matched").count(), 12);
  await game.getByText("We found every pair!", { exact: false }).waitFor();
  assert.equal(await page.locator(".working").isVisible(), true);
  await game
    .getByRole("button", { name: "Show main window", exact: true })
    .click();
  assert.equal(
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()
        .find((w) => w.webContents.getURL().includes("surface=play"))
        .isMinimized(),
    ),
    true,
  );
  await page.getByTestId("open-play").click();
  assert.equal(
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()
        .find((w) => w.webContents.getURL().includes("surface=play"))
        .isMinimized(),
    ),
    false,
  );
  assert.equal(await game.locator(".memory-card.matched").count(), 12);
  await page.getByTestId("language-select").selectOption("ja");
  await game.waitForFunction(() => document.documentElement.lang === "ja");
  await game.getByTestId("memory-tab").getByText("絵合わせ").waitFor();
  const closed = game.waitForEvent("close");
  await game.getByTestId("play-close").click();
  await closed;
  assert.equal(app.windows().length, 1);
  assert.equal(await page.locator(".working").isVisible(), true);
  assert.deepEqual(errors, []);
  await app.close();
  app = await electron.launch(options);
  page = await app.firstWindow();
  await page.getByTestId("character-images").waitFor();
  assert.equal(
    await page
      .getByTestId("message-input")
      .evaluate((el) => getComputedStyle(el).fontSize),
    "22px",
  );
  const report = {
    testedAt: new Date().toISOString(),
    fontPersistence: true,
    touchAndOptOut: true,
    separateRestrictedWindow: true,
    guessSolved: true,
    memorySolved: true,
    threeLanguageCatalogs: true,
    gameLanguageRefresh: true,
    mainWorkingFixturePreserved: true,
    programmingExecuted: false,
  };
  await fs.writeFile(
    "test-results/play-real-ui.json",
    JSON.stringify(report, null, 2),
  );
  console.log(
    "Play UI passed: typography, touch, opt-out, separate restricted window, both games, language refresh, work fixture isolation and restart persistence.",
  );
} finally {
  await app.close();
}
