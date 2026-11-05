import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
const { resolveCodex } = createRequire(import.meta.url)(
  "../electron/codex-executable.cjs",
);
async function setup(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "anime-codex-path-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const executable = async (name) => {
    const file = path.join(root, name);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, "native executable fixture; never launched");
    return file;
  };
  return { root, executable };
}
test("explicit and remembered native executables take priority; invalid explicit paths never launch a shell", async (t) => {
  const { executable } = await setup(t);
  const saved = await executable("saved/codex.exe"),
    explicit = await executable("chosen/codex.exe");
  assert.equal(await resolveCodex({ explicit, saved, env: {} }), explicit);
  assert.equal(await resolveCodex({ saved, env: {} }), saved);
  assert.equal(
    await resolveCodex({ saved, env: { CODEX_PATH: explicit } }),
    explicit,
  );
  for (const invalid of [
    "codex",
    "codex.cmd",
    "..\\codex.exe",
    await executable("wrapper.cmd"),
  ])
    await assert.rejects(
      resolveCodex({ explicit: invalid, saved, env: {} }),
      /error.codexNotFound/,
    );
});
test("PATH lookup resolves only absolute native executables and skips npm wrappers", async (t) => {
  const { root, executable } = await setup(t);
  await executable("npm/codex.cmd");
  const expected = await executable("native/codex.exe");
  assert.equal(
    await resolveCodex({
      env: {
        Path: [".", path.join(root, "npm"), `"${path.dirname(expected)}"`].join(
          path.delimiter,
        ),
      },
    }),
    expected,
  );
});
test("desktop installation is discovered with an empty PATH and a stale saved selection", async (t) => {
  const { root, executable } = await setup(t);
  const old = await executable("OpenAI/Codex/bin/older/codex.exe");
  await fs.utimes(old, new Date(0), new Date(0));
  const latest = await executable("OpenAI/Codex/bin/newer/codex.exe");
  assert.equal(
    await resolveCodex({
      saved: path.join(root, "removed.exe"),
      env: { PATH: "", LOCALAPPDATA: root },
    }),
    latest,
  );
});
test("missing backend produces an actionable error instead of spawn ENOENT", async (t) => {
  const { root } = await setup(t);
  await assert.rejects(
    resolveCodex({ env: { PATH: "", LOCALAPPDATA: root } }),
    /error.codexNotFound/,
  );
});
