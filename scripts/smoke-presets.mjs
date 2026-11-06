import { selectSettingsTab, toggleSettings } from "./settings-navigation.mjs";
import { _electron as electron } from "playwright";
import electronPath from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url),
  catalog = require("../characters/catalog.json");
await fs.mkdir("test-results", { recursive: true });
const dataDirectory = await fs.mkdtemp(path.resolve("test-results/presets-"));
const options = {
  executablePath: process.env.ANIME_CODEX_EXECUTABLE || electronPath,
  args: process.env.ANIME_CODEX_EXECUTABLE ? [] : ["."],
  env: {
    ...process.env,
    ANIME_CODEX_DEV: "0",
    ANIME_CODEX_SURFACE: "workbench",
    ANIME_CODEX_AUTOCONNECT: "0",
    ANIME_CODEX_DATA_DIR: dataDirectory,
  },
};
let app = await electron.launch(options);
try {
  let page = await app.firstWindow();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.getByTestId("character-images").waitFor();
  await page.getByTestId("language-select").selectOption("en");
  await page.waitForFunction(() => document.documentElement.lang === "en");
  const initial = await page.evaluate(() => window.animeCodex.bootstrap());
  assert.equal(initial.characters.length, catalog.length);
  assert.equal(initial.character.builtin, "rin");
  const rin = initial.character.images.idle.src;
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].webContents.send("codex:event", {
      method: "item/agentMessage/delta",
      params: {
        itemId: "previous-rin",
        delta: "Previous character fixture; no task ran.",
      },
    }),
  );
  await toggleSettings(page);
  await selectSettingsTab(page, "character");
  assert.equal(
    await page.locator(".preset-gallery button").count(),
    catalog.length,
  );
  for (const { id, slug } of catalog.slice(1)) {
    const profile = require("../characters/" + slug + ".json");
    await page.getByTestId("preset-" + slug).click();
    await page.waitForFunction(
      (id) =>
        document.querySelector('[data-testid="character-select"]').value === id,
      id,
    );
    await page.getByTestId("slot-thinking").locator(".action-preview").click();
    const state = await page.evaluate(() => window.animeCodex.bootstrap());
    const action = state.character.images.thinking ? "thinking" : "idle";
    const thinking = await page
      .locator('.state-image[data-action="' + action + '"]')
      .getAttribute("src");
    assert.ok(
      thinking ===
        (state.character.images.thinking?.src ||
          state.character.images.idle.src),
      "Selected preset thinking image must match its own assets",
    );
    await page.getByTestId("settings-close").click();
    assert.equal(
      await page.getByTestId("gal-dialogue").getAttribute("data-reply-id"),
      "local",
    );
    await page.getByTestId("gal-line").click();
    assert.equal(
      await page.getByTestId("gal-line").locator("span").first().textContent(),
      profile.greetings.en,
    );
    await toggleSettings(page);
    await selectSettingsTab(page, "character");
  }
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].webContents.send("codex:event", {
      method: "turn/started",
      params: { turn: { id: "preset-fixture" } },
    }),
  );
  await page.waitForFunction(
    () => document.querySelector('[data-testid="preset-rin"]').disabled,
  );
  for (const { slug } of catalog)
    assert.equal(await page.getByTestId("preset-" + slug).isDisabled(), true);
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].webContents.send("codex:event", {
      method: "turn/completed",
      params: { turn: { id: "preset-fixture", status: "completed" } },
    }),
  );
  await page.getByTestId("preset-furina").click();
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="character-name"]').value ===
        "Furina" &&
      !document.querySelector('[data-testid="character-name"]').disabled,
  );
  await page.getByTestId("character-name").fill("My Furina");
  await page.getByTestId("save-character").click();
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="character-name"]').value ===
        "My Furina" &&
      !document.querySelector('[data-testid="save-character"]').disabled,
  );
  let state = await page.evaluate(() => window.animeCodex.bootstrap());
  assert.equal(state.character.builtin, undefined);
  assert.equal(state.character.greetings, undefined);
  assert.equal(state.characters.length, catalog.length + 1);
  await page.getByTestId("original-rin").click();
  await page.waitForFunction(
    (id) =>
      document.querySelector('[data-testid="character-select"]').value === id &&
      !document.querySelector('[data-testid="original-rin"]').disabled,
    catalog[0].id,
  );
  state = await page.evaluate(() => window.animeCodex.bootstrap());
  assert.ok(
    state.character.images.idle.src === rin,
    "Original Rin must be restored exactly",
  );
  await page.getByTestId("preset-iroha").click();
  await page.waitForFunction(
    (id) =>
      document.querySelector('[data-testid="character-select"]').value === id &&
      !document.querySelector('[data-testid="preset-iroha"]').disabled,
    catalog.find((c) => c.slug === "iroha").id,
  );
  assert.deepEqual(errors, []);
  await app.close();
  app = await electron.launch(options);
  page = await app.firstWindow();
  await page.getByTestId("character-images").waitFor();
  state = await page.evaluate(() => window.animeCodex.bootstrap());
  assert.equal(state.character.builtin, "iroha");
  assert.equal(state.characters.length, catalog.length + 1);
  await fs.writeFile(
    "test-results/presets-ui.json",
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        presets: catalog.length,
        allFourSwitched: true,
        localGreetings: true,
        thinkingImages: true,
        noPreviousReply: true,
        busySelectionDisabled: true,
        immutableTemplates: true,
        rinRestored: true,
        selectionPersists: true,
        programmingExecuted: false,
      },
      null,
      2,
    ),
  );
  console.log(
    "Preset UI passed: four identities, real-world Kaguya/Iroha, independent poses/greetings, copy protection, busy gating, Rin and restart.",
  );
} finally {
  await app.close();
}
