import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { roster, questionIds } from "../shared/play-catalog.mjs";
import {
  newGuess,
  nextQuestion,
  answerGuess,
  newMemory,
  flipCard,
} from "../shared/play-engine.mjs";
import { touchPoint, isDrag } from "../shared/interactions.mjs";
import { createTranslator } from "../shared/i18n.mjs";
const { Preferences } = createRequire(import.meta.url)(
  "../electron/preferences.cjs",
);
test("every roster character is identified within ten consistent answers and unknown answers are bounded", () => {
  for (const character of roster) {
    let state = newGuess(),
      question;
    while ((question = nextQuestion(state)))
      state = answerGuess(
        state,
        question,
        character.traits.includes(question) ? "yes" : "no",
      );
    assert.deepEqual(state.candidates, [character.id]);
    assert.ok(state.asked.length <= 10);
  }
  let state = newGuess();
  for (let i = 0; i < 10; i++)
    state = answerGuess(state, nextQuestion(state), "unknown");
  assert.equal(state.asked.length, 10);
  assert.equal(nextQuestion(state), null);
  assert.equal(state.candidates.length, roster.length);
  assert.equal(answerGuess(state, "female", "yes"), state);
});
test("memory cards reject duplicate flips, lock mismatches and allow every pair to be completed", () => {
  let state = newMemory(() => 0.5);
  assert.equal(state.cards.length, 12);
  for (let id = 0; id < 6; id++) {
    state = flipCard(state, id);
    assert.equal(flipCard(state, id), state);
    state = flipCard(state, id + 6);
  }
  assert.equal(state.matched.length, 12);
  assert.equal(state.moves, 6);
  assert.equal(flipCard(state, 0), state);
  state = flipCard(flipCard(newMemory(), 0), 1);
  assert.equal(state.open.length, 2);
  assert.equal(flipCard(state, 2), state);
});
test("touch coordinates respect contain padding, image alignment, regions and drag threshold", () => {
  const r = { left: 10, top: 20, width: 200, height: 300 };
  assert.equal(touchPoint(r, 200, 200, 110, 30), null);
  assert.equal(touchPoint(r, 200, 200, 110, 140).region, "hair");
  assert.equal(touchPoint(r, 200, 200, 110, 230).region, "shoulders");
  assert.equal(touchPoint(r, 200, 200, 110, 300).region, "hands");
  assert.equal(isDrag({ x: 0, y: 0 }, { x: 3, y: 3 }), false);
  assert.equal(isDrag({ x: 0, y: 0 }, { x: 9, y: 0 }), true);
});
test("font size and interaction preference persist with bounded values", async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "anime-interface-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const p = await new Preferences(dir, null).load();
  assert.equal(p.data.interface.fontSize, 18);
  await p.setInterface({ fontSize: 22, interactions: false });
  const restored = await new Preferences(dir, null).load();
  assert.deepEqual(restored.data.interface, {
    fontSize: 22,
    interactions: false,
    dialogueStyle:"gal",
  });
  await assert.rejects(p.setInterface({ fontSize: 80 }), /error.interface/);
  await assert.rejects(
    p.setInterface({ interactions: "yes" }),
    /error.interface/,
  );
});
test("all quiz questions and playful reactions have three-language copy", () => {
  for (const language of ["zh", "en", "ja"]) {
    const t = createTranslator(language);
    for (const id of questionIds)
      assert.notEqual(t("play.q." + id), "play.q." + id);
    for (const region of ["hair", "shoulders", "hands"])
      for (let i = 0; i < 3; i++)
        assert.notEqual(t(`touch.${region}.${i}`), `touch.${region}.${i}`);
    for (const c of roster) assert.ok(c.names[language]);
  }
});
