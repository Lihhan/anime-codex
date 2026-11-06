import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url),
  catalog = require("../characters/catalog.json"),
  { Preferences } = require("../electron/preferences.cjs"),
  { PNG } = require("pngjs");
const templates = catalog.map(({ slug }) => ({
  profile: require("../characters/" + slug + ".json"),
  directory: path.resolve("public/characters/" + slug),
}));
async function setup(t, bundled = templates) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "anime-presets-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  return {
    directory,
    p: await new Preferences(directory, null, null, bundled).load(),
  };
}
test("five independent presets install with Rin selected and aligned transparent task images", async (t) => {
  const { p } = await setup(t);
  assert.equal(p.data.characters.length, 5);
  assert.equal(p.data.activeCharacter, templates[0].profile.id);
  const idle = new Set();
  for (const { profile, directory } of templates) {
    const c = p.find(profile.id);
    assert.equal(c.name, profile.name);
    const bytes = await fs.readFile(path.join(directory, "idle.png"));
    idle.add(bytes.toString("base64"));
    for (const [phase, file] of Object.entries(profile.files)) {
      const image = PNG.sync.read(
        await fs.readFile(path.join(directory, file)),
      );
      assert.equal(image.width, profile.width);
      assert.equal(image.height, profile.height);
      let transparent = 0,
        visible = 0;
      for (let i = 3; i < image.data.length; i += 4) {
        if (image.data[i] === 0) transparent++;
        if (image.data[i] > 200) visible++;
      }
      assert.ok(transparent > image.width * image.height * 0.1, phase);
      assert.ok(visible > image.width * image.height * 0.15, phase);
    }
    if (profile.slug)
      for (const lang of ["zh", "en", "ja"]) {
        assert.ok(profile.greetings[lang]);
        assert.deepEqual(c.reactions[lang], profile.reactions[lang]);
        for (const region of ["hair", "shoulders", "hands"])
          assert.ok(c.reactions[lang][region].length >= 2);
      }
  }
  assert.equal(idle.size, 5);
});
test("editing each fan preset clones it, retains original images and does not duplicate templates on restart", async (t) => {
  let { p, directory } = await setup(t);
  for (const { profile } of templates.slice(1)) {
    await p.selectCharacter(profile.id);
    const original = (await p.character()).images.idle.src;
    const result = await p.updateCharacter({
      id: profile.id,
      name: profile.name,
      persona: profile.persona + " Custom preference.",
    });
    assert.notEqual(result.character.id, profile.id);
    assert.equal(result.character.templateSource, profile.slug);
    assert.equal(result.character.greetings, undefined);
    assert.equal(p.find(profile.id).persona, profile.persona);
    const customId = result.character.id;
    await p.selectCharacter(profile.id);
    assert.equal((await p.character()).images.idle.src, original);
    await p.selectCharacter(customId);
  }
  const selected = p.data.activeCharacter;
  p = await new Preferences(directory, null, null, templates).load();
  assert.equal(p.data.characters.length, 9);
  assert.equal(p.data.activeCharacter, selected);
});
test("upgrading a Rin-only library adds four presets without replacing a custom selection", async (t) => {
  let { p, directory } = await setup(t, [templates[0]]);
  await p.updateCharacter({
    id: templates[0].profile.id,
    name: "My companion",
    persona: "My custom personality",
  });
  const active = p.data.activeCharacter;
  const before = (await p.character()).images.idle.src;
  p = await new Preferences(directory, null, null, templates).load();
  assert.equal(p.data.characters.length, 6);
  assert.equal(p.data.activeCharacter, active);
  assert.equal((await p.character()).images.idle.src, before);
  assert.equal(p.find(active).persona, "My custom personality");
});
