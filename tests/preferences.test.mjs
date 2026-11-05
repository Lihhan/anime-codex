import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
const { Preferences } = createRequire(import.meta.url)(
  "../electron/preferences.cjs",
);
const png = Buffer.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 120, 0,
  0, 0, 160,
]);
const nativeImage = {
  createFromBuffer: () => ({
    isEmpty: () => false,
    getSize: () => ({ width: 120, height: 160 }),
    toPNG: () => png,
  }),
};

test("idle-only characters, optional actions, profiles and language survive restart without the original files", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "anime-preferences-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, "My Character.png");
  await fs.writeFile(file, png);
  const p = await new Preferences(
    path.join(root, "profile"),
    nativeImage,
  ).load();
  assert.equal((await p.snapshot()).character, null);
  const imported = await p.importActionImage({}, file);
  const id = imported.character.id;
  assert.equal(imported.character.name, "My Character");
  assert.deepEqual(Object.keys(imported.character.images), ["idle"]);
  assert.ok(
    imported.character.images.idle.src.startsWith("data:image/png;base64,"),
  );
  await p.importActionImage({ id, phase: "failure" }, file);
  await p.updateCharacter({ id, name: "Alice", persona: "A calm engineer." });
  await p.setLanguage("ja");
  await fs.unlink(file);
  const restored = await new Preferences(
    path.join(root, "profile"),
    nativeImage,
  ).load();
  const s = await restored.snapshot();
  assert.equal(s.language, "ja");
  assert.equal(s.character.name, "Alice");
  assert.ok(s.character.images.failure.src);
  await restored.removeActionImage({ id, phase: "failure" });
  assert.equal((await restored.snapshot()).character.images.failure, undefined);
  await assert.rejects(
    restored.removeActionImage({ id, phase: "idle" }),
    /error.action/,
  );
  await assert.rejects(
    restored.selectCharacter("../../secret"),
    /error.characterMissing/,
  );
  await assert.rejects(restored.setLanguage("unknown"), /error.language/);
  assert.equal(
    (
      await fs.readFile(path.join(root, "profile", "preferences.json"), "utf8")
    ).includes("data:image"),
    false,
  );
});

test("invalid, oversized, truncated and unsupported image imports are rejected", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "anime-invalid-image-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, "bad.png");
  const p = await new Preferences(root, nativeImage).load();
  await fs.writeFile(file, '<svg onload="alert(1)"></svg>');
  await assert.rejects(p.importActionImage({}, file), /error.imageType/);
  await fs.writeFile(file, png.subarray(0, 8));
  await assert.rejects(p.importActionImage({}, file), /error.imageType/);
  const huge = Buffer.from(png);
  huge.writeUInt32BE(9000, 16);
  await fs.writeFile(file, huge);
  await assert.rejects(p.importActionImage({}, file), /error.imageDimensions/);
  await assert.rejects(
    p.importActionImage({ phase: "run-script" }, file),
    /error.action/,
  );
  await assert.rejects(
    p.importActionImage({ phase: "thinking" }, file),
    /error.characterMissing/,
  );
});
