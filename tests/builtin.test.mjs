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
  const customized = await p.updateCharacter({
    id: profile.id,
    name: "My Rin",
    persona: "A custom personality.",
  });
  const customId = customized.character.id;
  assert.notEqual(customId, profile.id);
  await p.removeActionImage({ id: customId, phase: "thinking" });
  p = await new Preferences(directory, null, null, builtin).load();
  assert.equal(p.data.characters.length, 2);
  assert.equal(p.find(customId).name, "My Rin");
  assert.equal(p.find(customId).images.thinking, undefined);
  await p.selectCharacter(profile.id);
  assert.equal((await p.snapshot()).character.name, "Rin");
  assert.ok((await p.snapshot()).character.images.thinking);
});

test("modified legacy Rin is preserved as a custom copy, while selecting Rin restores all bundled images", async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "anime-legacy-rin-"),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  let p = await new Preferences(directory, null, null, builtin).load();
  const first = (await p.snapshot()).character.images.idle.src;
  const file = "3be475d7-0229-4d38-af6c-1913e5f0431b.png";
  const edited = new PNG({ width: 12, height: 20 });
  edited.data.fill(255);
  await fs.writeFile(
    path.join(directory, "characters", file),
    PNG.sync.write(edited),
  );
  p.find(profile.id).images.idle = { file, width: 12, height: 20 };
  p.find(profile.id).width = 12;
  p.find(profile.id).height = 20;
  await p.save();
  p = await new Preferences(directory, null, null, builtin).load();
  const custom = (await p.snapshot()).character;
  assert.notEqual(custom.id, profile.id);
  assert.equal(custom.images.idle.width, 12);
  assert.equal(p.data.characters.length, 2);
  await p.selectCharacter(profile.id);
  assert.equal((await p.snapshot()).character.images.idle.src, first);
  await p.selectCharacter(custom.id);
  assert.equal((await p.snapshot()).character.images.idle.width, 12);
  p = await new Preferences(directory, null, null, builtin).load();
  assert.equal(p.data.characters.length, 2);
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
