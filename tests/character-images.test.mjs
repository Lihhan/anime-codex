import test from "node:test";
import assert from "node:assert/strict";
import { actions, resolveAction } from "../shared/character-images.mjs";
test("one idle image is sufficient for every missing task action", () => {
  const images = { idle: { src: "idle.png" } };
  for (const action of [...actions, "unknown"])
    assert.equal(resolveAction(images, action), "idle");
  assert.equal(resolveAction({}, "thinking"), null);
  assert.equal(resolveAction(null, "failure"), null);
});
test("an uploaded action is selected only for that action and removal restores idle fallback", () => {
  const images = {
    idle: { src: "idle.png" },
    thinking: { src: "think.png" },
    coding: { src: "work.png" },
    failure: { src: "sorry.png" },
  };
  for (const action of ["thinking", "coding", "failure"])
    assert.equal(resolveAction(images, action), action);
  assert.equal(resolveAction(images, "listening"), "idle");
  delete images.thinking;
  assert.equal(resolveAction(images, "thinking"), "idle");
});
