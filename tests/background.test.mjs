import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url),
  {
    prepareInput,
    applyMask,
    assertForeground,
    prepareGeneralInput,
    normalizeGeneralMask,
  } = require("../shared/background-math.cjs"),
  { BackgroundRemoval } = require("../electron/background.cjs"),
  { Preferences } = require("../electron/preferences.cjs");
test("letterboxing preserves aspect ratio and mask changes only alpha, including existing transparency", () => {
  const image = {
      width: 2,
      height: 1,
      data: Buffer.from([200, 50, 20, 255, 10, 30, 40, 128]),
    },
    g = prepareInput(image, 4);
  assert.equal(g.scaledWidth, 4);
  assert.equal(g.scaledHeight, 2);
  assert.equal(g.padY, 1);
  assert.equal(g.tensor.length, 48);
  assert.equal(g.tensor[0], 0);
  const mask = new Float32Array(16).fill(1);
  const out = applyMask(image, mask, g);
  assert.deepEqual(out.data, image.data);
  mask.fill(0);
  const removed = applyMask(image, mask, g);
  assert.deepEqual([...removed.data], [200, 50, 20, 0, 10, 30, 40, 0]);
  mask.fill(0.5);
  const soft = applyMask(image, mask, g);
  assert.equal(soft.data[3], 128);
  assert.equal(soft.data[7], 64);
  assert.equal(soft.width, 2);
  assert.equal(soft.height, 1);
});
test("model download is pinned and verified, cached, and rejects corrupted data", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "anime-model-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const bytes = Buffer.from("test-only model bytes"),
    model = {
      filename: "fixture.onnx",
      url: "https://example.invalid/model",
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  let calls = 0;
  const r = new BackgroundRemoval({
    directory: root,
    model,
    fetchFn: async () => {
      calls++;
      return new Response(bytes);
    },
  });
  await r.ensureModel();
  await r.ensureModel();
  assert.equal(calls, 1);
  assert.deepEqual(await fs.readFile(path.join(root, "fixture.onnx")), bytes);
  const bad = new BackgroundRemoval({
    directory: path.join(root, "bad"),
    model,
    fetchFn: async () => new Response(Buffer.alloc(bytes.length)),
  });
  await assert.rejects(bad.ensureModel(), /error.bgChecksum/);
  await assert.rejects(fs.access(path.join(root, "bad", "fixture.onnx")));
  await assert.rejects(fs.access(path.join(root, "bad", "fixture.onnx.part")));
});
test("download cancellation does not install a partial model", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "anime-cancel-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let began;
  const ready = new Promise((r) => (began = r));
  const r = new BackgroundRemoval({
    directory: root,
    model: {
      filename: "cancel.onnx",
      url: "https://example.invalid",
      bytes: 100,
      sha256: "none",
    },
    fetchFn: async (_url, { signal }) => {
      began();
      return new Promise((_resolve, reject) =>
        signal.addEventListener("abort", () => reject(new Error("aborted")), {
          once: true,
        }),
      );
    },
  });
  const pending = r.ensureModel();
  await ready;
  r.cancel();
  await assert.rejects(pending, /error.bgCancelled/);
  await assert.rejects(fs.access(path.join(root, "cancel.onnx")));
});
const png = Buffer.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 2, 0,
  0, 0, 2, 1,
]);
test("empty or almost-erased cutouts are rejected while a substantial foreground is accepted", () => {
  const original = { width: 10, height: 10, data: Buffer.alloc(400, 255) };
  const output = { ...original, data: Buffer.from(original.data) };
  for (let i = 3; i < output.data.length; i += 4) output.data[i] = 0;
  assert.throws(
    () => assertForeground(original, output),
    /error.bgNoForeground/,
  );
  output.data[3] = 255;
  assert.throws(
    () => assertForeground(original, output),
    /error.bgNoForeground/,
  );
  for (let i = 3; i < 80; i += 4) output.data[i] = 255;
  assert.equal(assertForeground(original, output).retainedAlpha, 0.2);
  assert.throws(
    () => normalizeGeneralMask(new Float32Array(100).fill(0.004)),
    /error.bgNoForeground/,
  );
  assert.deepEqual(
    [...normalizeGeneralMask(new Float32Array([0.1, 0.9]))],
    [0, 1],
  );
});
test("general fallback uses finite normalized RGB and full-canvas geometry", () => {
  const g = prepareGeneralInput(
    { width: 2, height: 1, data: Buffer.from([255, 0, 0, 255, 0, 0, 0, 0]) },
    4,
  );
  assert.equal(g.scaledWidth, 4);
  assert.equal(g.scaledHeight, 4);
  assert.equal(g.padX, 0);
  assert.equal(g.padY, 0);
  assert.ok(g.tensor.every(Number.isFinite));
  assert.ok(Math.abs(g.tensor[0] - (1 - 0.485) / 0.229) < 0.0001);
});
const nativeImage = {
  createFromBuffer: () => ({
    isEmpty: () => false,
    getSize: () => ({ width: 2, height: 2 }),
    toPNG: () => png,
  }),
};
test("automatic/manual removal preserves originals, restores exactly, and persists the option", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "anime-cutout-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, "input.png");
  await fs.writeFile(file, png);
  const inputs = [],
    processed = Buffer.from(png);
  processed[24] = 2;
  const p = await new Preferences(
    path.join(root, "profile"),
    nativeImage,
    async (bytes) => {
      inputs.push(Buffer.from(bytes));
      return processed;
    },
  ).load();
  await p.setBackgroundOptions({ automatic: true });
  const imported = await p.importActionImage({}, file),
    id = imported.character.id;
  assert.equal(imported.character.images.idle.backgroundRemoved, true);
  assert.equal(imported.character.images.idle.canRestore, true);
  const cutout = imported.character.images.idle.src;
  const original = (await p.restoreOriginal({ id, phase: "idle" })).character
    .images.idle;
  assert.equal(original.backgroundRemoved, false);
  assert.notEqual(original.src, cutout);
  await p.removeBackground({ id, phase: "idle" });
  assert.deepEqual(inputs[0], inputs[1]);
  assert.deepEqual(await fs.readFile(file), png);
  assert.equal(
    (await new Preferences(path.join(root, "profile"), nativeImage).load()).data
      .backgroundRemoval.automatic,
    true,
  );
});
test("failed processing changes neither the selected image nor the character library", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "anime-bg-fail-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, "input.png");
  await fs.writeFile(file, png);
  const p = await new Preferences(
    path.join(root, "profile"),
    nativeImage,
    async () => {
      throw new Error("error.bgCancelled");
    },
  ).load();
  await p.setBackgroundOptions({ automatic: true });
  await assert.rejects(p.importActionImage({}, file), /error.bgCancelled/);
  assert.equal(p.data.characters.length, 0);
  await p.setBackgroundOptions({ automatic: false });
  const imported = await p.importActionImage({}, file),
    id = imported.character.id,
    before = imported.character.images.idle.src;
  await assert.rejects(
    p.removeBackground({ id, phase: "idle" }),
    /error.bgCancelled/,
  );
  assert.equal((await p.snapshot()).character.images.idle.src, before);
});
test("upgrading a blank legacy cutout restores its saved original without deleting either image", async (t) => {
  const { PNG } = require("pngjs");
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "anime-recover-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const id = "2e081935-202a-4abc-9995-452c2bca7707";
  const file = "5b081935-202a-4abc-9995-452c2bca7707.png";
  const originalFile = "6b081935-202a-4abc-9995-452c2bca7707.png";
  await fs.mkdir(path.join(root, "characters"));
  const original = new PNG({ width: 10, height: 10 });
  original.data.fill(255);
  const blank = new PNG({ width: 10, height: 10 });
  await fs.writeFile(
    path.join(root, "characters", originalFile),
    PNG.sync.write(original),
  );
  await fs.writeFile(
    path.join(root, "characters", file),
    PNG.sync.write(blank),
  );
  await fs.writeFile(
    path.join(root, "preferences.json"),
    JSON.stringify({
      activeCharacter: id,
      characters: [
        {
          id,
          name: "Existing character",
          renderer: "images",
          images: {
            idle: {
              file,
              originalFile,
              width: 10,
              height: 10,
              backgroundRemoved: true,
            },
          },
        },
      ],
    }),
  );
  const p = await new Preferences(root, null).load();
  assert.equal(p.data.activeCharacter, id);
  assert.equal(p.find(id).images.idle.file, originalFile);
  assert.equal(p.find(id).images.idle.backgroundRemoved, false);
  assert.equal(
    JSON.parse(await fs.readFile(path.join(root, "preferences.json")))
      .characters[0].images.idle.file,
    originalFile,
  );
  await fs.access(path.join(root, "characters", file));
  await fs.access(path.join(root, "characters", originalFile));
});
