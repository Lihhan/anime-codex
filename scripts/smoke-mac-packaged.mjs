import { _electron as electron } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
if (process.platform !== "darwin") throw new Error("Run this check on macOS.");
const root = path.resolve("release/v0.6.0");
const dirs = await fs.readdir(root);
let executable;
for (const dir of dirs.filter((x) => x === "mac" || x === "mac-arm64")) {
  const candidate = path.join(
    root,
    dir,
    "Anime Codex.app/Contents/MacOS/Anime Codex",
  );
  try {
    await fs.access(candidate);
    executable = candidate;
    break;
  } catch {}
}
assert.ok(executable, "Packaged .app executable not found");
const app = await electron.launch({
  executablePath: executable,
  args: [],
  env: {
    ...process.env,
    ANIME_CODEX_DEV: "0",
    ANIME_CODEX_DATA_DIR: await fs.mkdtemp(
      path.resolve("test-results/mac-package-"),
    ),
  },
  timeout: 60000,
});
try {
  const page = await app.firstWindow();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.getByTestId("gal-dialogue").waitFor();
  await page.getByTestId("gal-input").fill("Packaged Mac UI check; not sent");
  assert.equal(await page.locator(".gal-choices").count(), 0);
  assert.equal(await page.getByTestId("gal-send").isDisabled(), true);
  const result = await app.evaluate(async ({ app }) => {
    const root = app.getAppPath(),
      path = require("node:path");
    const { probe } = require(path.join(root, "scripts/native-probe.cjs"));
    return {
      version: app.getVersion(),
      ...(await probe(
        require(path.join(root, "node_modules/onnxruntime-node")),
      )),
    };
  });
  assert.equal(result.version, "0.6.0");
  assert.equal(result.arch, process.arch);
  assert.deepEqual(errors, []);
  await fs.writeFile(
    "test-results/mac-packaged.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
} finally {
  await app.close();
}
