import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url),
  { threadOptions } = require("../electron/policy.cjs"),
  {
    normalizeProfile,
    personaFor,
    CharacterStudio,
  } = require("../electron/character-studio.cjs");
test("native permission mode sends no sandbox or approval overrides", () => {
  const result = threadOptions(process.cwd(), "voice", "inherit");
  assert.deepEqual(Object.keys(result).sort(), [
    "cwd",
    "developerInstructions",
  ]);
});
test("character profiles keep generated lore, invented examples and user settings separate", () => {
  const p = normalizeProfile(
    {
      summary: "draft",
      voiceRules: ["short"],
      sampleLines: ["Hi"],
      unknowns: ["birthday"],
    },
    { name: "Mori", work: "fiction", customSetting: "user setting" },
  );
  assert.equal(p.evidenceStatus, "model-draft");
  const text = personaFor(p);
  assert.match(text, /NOT canonical quotes/);
  assert.match(text, /NOT canon/);
  assert.match(text, /Never fabricate tool results/);
  assert.throws(() => normalizeProfile({}, {}));
});
test("studio cannot escape the task directory using an untrusted id", () => {
  const studio = new CharacterStudio("/tmp/studio");
  for (const id of ["../test", "/tmp/elsewhere", "bad-id"])
    assert.throws(() => studio.file(id));
});

test("large character drafts remain usable within the session persona limit", () => {
  const raw = {
    summary: "s".repeat(4000),
    voiceRules: Array(12).fill("v".repeat(500)),
    avoid: Array(12).fill("a".repeat(500)),
    sampleLines: Array(12).fill("e".repeat(500)),
    unknowns: Array(12).fill("u".repeat(500)),
  };
  const p = normalizeProfile(raw, {
    name: "Mori",
    work: "fiction",
    customSetting: "c".repeat(2000),
  });
  const prompt = personaFor(p);
  assert.ok(prompt.length <= 12000);
  assert.match(prompt, /permission boundaries take priority\.$/);
});
