import { createRequire } from "node:module";
import { once } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url),
  { InputPulse } = require("../electron/input-pulse.cjs"),
  { checkCommand } = require("../electron/check-command.cjs");
const { execFile } = await import("node:child_process"),
  { promisify } = await import("node:util");
if (process.platform !== "win32")
  throw Error("Run the Windows native counter check on Windows.");
await fs.mkdir("test-results", { recursive: true });
let frames = 0,
  positive = 0,
  notifyError;
const counter = new InputPulse(
  path.resolve("test-results/helpers"),
  (value) => {
    if (value.error) {
      notifyError = value.error;
      return;
    }
    assert.deepEqual(Object.keys(value).sort(), ["clicks", "keys"]);
    assert.ok(
      Number.isInteger(value.keys) && value.keys >= 0 && value.keys <= 100,
    );
    assert.ok(
      Number.isInteger(value.clicks) && value.clicks >= 0 && value.clicks <= 20,
    );
    frames++;
    if (value.keys + value.clicks > 0) positive++;
  },
);
try {
  await counter.start();
  const child = counter.child;
  assert.ok(child?.pid);
  const deadline = Date.now() + 5000;
  while (frames < 4 && Date.now() < deadline)
    await new Promise((r) => setTimeout(r, 100));
  assert.ok(frames >= 4);
  assert.equal(notifyError, undefined);
  const exited = once(child, "exit");
  counter.stop();
  await exited;
  assert.equal(counter.child, null);
  const spec = checkCommand("echo ANIME_WINDOWS_CHECK", process.env);
  const result = await promisify(execFile)(spec.executable, spec.args, {
    windowsHide: true,
    env: process.env,
  });
  assert.match(result.stdout, /ANIME_WINDOWS_CHECK/);
  await fs.writeFile(
    "test-results/windows-input-pulse.json",
    JSON.stringify(
      {
        nativeHooksReady: true,
        aggregateFrames: frames,
        observedNonzeroFrames: positive,
        countOnly: true,
        helperStopped: true,
        nativeCheckCommand: true,
      },
      null,
      2,
    ),
  );
  console.log(
    "Windows native counter startup/count-only frames/shutdown and check command passed.",
  );
} finally {
  counter.stop();
}
