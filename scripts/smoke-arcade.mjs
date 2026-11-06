import { selectSettingsTab } from "./settings-navigation.mjs";
import { _electron as electron } from "playwright";
import electronPath from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
await fs.mkdir("test-results", { recursive: true });
const directory = await fs.mkdtemp(
  path.resolve("test-results/arcade-profile-"),
);
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
  await page.getByTestId("language-select").selectOption("en");
  const original = (await page.evaluate(() => window.animeCodex.bootstrap()))
    .character.images.idle.src;
  const file = path.join(directory, "custom-image.png");
  const png = await app.evaluate(({ nativeImage }) => {
    const pixels = Buffer.alloc(20 * 30 * 4, 255);
    return nativeImage
      .createFromBitmap(pixels, { width: 20, height: 30 })
      .toPNG()
      .toString("base64");
  });
  await fs.writeFile(file, Buffer.from(png, "base64"));
  await app.evaluate(({ dialog }, file) => {
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [file],
    });
  }, file);
  await page.getByTestId("settings-toggle").click();
  await selectSettingsTab(page, "character");
  await page.getByTestId("upload-idle").click();
  await page.waitForFunction(() =>
    document
      .querySelector('[data-testid="character-name"]')
      .value.includes("Custom"),
  );
  const customId = await page.getByTestId("character-select").inputValue();
  const custom = (await page.evaluate(() => window.animeCodex.bootstrap()))
    .character.images.idle.src;
  assert.notEqual(custom, original);
  await page.getByTestId("original-rin").click();
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="character-name"]').value === "Rin",
  );
  assert.equal(
    (await page.evaluate(() => window.animeCodex.bootstrap())).character.images
      .idle.src,
    original,
  );
  await page.getByTestId("character-select").selectOption(customId);
  assert.equal(
    (await page.evaluate(() => window.animeCodex.bootstrap())).character.images
      .idle.src,
    custom,
  );
  await page.getByTestId("original-rin").click();
  await page.getByTestId("settings-close").click();
  const next = app.waitForEvent("window");
  await page.getByTestId("open-play").click();
  let game = await next;
  game.on("pageerror", (e) => errors.push(e.message));
  await game.getByTestId("hop-tab").click();
  assert.equal(
    await game.getByTestId("arcade-game").getAttribute("data-sprite-source"),
    "beagle",
  );
  assert.equal(
    await game.getByTestId("arcade-game").getAttribute("data-art-style"),
    "pixel",
  );
  assert.deepEqual(
    await game
      .getByTestId("arcade-canvas")
      .evaluate((el) => [
        el.width,
        el.height,
        el.getContext("2d").imageSmoothingEnabled,
        getComputedStyle(el).imageRendering,
      ]),
    [400, 210, false, "pixelated"],
  );
  assert.equal(await game.locator(".state-image").count(), 0);
  await game.waitForFunction(
    () =>
      document.querySelector('[data-testid="arcade-game"]').dataset
        .spriteReady === "true",
  );
  assert.equal(
    await game
      .locator(".arcade-hint")
      .evaluate((el) => el.getBoundingClientRect().bottom <= innerHeight),
    true,
  );
  const surface = await game.getByTestId("arcade-canvas").boundingBox();
  await game.mouse.move(
    surface.x + surface.width / 2,
    surface.y + surface.height / 2,
  );
  await game.mouse.down();
  await game.waitForTimeout(555);
  await game.mouse.up();
  await game.waitForFunction(
    () =>
      Number(
        document.querySelector('[data-testid="arcade-game"]').dataset.score,
      ) > 0,
    {},
    { timeout: 5000 },
  );
  const hopScore = Number(
    await game.getByTestId("arcade-game").getAttribute("data-score"),
  );
  await game.screenshot({ path: "test-results/hop-game.png" });
  if (process.env.CAPTURE_ARCADE_DEMO === "1")
    await fs.copyFile("test-results/hop-game.png", "docs/images/hop-game.png");
  await game.getByTestId("arcade-pause").click();
  assert.equal(
    await game.getByTestId("arcade-game").getAttribute("data-paused"),
    "true",
  );
  await game.getByTestId("runner-tab").click();
  assert.equal(
    await game.getByTestId("arcade-game").getAttribute("data-sprite-source"),
    "beagle",
  );
  await game.getByTestId("arcade-canvas").focus();
  await game.keyboard.press("Space");
  await game.waitForFunction(
    () =>
      document.querySelector('[data-testid="arcade-game"]').dataset.airborne ===
      "true",
  );
  await game.waitForTimeout(650);
  await game.screenshot({ path: "test-results/runner-game.png" });
  if (process.env.CAPTURE_ARCADE_DEMO === "1")
    await fs.copyFile(
      "test-results/runner-game.png",
      "docs/images/runner-game.png",
    );
  await game.getByTestId("arcade-pause").click();
  const pausedScore = await game
    .getByTestId("arcade-game")
    .getAttribute("data-score");
  await game.waitForTimeout(220);
  assert.equal(
    await game.getByTestId("arcade-game").getAttribute("data-score"),
    pausedScore,
  );
  await game.getByTestId("arcade-resume").click();
  await game.waitForFunction(
    () =>
      document.querySelector('[data-testid="arcade-game"]').dataset.status ===
      "over",
    {},
    { timeout: 8000 },
  );
  await game.getByTestId("hop-tab").click();
  assert.equal(
    Number(await game.getByTestId("arcade-game").getAttribute("data-score")),
    hopScore,
  );
  assert.equal(
    await game.getByTestId("arcade-game").getAttribute("data-paused"),
    "true",
  );
  await game.getByTestId("arcade-resume").click();
  // UI-only work/approval fixtures. No command or backend task is executed.
  await app.evaluate(({ BrowserWindow }) => {
    const main = BrowserWindow.getAllWindows().find(
        (w) => !w.webContents.getURL().includes("surface=play"),
      ),
      child = BrowserWindow.getAllWindows().find((w) =>
        w.webContents.getURL().includes("surface=play"),
      );
    main.webContents.send("codex:event", {
      method: "turn/started",
      params: { turn: { id: "arcade-ui-fixture" } },
    });
    child.webContents.send("companion:status", {
      working: true,
      approval: true,
      connected: true,
    });
  });
  await game.waitForFunction(
    () =>
      document.querySelector('[data-testid="arcade-game"]').dataset.paused ===
      "true",
  );
  assert.equal(await game.getByTestId("arcade-resume").isDisabled(), true);
  await game.getByTestId("arcade-restart").click();
  assert.equal(await game.getByTestId("arcade-action").isDisabled(), true);
  assert.equal(await page.locator(".working").isVisible(), true);
  assert.deepEqual(errors, []);
  await app.close();
  app = await electron.launch(options);
  page = await app.firstWindow();
  await page.getByTestId("character-images").waitFor();
  assert.equal(
    (await page.evaluate(() => window.animeCodex.bootstrap())).character.images
      .idle.src,
    original,
  );
  const opened = app.waitForEvent("window");
  await page.getByTestId("open-play").click();
  game = await opened;
  await game.getByTestId("hop-tab").click();
  assert.ok(
    Number(await game.getByTestId("arcade-game").getAttribute("data-best")) >=
      hopScore,
  );
  await fs.writeFile(
    "test-results/arcade-real-ui.json",
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        hopScored: true,
        runnerJumpAndCollision: true,
        pauseAndResume: true,
        modeSwitchPreserved: true,
        approvalFixtureBlocksResume: true,
        highScorePersists: true,
        originalRinRestored: true,
        customImagePreserved: true,
        programmingExecuted: false,
      },
      null,
      2,
    ),
  );
  console.log(
    "Arcade UI passed: charged landing, runner jump/collision, pause, mode resume, approval fixture, high score persistence and original Rin restoration.",
  );
} finally {
  await app.close();
}
