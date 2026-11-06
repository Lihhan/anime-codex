// A real App Server handshake/account read; no model turn or simulated response.
import { _electron as electron } from "playwright";
import electronPath from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
await fs.mkdir("test-results", { recursive: true });
const directory = await fs.mkdtemp(
  path.resolve("test-results/connection-profile-"),
);
const env = {
  ...process.env,
  CODEX_PATH: "",
  ANIME_CODEX_DEV: "0",
  ANIME_CODEX_DATA_DIR: directory,
};
for (const key of Object.keys(env))
  if (key.toLowerCase() === "path") delete env[key];
env.PATH = "";
const options = {
  executablePath: process.env.ANIME_CODEX_EXECUTABLE || electronPath,
  args: process.env.ANIME_CODEX_EXECUTABLE ? [] : ["."],
  env,
};
let remembered;
const checks = [];
for (const stage of ["discovery", "restart"]) {
  const app = await electron.launch(options);
  try {
    const page = await app.firstWindow();
    await page.getByTestId("character-images").waitFor();
    const result = await page.evaluate(() => window.animeCodex.connect({}));
    assert.equal(typeof result.requiresOpenaiAuth, "boolean");
    const prefs = JSON.parse(
      await fs.readFile(path.join(directory, "preferences.json")),
    );
    assert.ok(path.isAbsolute(prefs.codexExecutable));
    assert.ok(
      prefs.codexExecutable
        .toLowerCase()
        .endsWith(process.platform === "darwin" ? "codex" : "codex.exe"),
    );
    if (remembered) assert.equal(prefs.codexExecutable, remembered);
    remembered = prefs.codexExecutable;
    checks.push({ stage, signedIn: !!result.account, emptyPath: true });
    console.log(
      `Real App Server ${stage}: connected with empty PATH; signed in=${!!result.account}.`,
    );
  } finally {
    await app.close();
  }
}
await fs.writeFile(
  "test-results/connection-real.json",
  JSON.stringify(
    {
      testedAt: new Date().toISOString(),
      packaged: !!process.env.ANIME_CODEX_EXECUTABLE,
      checks,
    },
    null,
    2,
  ),
);
