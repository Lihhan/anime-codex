import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { missingTransitions } from "../shared/pet-transitions.mjs";
const require = createRequire(import.meta.url);
const appearances = require("../shared/pet-appearances.json");
const { validateSheet } = require("../electron/pet-artifacts.cjs");
const { sheets } = require("../shared/pet-production.cjs");
test("every requested builtin except Furina has a complete pack", () => {
  for (const slug of ["rin", "nahida", "kaguya", "iroha", "elysia"])
    assert.ok(
      appearances[slug]?.chibi?.clips?.idle?.src?.includes("/complete-v1/"),
      slug,
    );
});
for (const [slug, appearance] of Object.entries(appearances)) {
  const pack = appearance.chibi;
  if (!pack?.clips?.idle?.src?.includes("/complete-v1/")) continue;
  test(
    slug +
      " complete pack has 112 real frames, evidence, valid alpha/margins and all 72 transition routes",
    async () => {
      const root = path.resolve("public/characters", slug, "complete-v1");
      const provenance = JSON.parse(
        await fs.readFile(path.join(root, "provenance.json"), "utf8"),
      );
      assert.equal(provenance.frames, 112);
      assert.equal(Object.keys(provenance.sheets).length, 7);
      assert.deepEqual(missingTransitions(pack.clips), []);
      for (const sheet of sheets) {
        const file = path.join(root, sheet.id + ".png");
        const qa = await validateSheet(file);
        assert.equal(qa.frames, 16);
        const sha = createHash("sha256")
          .update(await fs.readFile(file))
          .digest("hex");
        assert.equal(sha, provenance.sheets[sheet.id].sha256);
        assert.ok(
          provenance.sheets[sheet.id].evidence.some(
            (e) => e.type === "imageGeneration" && e.status !== "failed",
          ),
        );
        sheet.actions.forEach((action, row) => {
          assert.equal(pack.clips[action].row, row);
          assert.ok(pack.clips[action].src.endsWith("/" + sheet.id + ".png"));
        });
      }
    },
  );
}
