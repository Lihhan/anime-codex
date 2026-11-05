import { _electron as electron } from "playwright";
import electronPath from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
await fs.mkdir("test-results", { recursive: true });
const dataDirectory = await fs.mkdtemp(
  path.resolve("test-results/action-profile-"),
);
const options = {
  executablePath: process.env.ANIME_CODEX_EXECUTABLE || electronPath,
  args: process.env.ANIME_CODEX_EXECUTABLE ? [] : ["."],
  env: {
    ...process.env,
    ANIME_CODEX_DEV: "0",
    ANIME_CODEX_DATA_DIR: dataDirectory,
  },
};
let app = await electron.launch(options);
let characterId;
try {
  const page = await app.firstWindow(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.getByTestId("character-images").waitFor();
  assert.equal(await page.locator(".state-image").count(), 10);
  await page.waitForFunction(() =>
    document.querySelector(".drag-handle").textContent.includes("凛"),
  );
  await page.getByTestId("language-select").selectOption("en");
  await page
    .getByRole("heading", { name: "What would you like to build?" })
    .waitFor();
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  await page.getByTestId("language-select").selectOption("ja");
  await page
    .getByRole("heading", { name: "今日は何をつくりますか？" })
    .waitFor();
  await page.getByTestId("settings-toggle").click();
  await page.getByRole("heading", { name: "キャラクターライブラリ" }).waitFor();
  await page.getByTestId("language-select").selectOption("en");
  await page
    .getByRole("heading", { name: "Character library", exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByTestId("character-select")
      .locator("option", { hasText: "Rin" })
      .count(),
    1,
  );
  const files = {
    idle: path.join(dataDirectory, "idle-fixture.png"),
    thinking: path.join(dataDirectory, "thinking-fixture.png"),
    coding: path.join(dataDirectory, "working-fixture.png"),
    failure: path.join(dataDirectory, "sorry-fixture.png"),
  };
  // Simple colored test images. These are not supplied as artwork or execution evidence.
  const fixtureImages = await app.evaluate(({ nativeImage }) => {
    const images = [];
    let i = 0;
    for (let index = 0; index < 4; index++) {
      const bytes = Buffer.alloc(48 * 64 * 4);
      for (let n = 0; n < bytes.length; n += 4) {
        bytes[n] = 50 + i * 35;
        bytes[n + 1] = 140 - i * 15;
        bytes[n + 2] = 170 - i * 25;
        bytes[n + 3] = 255;
      }
      images.push(
        nativeImage
          .createFromBitmap(bytes, { width: 48, height: 64 })
          .toPNG()
          .toString("base64"),
      );
      i++;
    }
    return images;
  });
  for (const [index, file] of Object.values(files).entries())
    await fs.writeFile(file, Buffer.from(fixtureImages[index], "base64"));
  const pick = async (file) =>
    app.evaluate(({ dialog }, file) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [file],
      });
    }, file);
  await pick(files.idle);
  await page.getByTestId("new-image-character").click();
  await page.waitForFunction(
    () => document.querySelectorAll(".state-image").length === 1,
  );
  characterId = await page.getByTestId("character-select").inputValue();
  assert.ok(characterId);
  await page.getByTestId("character-name").fill("Alice");
  await page.getByTestId("save-character").click();
  await page.waitForFunction(() =>
    document.querySelector(".drag-handle").textContent.includes("Alice"),
  );
  const active = () =>
    page.getByTestId("character-images").getAttribute("data-active-action");
  for (const action of [
    "thinking",
    "listening",
    "coding",
    "failure",
    "approval",
  ]) {
    await page
      .getByTestId("slot-" + action)
      .locator(".action-preview")
      .click();
    assert.equal(await active(), "idle");
    assert.equal(
      await page
        .getByTestId("character")
        .evaluate((el) => getComputedStyle(el).backgroundColor),
      "rgba(0, 0, 0, 0)",
    );
  }
  for (const action of ["thinking", "coding", "failure"]) {
    await pick(files[action]);
    await page.getByTestId("upload-" + action).click();
    await page.waitForFunction(
      (action) =>
        document.querySelector('[data-testid="character-images"]').dataset
          .activeAction === action,
      action,
    );
    assert.equal(await active(), action);
  }
  await page.getByTestId("remove-thinking").click();
  await page
    .locator('.state-image[data-action="thinking"]')
    .waitFor({ state: "detached" });
  await page.getByTestId("slot-thinking").locator(".action-preview").click();
  assert.equal(await active(), "idle");
  await page.getByTestId("stop-preview").click();
  await page.screenshot({
    path: "test-results/action-library.png",
    omitBackground: true,
  });
  await page.getByTestId("settings-toggle").click();
  await app.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows()[0];
    w.webContents.send("codex:event", {
      method: "turn/started",
      params: { turn: { id: "ui-fixture" } },
    });
    w.webContents.send("codex:event", {
      method: "item/started",
      params: {
        item: {
          id: "fixture-file",
          type: "fileChange",
          changes: [],
          status: "inProgress",
        },
      },
    });
  });
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="character-images"]').dataset
        .activeAction === "coding",
  );
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].webContents.send("codex:event", {
      method: "turn/completed",
      params: {
        turn: {
          id: "ui-fixture",
          status: "failed",
          error: { message: "UI fixture failure; no task was executed." },
        },
      },
    }),
  );
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="character-images"]').dataset
        .activeAction === "failure",
  );
  const before = await page.getByTestId("character").boundingBox();
  await page.getByRole("button", { name: "Larger", exact: true }).click();
  await page.waitForFunction(
    (w) =>
      document
        .querySelector('[data-testid="character"]')
        .getBoundingClientRect().width >
      w + 20,
    before.width,
  );
  const b = await page.getByTestId("character").boundingBox();
  await page.mouse.move(b.x + b.width * 0.5, b.y + b.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width * 0.5 - 90, b.y + b.height * 0.4 - 45, {
    steps: 8,
  });
  await page.mouse.up();
  const moved = await page.getByTestId("character").boundingBox();
  assert.ok(moved.x < b.x - 65, "Character did not move with the pointer");
  const area = await app.evaluate(
    ({ screen }) => screen.getPrimaryDisplay().workArea,
  );
  const places = {
    left: { x: area.x, y: area.y + 100 },
    right: { x: area.x + area.width - 352, y: area.y + 100 },
    top: { x: area.x + area.width / 2 - 176, y: area.y },
    bottom: { x: area.x + area.width / 2 - 176, y: area.y + area.height - 470 },
  };
  for (const [edge, point] of Object.entries(places)) {
    const state = await page.evaluate(
      (p) => window.animeCodex.desktopControl({ action: "move", ...p }),
      point,
    );
    assert.equal(state.edge, edge);
    await page.getByTestId("dock-tab").waitFor();
    assert.equal(await page.locator(".conversation").isVisible(), false);
    await page.getByTestId("dock-tab").click();
    await page.getByTestId("character").waitFor();
  }
  await page.evaluate(() =>
    window.animeCodex.desktopControl({ action: "reset" }),
  );
  await page.getByTestId("language-select").selectOption("ja");
  await page.waitForFunction(() => document.documentElement.lang === "ja");
  if (!(await page.getByTestId("character-select").isVisible()))
    await page.getByTestId("settings-toggle").click();
  await page
    .getByTestId("character-select")
    .selectOption("ef1143cb-cddb-4d71-8f82-9bf4b8cfd7d2");
  await page.waitForFunction(() =>
    document.querySelector(".drag-handle").textContent.includes("凛"),
  );
  assert.equal(await page.locator(".state-image").count(), 10);
  await page.getByTestId("character-select").selectOption(characterId);
  await page.waitForFunction(() =>
    document.querySelector(".drag-handle").textContent.includes("Alice"),
  );
  assert.deepEqual(errors, []);
  await app.close();
  app = await electron.launch(options);
  const restored = await app.firstWindow();
  await restored.getByTestId("character-images").waitFor();
  assert.equal(
    await restored.getByTestId("language-select").inputValue(),
    "ja",
  );
  await restored.getByTestId("settings-toggle").click();
  assert.equal(
    await restored.getByTestId("character-select").inputValue(),
    characterId,
  );
  assert.equal(
    await restored.getByTestId("character-name").inputValue(),
    "Alice",
  );
  assert.equal(await restored.locator(".state-image").count(), 3);
  assert.equal(
    await restored
      .getByTestId("character-images")
      .getAttribute("data-active-action"),
    "idle",
  );
  assert.ok(
    (
      await restored.locator(".state-image").first().getAttribute("src")
    ).startsWith("data:image/png;base64,"),
  );
  console.log(
    "Customization passed: three languages, idle-only fallback, per-action upload/replacement/removal, event-driven working and sorry images, drag, resize, four-edge docking and restart persistence.",
  );
} finally {
  await app.close();
}
