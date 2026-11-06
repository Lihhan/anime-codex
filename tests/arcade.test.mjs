import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import {
  WORLD,
  beagleFrame,
  chargeDistance,
  newHop,
  beginHop,
  releaseHop,
  stepHop,
  newRunner,
  runnerJump,
  runnerDuck,
  stepRunner,
  pauseArcade,
  advanceArcade,
} from "../shared/arcade-engine.mjs";
const require = createRequire(import.meta.url),
  sprite = require("../shared/arcade-sprite.json"),
  { PNG } = require("pngjs");
test("beagle atlas has eight bounded transparent frames with visible artwork", () => {
  const png = PNG.sync.read(
    fs.readFileSync("public/" + sprite.sheet.replace(/^\.\//, "")),
  );
  assert.equal(sprite.style, "pixel");
  assert.equal(sprite.id, "beagle");
  assert.equal(sprite.width, png.width);
  assert.equal(sprite.height, png.height);
  assert.equal(Object.keys(sprite.frames).length, 8);
  assert.equal(png.data[3], 0);
  for (const r of Object.values(sprite.frames)) {
    assert.ok(Object.values(r).every(Number.isInteger));
    assert.ok(
      r.x >= 0 &&
        r.y >= 0 &&
        r.width > 0 &&
        r.height > 0 &&
        r.x + r.width <= png.width &&
        r.y + r.height <= png.height,
    );
    let visible = 0,
      transparent = 0;
    for (let y = r.y; y < r.y + r.height; y++)
      for (let x = r.x; x < r.x + r.width; x++) {
        const a = png.data[(y * png.width + x) * 4 + 3];
        if (a > 32) visible++;
        if (a === 0) transparent++;
      }
    assert.ok(visible > r.width * r.height * 0.1);
    assert.ok(transparent > 0);
  }
});
test("beagle poses follow jumping, running, crouching, landing and failure", () => {
  assert.equal(beagleFrame(newHop()), "idle");
  assert.equal(beagleFrame(beginHop(newHop())), "duck");
  assert.equal(beagleFrame(releaseHop(beginHop(newHop()))), "jump");
  const running = { ...newRunner(), status: "running", elapsed: 0.14 };
  assert.equal(beagleFrame(running), "runB");
  assert.equal(beagleFrame(running, true), "runA");
  assert.equal(beagleFrame({ ...running, duck: true }), "duck");
  assert.equal(beagleFrame({ ...running, status: "over" }), "hurt");
  assert.equal(beagleFrame({ ...newHop(), landTime: 0.6 }), "land");
  assert.equal(
    beagleFrame({ ...newHop(), landTime: 0.2, flash: "perfect" }),
    "cheer",
  );
});
const stepFor = (s, seconds) => {
  for (let left = seconds; left > 1e-7; left -= 1 / 120)
    s = advanceArcade(s, Math.min(left, 1 / 120));
  return s;
};
test("charge distance is bounded and longer holds jump farther", () => {
  assert.equal(chargeDistance(-2), 70);
  assert.equal(chargeDistance(20), 330);
  assert.ok(chargeDistance(0.8) > chargeDistance(0.3));
  assert.equal(releaseHop(newHop()).status, "ready");
});
test("precise hops score, chain, generate reachable platforms and keep bounded history", () => {
  let s = newHop(42);
  for (let i = 0; i < 25; i++) {
    const distance = s.target.x - s.x,
      seconds = 1.2 * Math.pow((distance - 70) / 260, 1 / 0.95);
    s = beginHop(s);
    s = stepFor(s, seconds);
    s = releaseHop(s);
    s = stepFor(s, 1);
    assert.equal(s.status, "ready");
    assert.equal(s.flash, "perfect");
    assert.ok(s.target.x - s.x >= 155 && s.target.x - s.x <= 285);
    assert.ok(s.target.width >= 72);
    assert.ok(s.platforms.length <= 7);
  }
  assert.equal(s.score, 50);
  assert.equal(s.streak, 25);
});
test("overshooting misses the platform, while pausing cancels a hold and freezes motion", () => {
  let s = beginHop(newHop());
  s = stepFor(s, 0.6);
  s = pauseArcade(s);
  assert.equal(s.status, "ready");
  assert.equal(s.charge, 0);
  assert.deepEqual(stepFor(s, 3), s);
  s = beginHop(pauseArcade(s, false));
  s = stepFor(s, 1.3);
  s = releaseHop(s);
  s = stepFor(s, 2);
  assert.equal(s.status, "over");
  assert.equal(s.score, 0);
});
test("runner hits an obstacle without a jump, but a well-timed jump clears it", () => {
  let missed = { ...newRunner(), status: "running" };
  missed = stepFor(missed, 3.5);
  assert.equal(missed.status, "over");
  let s = { ...newRunner(), status: "running" },
    jumped = false;
  for (let i = 0; i < 400; i++) {
    if (!jumped && s.obstacles[0]?.x - s.x < 125) {
      s = runnerJump(s);
      jumped = true;
    }
    s = stepRunner(s, 1 / 120);
  }
  assert.equal(jumped, true);
  assert.equal(s.status, "running");
  assert.ok(s.score > 30);
});
test("ducking avoids a low airborne obstacle and cannot shrink an airborne hitbox", () => {
  const s = {
    ...newRunner(),
    status: "running",
    obstacles: [
      { x: 120, y: WORLD.ground - 67, width: 42, height: 19, type: "kite" },
    ],
  };
  assert.equal(stepRunner(s, 1 / 120).status, "over");
  assert.equal(stepRunner(runnerDuck(s, true), 1 / 120).status, "running");
  const a = runnerJump(newRunner()),
    airborne = { ...a, y: WORLD.ground - 20 };
  assert.equal(runnerJump(airborne), airborne);
});
test("physics is deterministic across display frame sizes and pause never advances a runner", () => {
  let a = runnerJump(newRunner(2)),
    b = runnerJump(newRunner(2));
  for (let i = 0; i < 120; i++) a = advanceArcade(a, 1 / 120);
  for (let i = 0; i < 60; i++) b = advanceArcade(b, 1 / 60);
  assert.ok(Math.abs(a.distance - b.distance) < 1e-7);
  assert.ok(Math.abs(a.y - b.y) < 1e-7);
  assert.deepEqual(advanceArcade(pauseArcade(a), 0.25), pauseArcade(a));
});
