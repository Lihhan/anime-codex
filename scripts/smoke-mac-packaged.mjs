import { _electron as electron } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
if (process.platform !== "darwin" && !process.env.ANIME_CODEX_EXECUTABLE)
  throw new Error("Run this check on macOS or specify a packaged executable.");
const version = JSON.parse(
  await fs.readFile(new URL("../package.json", import.meta.url), "utf8"),
).version;
const root = path.resolve("release/v" + version);
const dirs = await fs.readdir(root);
let executable = process.env.ANIME_CODEX_EXECUTABLE;
for (const dir of dirs.filter((x) => x === "mac" || x === "mac-arm64")) {
  if (executable) break;
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
      require = process
        .getBuiltinModule("module")
        .createRequire(root + "/package.json"),
      path = process.getBuiltinModule("path");
    const { probe } = require(path.join(root, "scripts/native-probe.cjs"));
    return {
      version: app.getVersion(),
      ...(await probe(
        require(
          path.join(root, "electron/inference-runtime.cjs"),
        ).loadInferenceRuntime(),
      )),
    };
  });
  assert.equal(result.version, version);
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
// Reuse the cached, real model to verify the packaged worker path and cancellation.
if (process.env.RUN_PACKAGED_BACKGROUND === "1") {
  const { spawn } = await import("node:child_process");
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["scripts/smoke-background.mjs", "public/characters/rin/idle.png"],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          ANIME_CODEX_EXECUTABLE: executable,
          RUN_REAL_BACKGROUND: "1",
        },
      },
    );
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error("Packaged background check failed: " + code)),
    );
  });
}

const { spawn: spawnDock } = await import("node:child_process");
await new Promise((resolve, reject) => {
  const child = spawnDock(process.execPath, ["scripts/smoke-dock.mjs"], {
    stdio: "inherit",
    env: { ...process.env, ANIME_CODEX_EXECUTABLE: executable },
  });
  child.once("error", reject);
  child.once("exit", (code) =>
    code === 0
      ? resolve()
      : reject(new Error("Packaged dock recovery failed: " + code)),
  );
});
