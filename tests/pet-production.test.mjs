import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { chooseLifeActivity, advanceTour } from "../shared/pet-life.mjs";
const require = createRequire(import.meta.url),
  { PNG } = require("pngjs"),
  { CharacterStudio } = require("../electron/character-studio.cjs"),
  { validateSheet } = require("../electron/pet-artifacts.cjs");
function fixture(opaque = false) {
  const png = new PNG({ width: 512, height: 512 });
  if (opaque) png.data.fill(255);
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      for (let y = 30; y < 108; y++)
        for (let x = 40 + c * 2; x < 85 + c * 2; x++) {
          const i = ((r * 128 + y) * 512 + c * 128 + x) * 4;
          png.data[i] = 100 + r * 20;
          png.data[i + 1] = 180;
          png.data[i + 2] = 80;
          png.data[i + 3] = 255;
        }
  return PNG.sync.write(png);
}
async function setup(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pet-production-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return dir;
}
test("production retains completed sheets, resumes failed sheet, and includes all transitions", async (t) => {
  const dir = await setup(t);
  const studio = new CharacterStudio(
    dir,
    () => {},
    () => ({ model: "test-model", effort: "medium" }),
  );
  let calls = 0,
    fail = true;
  studio.run = async (job, prompt) => {
    calls++;
    if (prompt.startsWith("Research the character")) return { output: JSON.stringify({unknowns:["Original character"]}), evidence: [] };
    if (prompt.startsWith("Create a character"))
      return {
        output: JSON.stringify({
          summary: "原创档案",
          voiceRules: ["简短"],
          dailyActivities: ["read", "gaming"],
          themeHue: 135,
        }),
        evidence: [],
      };
    if (fail && prompt.includes("walk_right")) throw Error("test failure");
    const quoted = prompt.match(/(?:Save it to |PNG to )(\"[^\"]+\")/);
    assert.ok(quoted);
    await fs.writeFile(JSON.parse(quoted[1]), fixture());
    return { imageGenerated: true, evidence: [{ type: "imageGeneration" }] };
  };
  await assert.rejects(studio.produce({ name: "test" }), /test failure/);
  let [job] = await studio.list();
  assert.equal(job.status, "failed");
  assert.equal(Object.keys(job.petFiles).length, 2);
  const old = job.petFiles.daily.file;
  fail = false;
  const before = calls;
  job = await studio.produce({ id: job.id });
  assert.equal(job.status, "ready");
  assert.equal(calls - before, 5);
  assert.equal(job.petFiles.daily.file, old);
  assert.equal(job.productionSelection.model, "test-model");
  for (const clip of [
    "enter_read",
    "exit_read",
    "enter_walk",
    "exit_walk",
    "walk_left",
    "sleep",
  ])
    assert.ok(job.petPack.clips[clip]);
  assert.equal((await validateSheet(path.join(dir, job.id, old))).frames, 16);
  const { Preferences } = require("../electron/preferences.cjs");
  const nativeImage = {
    createFromBuffer: (bytes) => ({
      isEmpty: () => false,
      getSize: () => {
        const p = PNG.sync.read(bytes);
        return { width: p.width, height: p.height };
      },
      toPNG: () => bytes,
    }),
  };
  const prefs = await new Preferences(
    path.join(dir, "installed"),
    nativeImage,
  ).load();
  const installed = await prefs.installPet(
    job,
    path.join(dir, job.id),
    "test persona",
  );
  assert.ok(
    installed.character.petAppearance.chibi.clips.exit_read.src.startsWith(
      "data:image/png",
    ),
  );
  const same = await prefs.installPet(
    job,
    path.join(dir, job.id),
    "test persona",
  );
  assert.equal(same.character.id, installed.character.id);
  assert.equal(same.characters.length, 1);
  await fs.rm(path.join(dir, job.id), { recursive: true });
  const restored = await new Preferences(
    path.join(dir, "installed"),
    nativeImage,
  ).load();
  assert.equal(
    (await restored.snapshot()).character.petAppearance.chibi.columns,
    4,
  );
});
test("art QA rejects opaque sheets and missing frames", async (t) => {
  const dir = await setup(t),
    file = path.join(dir, "sheet.png");
  await fs.writeFile(file, fixture(true));
  await assert.rejects(validateSheet(file), /不透明|贴边/);
  const png = new PNG({ width: 512, height: 512 });
  await fs.writeFile(file, PNG.sync.write(png));
  await assert.rejects(validateSheet(file), /为空/);
});
test("life routine avoids standing and consecutive repeats with bounded dwell", () => {
  let previous = "read";
  for (let n = 0; n < 100; n++) {
    const plan = chooseLifeActivity({
      previous,
      wander: false,
      activities: ["read", "read", "gaming"],
      random: () => 0.5,
    });
    assert.notEqual(plan.action, previous);
    assert.notEqual(plan.action, "idle");
    assert.ok(plan.duration >= 45000 && plan.duration <= 120000);
    previous = plan.action;
  }
});
test("tour advances only on matching completed interaction, never on unrelated clicks", () => {
  let step = 0;
  for (const event of ["activity", "preference", "tasks-understood"])
    assert.equal(advanceTour(step, event), 0);
  for (const event of ["message", "tasks-understood", "activity", "preference"])
    step = advanceTour(step, event);
  assert.equal(step, 4);
  assert.equal(advanceTour(step, "message"), 4);
});
test("cancelling between production stages prevents further model calls and permits resume", async (t) => {
  const dir = await setup(t);
  let studio,
    calls = 0;
  studio = new CharacterStudio(dir, (event) => {
    if (event.message.includes("2/9")) studio.cancel();
  });
  studio.run = async () => {
    calls++;
    return { output: JSON.stringify({ summary: "test" }), evidence: [] };
  };
  await assert.rejects(studio.produce({ name: "test" }));
  assert.equal(calls, 2);
});

test("atlas packing accepts non-divisible tool dimensions without clipping source pixels", async (t) => {
  const dir = await setup(t),
    source = path.join(dir, "odd.png"),
    target = path.join(dir, "packed.png");
  const png = new PNG({ width: 515, height: 519 });
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      for (let y = 25; y < 105; y++)
        for (let x = 35 + c * 3; x < 85 + c * 3; x++) {
          const i =
            ((Math.floor((r * 519) / 4) + y) * 515 +
              Math.floor((c * 515) / 4) +
              x) *
            4;
          png.data[i] = 120;
          png.data[i + 1] = 80;
          png.data[i + 2] = 140;
          png.data[i + 3] = 255;
        }
  await fs.writeFile(source, PNG.sync.write(png));
  const { packSheet } = require("../electron/pet-artifacts.cjs"),
    qa = await packSheet(source, target);
  assert.equal(qa.width, 520);
  assert.equal(qa.height, 520);
  const output = PNG.sync.read(await fs.readFile(target));
  const count = (p) => p.data.filter((v, i) => i % 4 === 3 && v === 255).length;
  assert.equal(count(output), count(png));
});
