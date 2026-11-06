import { _electron as electron } from "playwright";
import electronPath from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url),
  { Preferences } = require("../electron/preferences.cjs");
const catalog = require("../characters/catalog.json");
await fs.mkdir("test-results", { recursive: true });
const directory = await fs.mkdtemp(path.resolve("test-results/settings-"));
const templates = catalog.map(({ slug }) => ({
  profile: require("../characters/" + slug + ".json"),
  directory: path.resolve("public/characters", slug),
}));
const prefs = await new Preferences(directory, null, null, templates).load();
const legacy = prefs.editable(prefs.find(catalog[0].id));
legacy.name = "柯洁";
const removedId = legacy.id;
delete prefs.data.keJieRetirementV1;
await prefs.save();
const options = {
  executablePath: process.env.ANIME_CODEX_EXECUTABLE || electronPath,
  args: process.env.ANIME_CODEX_EXECUTABLE ? [] : ["."],
  env: {
    ...process.env,
    ANIME_CODEX_DEV: "0",
    ANIME_CODEX_SURFACE: "",
    ANIME_CODEX_DATA_DIR: directory,
  },
};
let app = await electron.launch(options);
const errors = [];
const open = async (page) => {
  await page.getByTestId("pet-body").waitFor();
  if (await page.getByRole("button", { name: "稍后再认识" }).count())
    await page.getByRole("button", { name: "稍后再认识" }).click();
  await page.getByTestId("pet-body").hover();
  await page.getByTitle("设置", { exact: true }).click();
  await page.getByRole("button", { name: "角色、模型与更多设置 ↗" }).click();
};
try {
  let page = await app.firstWindow();
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  let boot = await page.evaluate(() => window.animeCodex.bootstrap());
  assert.ok(!boot.characters.some((c) => c.id === removedId));
  assert.equal(
    (await fs.readdir(path.join(directory, "removed-characters"))).length,
    1,
  );
  assert.equal(boot.character.builtin, "rin");
  const cursor = async (x, y) =>
    app.evaluate(
      ({ screen, BrowserWindow }, { x, y }) => {
        const b = BrowserWindow.getAllWindows()[0].getBounds();
        screen.getCursorScreenPoint = () => ({ x: b.x + x, y: b.y + y });
      },
      { x, y },
    );
  const gaze = async (sign) =>
    page.waitForFunction((sign) => {
      const n = document.querySelector('[data-testid="pet-gaze"]');
      return (
        Math.sign(Number(n.dataset.gazeX)) === sign &&
        Math.sign(Number(n.dataset.gazeY)) === sign
      );
    }, sign);
  // Both portrait and sprite paths must respond to the actual shared native cursor API.
  await page
    .getByLabel("切换角色")
    .selectOption(catalog.find((c) => c.slug === "furina").id);
  for (const style of ["portrait", "chibi", "sticker"]) {
    await page.getByLabel("外观画风").selectOption(style);
    await cursor(-2000, -2000);
    await gaze(-1);
    await cursor(10000, 10000);
    await gaze(1);
    assert.notEqual(
      await page
        .getByTestId("pet-gaze")
        .evaluate((n) => getComputedStyle(n).transform),
      "none",
    );
  }
  await page.getByLabel("视线跟随鼠标", { exact: true }).uncheck();
  await gaze(0);
  await page.getByLabel("视线跟随鼠标", { exact: true }).check();
  await gaze(1);
  await page.evaluate(() => {
    window.pulseFrames = [];
    window.animeCodex.onEvent((e) => {
      if (e.method === "client/inputPulse") window.pulseFrames.push(e.params);
    });
  });
  await page
    .getByLabel("跟随全局键鼠节奏（只读取计数）")
    .check({ timeout: 90000 });
  if (process.platform === "win32")
    await page.waitForFunction(() => window.pulseFrames.length >= 3);
  await page.getByLabel("安静休息，不显示日常气泡").check();
  await gaze(0);
  await page.locator(".pet-keyboard").waitFor({ state: "hidden" });
  await page.waitForTimeout(500);
  const pausedFrames = await page.evaluate(() => window.pulseFrames.length);
  await page.waitForTimeout(700);
  assert.equal(
    await page.evaluate(() => window.pulseFrames.length),
    pausedFrames,
  );
  await page.getByLabel("安静休息，不显示日常气泡").uncheck();
  await gaze(1);
  if (process.platform === "win32")
    await page.waitForFunction(
      (n) => window.pulseFrames.length > n,
      pausedFrames,
    );
  await page.getByLabel("跟随全局键鼠节奏（只读取计数）").uncheck();
  await page.getByLabel("在桌面散步", { exact: true }).uncheck();
  await page.getByLabel("偶尔邀请互动（至少间隔 35 分钟）").uncheck();
  await page.getByLabel("明确任务自动分发（需先选择项目）").uncheck();
  await page.getByLabel("动作语音音量", { exact: true }).fill("0.5");
  // A newly uploaded picture must replace the builtin sprite presentation.
  await page
    .getByLabel("切换角色")
    .selectOption(catalog.find((c) => c.slug === "rin").id);
  await page.waitForFunction(
    () =>
      document.querySelector('[aria-label="切换角色"]')?.value ===
      "ef1143cb-cddb-4d71-8f82-9bf4b8cfd7d2",
  );
  await page.getByLabel("外观画风").selectOption("chibi");
  await app.evaluate(({ dialog }, file) => {
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [file],
    });
  }, path.resolve("public/characters/rin/idle.png"));
  await page.getByText("编辑人设 / 导入形象", { exact: true }).click();
  await page.getByRole("button", { name: "导入角色图片", exact: true }).click();
  await page.getByTestId("character-images").waitFor();
  assert.equal(await page.getByLabel("外观画风").inputValue(), "portrait");
  const custom = await page.evaluate(() => window.animeCodex.bootstrap());
  assert.ok(!custom.character.builtin);
  assert.ok(custom.character.artworkRevision);
  await page
    .getByLabel("切换角色")
    .selectOption(catalog.find((c) => c.slug === "rin").id);
  await page.waitForFunction(
    () =>
      document.querySelector('[aria-label="切换角色"]')?.value ===
      "ef1143cb-cddb-4d71-8f82-9bf4b8cfd7d2",
  );
  await page.getByLabel("外观画风").selectOption("chibi");
  await page.locator(".pet-sprite").waitFor();
  await page.getByLabel("切换角色").selectOption(custom.character.id);
  await page.getByTestId("character-images").waitFor();
  // Delete a custom library entry through the real restricted bridge/UI.
  await page.evaluate(async () => {
    const b = await window.animeCodex.bootstrap();
    return window.animeCodex.updateCharacter({
      id: b.character.id,
      name: "Removal fixture",
      persona: "Local fixture. No model request.",
    });
  });
  await page.reload();
  await open(page);
  await page.getByTestId("remove-character").click();
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="remove-character"]'),
  );
  const before = (await page.evaluate(() => window.animeCodex.companionState()))
    .settings;
  await app.close();
  app = await electron.launch(options);
  page = await app.firstWindow();
  await page.getByTestId("pet-body").waitFor();
  const after = (await page.evaluate(() => window.animeCodex.companionState()))
    .settings;
  for (const key of [
    "cursor",
    "keyboard",
    "quiet",
    "wander",
    "proactive",
    "voice",
    "autoDispatch",
    "voiceVolume",
  ])
    assert.equal(after[key], before[key]);
  boot = await page.evaluate(() => window.animeCodex.bootstrap());
  assert.ok(
    !boot.characters.some(
      (c) => c.name === "Removal fixture" || c.name === "柯洁",
    ),
  );
  assert.deepEqual(errors, []);
  const report = {
    platform: process.platform,
    portraitAndSpriteGaze: true,
    disableResetsGaze: true,
    quietStopsCounters: true,
    settingsPersist: true,
    keJieRetirement: true,
    customRemoval: true,
    uploadedClipsOnly: true,
    uploadedPictureOverridesSprite: true,
    physicalPointerMovement: false,
    modelCalls: false,
  };
  await fs.writeFile(
    "test-results/settings-platform.json",
    JSON.stringify(report, null, 2),
  );
  console.log(report);
} finally {
  await app.close();
}
