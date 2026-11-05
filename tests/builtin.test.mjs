import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { Preferences, PHASES } = require("../electron/preferences.cjs");
const profile = require("../characters/rin.json");
const builtin = { profile, directory: path.resolve("public/characters/rin") };
const { PNG } = require("pngjs");

test("Rin is installed once, selected on fresh installs, and has transparent aligned action images", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "anime-builtin-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  let p = await new Preferences(directory, null, null, builtin).load();
  const first = await p.snapshot();
  assert.equal(first.character.id, profile.id);
  assert.deepEqual(
    Object.keys(first.character.images).sort(),
    [...PHASES].sort(),
  );
  for (const image of Object.values(first.character.images)) {
    const png = PNG.sync.read(Buffer.from(image.src.split(",")[1], "base64"));
    assert.equal(png.width, 384);
    assert.equal(png.height, 512);
    assert.equal(png.data[3], 0);
    assert.ok(png.data.some((value, index) => index % 4 === 3 && value > 240));
  }
  await p.updateCharacter({
    id: profile.id,
    name: "My Rin",
    persona: "A custom personality.",
  });
  await p.removeActionImage({ id: profile.id, phase: "thinking" });
  p = await new Preferences(directory, null, null, builtin).load();
  assert.equal(p.data.characters.length, 1);
  assert.equal(p.find(profile.id).name, "My Rin");
  assert.equal(p.find(profile.id).images.thinking, undefined);
});

test("adding Rin on upgrade preserves an existing custom selection and image assignments", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "anime-upgrade-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const id = "8a4094f6-f11b-41ad-a96d-b27675ef155b";
  const original = { id, name: "My character", renderer: "images", images: {} };
  await fs.writeFile(
    path.join(directory, "preferences.json"),
    JSON.stringify({
      activeCharacter: id,
      characters: [original],
      language: "ja",
      desktop: { scale: 1.4 },
    }),
  );
  const p = await new Preferences(directory, null, null, builtin).load();
  assert.equal(p.data.activeCharacter, id);
  assert.deepEqual(p.find(id), original);
  assert.equal(p.data.language, "ja");
  assert.equal(p.data.desktop.scale, 1.4);
  assert.equal(p.data.characters.length, 2);
  assert.ok(p.find(profile.id));
});
