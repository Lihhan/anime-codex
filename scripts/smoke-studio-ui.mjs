import { _electron as electron } from "playwright";
import electronPath from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const fixture = JSON.parse(
  await fs.readFile("test-results/studio-location.json"),
);
const directory = await fs.mkdtemp(path.resolve("test-results/studio-ui-"));
await fs.cp(fixture.directory, path.join(directory, "character-studio"), {
  recursive: true,
});
const env = {
  ...process.env,
  ANIME_CODEX_DEV: "0",
    ANIME_CODEX_SURFACE: "workbench",
    ANIME_CODEX_AUTOCONNECT: "0",
  ANIME_CODEX_DATA_DIR: directory,
};
delete env.CODEX_HOME;
const options = {
  executablePath: process.env.ANIME_CODEX_EXECUTABLE || electronPath,
  args: process.env.ANIME_CODEX_EXECUTABLE ? [] : ["."],
  env,
};
let app = await electron.launch(options);
let id;
try {
  let page = await app.firstWindow();
  await page.getByTestId("character-images").waitFor();
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].webContents.send("codex:event", {
      method: "client/inputRestored",
      params: {},
    }),
  );
  await page.getByTestId("settings-toggle").click();
  await page.getByTestId("settings-tab-character").click();
  await page.getByTestId("studio-jobs").selectOption(fixture.id);
  await page.getByTestId("studio-candidate").first().click();
  await page.getByTestId("studio-apply").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/studio-candidate-review.png" });
  await page.getByTestId("studio-apply").click();
  await page.waitForFunction(
    async () =>
      (await window.animeCodex.bootstrap()).character?.name === "小苔",
  );
  const prefs = await page.evaluate(() => window.animeCodex.bootstrap());
  id = prefs.character.id;
  assert.match(prefs.character.persona, /Speaking style/);
  assert.ok(
    prefs.character.images.idle.src.startsWith("data:image/png;base64,"),
  );
  assert.equal(prefs.character.profile.evidenceStatus, "model-draft");
  await page.getByTestId("settings-close").click();
  await page.screenshot({ path: "test-results/studio-active-character.png" });
  await app.close();
  app = await electron.launch(options);
  page = await app.firstWindow();
  await page.getByTestId("character-images").waitFor();
  const reloaded = await page.evaluate(() => window.animeCodex.bootstrap());
  assert.equal(reloaded.character.id, id);
  assert.equal(reloaded.character.name, "小苔");
  assert.ok(reloaded.character.images.idle);
  await fs.writeFile(
    "test-results/studio-ui.json",
    JSON.stringify(
      { directory, characterId: id, applied: true, restartPreserved: true },
      null,
      2,
    ),
  );
  console.log("Studio candidate applied and preserved on restart", id);
} finally {
  await app.close();
}
