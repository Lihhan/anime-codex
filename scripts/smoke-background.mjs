import { _electron as electron } from "playwright";
import electronPath from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
const require = createRequire(import.meta.url),
  { PNG } = require("pngjs"),
  { BackgroundRemoval } = require("../electron/background.cjs");
if (process.env.RUN_REAL_BACKGROUND !== "1")
  throw new Error(
    "Set RUN_REAL_BACKGROUND=1. This test downloads a 176 MB model if needed and runs real local inference.",
  );
const input = process.argv[2];
if (!input)
  throw new Error("Pass a PNG containing a character and visible background.");
const inputFile = path.resolve(input),
  sourceBytes = await fs.readFile(inputFile),
  sourceHash = createHash("sha256").update(sourceBytes).digest("hex");
await fs.mkdir("test-results", { recursive: true });
const directory = await fs.mkdtemp(
    path.resolve("test-results/background-ui-profile-"),
  ),
  cache =
    process.env.ANIME_CODEX_MODEL_CACHE ||
    path.resolve("test-results/background-model-cache");
// A transparent source is composited onto a solid test background so the check
// proves actual alpha removal instead of crediting pre-existing transparency.
const fixture = PNG.sync.read(sourceBytes);
let pickedFile = inputFile,
  addedTestBackground = false;
for (let i = 3; i < fixture.data.length; i += 4)
  if (fixture.data[i] < 255) {
    addedTestBackground = true;
    break;
  }
if (addedTestBackground) {
  for (let i = 0; i < fixture.data.length; i += 4) {
    const a = fixture.data[i + 3] / 255;
    for (let c = 0; c < 3; c++)
      fixture.data[i + c] = Math.round(
        fixture.data[i + c] * a + [220, 225, 236][c] * (1 - a),
      );
    fixture.data[i + 3] = 255;
  }
  pickedFile = path.join(directory, "opaque-background-fixture.png");
  await fs.writeFile(pickedFile, PNG.sync.write(fixture));
}
const model = new BackgroundRemoval({ directory: cache });
await model.ensureModel();
const app = await electron.launch({
  executablePath: process.env.ANIME_CODEX_EXECUTABLE || electronPath,
  args: process.env.ANIME_CODEX_EXECUTABLE ? [] : ["."],
  env: {
    ...process.env,
    ANIME_CODEX_DEV: "0",
    ANIME_CODEX_DATA_DIR: directory,
    ANIME_CODEX_MODEL_CACHE: cache,
  },
});
const processDiagnostics = [];
app
  .process()
  .stderr?.on("data", (chunk) => processDiagnostics.push(chunk.toString()));
app
  .process()
  .on("exit", (code, signal) =>
    console.log(JSON.stringify({ backgroundAppExit: { code, signal } })),
  );
try {
  const page = await app.firstWindow();
  await page.getByTestId("character-images").waitFor();
  await page.getByTestId("language-select").selectOption("en");
  await page.getByTestId("settings-toggle").click();
  await page.getByTestId("auto-background").click();
  await page.waitForFunction(
    () => document.querySelector('[data-testid="auto-background"]').checked,
  );
  await app.evaluate(({ dialog }, file) => {
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [file],
    });
  }, pickedFile);
  await page.getByTestId("new-image-character").click();
  await page.locator(".background-progress").waitFor({ timeout: 30000 });
  await page.getByTestId("toggle-chat").click();
  assert.equal(await page.locator(".conversation").isVisible(), false);
  await page.getByTestId("toggle-chat").click();
  await page.getByTestId("restore-idle").waitFor({ timeout: 180000 });
  await page.locator(".background-progress").waitFor({ state: "hidden" });
  const processedModel = (
    await page.evaluate(() => window.animeCodex.bootstrap())
  ).background.model;
  const cutoutSrc = await page
      .locator('.state-image[data-action="idle"]')
      .getAttribute("src"),
    cutout = PNG.sync.read(Buffer.from(cutoutSrc.split(",")[1], "base64"));
  await page.getByTestId("restore-idle").click();
  await page.getByTestId("restore-idle").waitFor({ state: "hidden" });
  const originalSrc = await page
      .locator('.state-image[data-action="idle"]')
      .getAttribute("src"),
    original = PNG.sync.read(Buffer.from(originalSrc.split(",")[1], "base64"));
  assert.equal(cutout.width, original.width);
  assert.equal(cutout.height, original.height);
  let reduced = 0,
    opaque = 0,
    rgbUnchanged = true;
  for (let i = 0; i < original.data.length; i += 4) {
    if (cutout.data[i + 3] < original.data[i + 3] - 20) reduced++;
    if (cutout.data[i + 3] > 245) opaque++;
    for (let c = 0; c < 3; c++)
      if (cutout.data[i + c] !== original.data[i + c]) rgbUnchanged = false;
    assert.ok(cutout.data[i + 3] <= original.data[i + 3]);
  }
  assert.ok(
    reduced > original.width * original.height * 0.05,
    "No meaningful background alpha reduction",
  );
  assert.ok(opaque > 1000, "Character foreground disappeared");
  assert.equal(rgbUnchanged, true);
  // Trigger the actual cancel-button handler as soon as processing is shown.
  // Native inference can finish before a slow runner's pointer-stability wait.
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        const observer = new MutationObserver(() => {
          const button = document.querySelector(
            '[data-testid="cancel-background"]',
          );
          if (button) {
            observer.disconnect();
            button.click();
            resolve();
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        document.querySelector('[data-testid="background-idle"]').click();
      }),
  );
  await page.locator(".background-progress").waitFor({ state: "hidden" });
  await page.getByRole("alert").waitFor();
  assert.equal(
    await page.locator('.state-image[data-action="idle"]').getAttribute("src"),
    originalSrc,
  );
  assert.equal(
    createHash("sha256")
      .update(await fs.readFile(inputFile))
      .digest("hex"),
    sourceHash,
  );
  const report = {
    modelVariant: processedModel,
    addedTestBackground,
    testedAt: new Date().toISOString(),
    width: cutout.width,
    height: cutout.height,
    alphaReducedPixels: reduced,
    opaquePixels: opaque,
    rgbUnchanged,
    originalRestored: true,
    cancelPreservedImage: true,
    responsiveDuringInference: true,
    sourceFileUnchanged: true,
  };
  await fs.writeFile(
    "test-results/background-real.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error(processDiagnostics.join("").slice(-8000));
  throw error;
} finally {
  await app.close();
  model.dispose();
}
