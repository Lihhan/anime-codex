import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { gazeAt } from "../shared/pet-gaze.mjs";
const require = createRequire(import.meta.url);
const { Preferences } = require("../electron/preferences.cjs");
const profile = require("../characters/rin.json");
const templates = [
  { profile, directory: path.resolve("public/characters/rin") },
];
test("gaze follows both axes in window-relative DIPs and bounds distant or invalid cursors", () => {
  const b = { x: 200, y: 150, width: 220, height: 205 };
  assert.deepEqual(gazeAt({ x: 310, y: 211.5 }, b), { x: 0, y: 0 });
  assert.deepEqual(gazeAt({ x: -10000, y: -10000 }, b), { x: -1, y: -1 });
  assert.deepEqual(gazeAt({ x: 10000, y: 10000 }, b), { x: 1, y: 1 });
  assert.deepEqual(gazeAt({ x: NaN, y: 0 }, b), { x: 0, y: 0 });
});
test("legacy Ke Jie retirement archives only exact names once and preserves assets and other roles", async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "anime-retirement-"),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const p = await new Preferences(directory, null, null, templates).load();
  const target = p.editable(p.find(profile.id));
  target.name = "柯洁";
  const id = target.id,
    asset = target.images.idle.file;
  const other = {
    ...structuredClone(target),
    id: "00000000-0000-4000-8000-000000000099",
    name: "柯洁的朋友",
  };
  p.data.characters.push(other);
  delete p.data.keJieRetirementV1;
  await p.save();
  const reload = await new Preferences(directory, null, null, templates).load();
  assert.equal(reload.find(id), undefined);
  assert.ok(reload.find(other.id));
  assert.equal(reload.data.activeCharacter, profile.id);
  assert.ok(await fs.stat(path.join(directory, "characters", asset)));
  const backups = await fs.readdir(path.join(directory, "removed-characters"));
  assert.equal(backups.length, 1);
  const backup = JSON.parse(
    await fs.readFile(
      path.join(directory, "removed-characters", backups[0]),
      "utf8",
    ),
  );
  assert.equal(backup.character.id, id);
  const created = reload.editable(reload.find(profile.id));
  created.name = "柯洁";
  await reload.save();
  const again = await new Preferences(directory, null, null, templates).load();
  assert.ok(
    again.find(created.id),
    "retirement must not become a permanent name blacklist",
  );
  await assert.rejects(again.removeCharacter({ id: profile.id }));
  await again.removeCharacter({ id: created.id });
  assert.equal(again.find(created.id), undefined);
});
