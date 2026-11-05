// Extract the existing original sample; do not generate or download new artwork.
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { PNG } = require("pngjs");
const { BackgroundRemoval } = require("../electron/background.cjs");
if (process.env.RUN_REAL_BACKGROUND !== "1")
  throw new Error("Set RUN_REAL_BACKGROUND=1 to run local model inference.");
const root = path.resolve(import.meta.dirname, "..");
const config = JSON.parse(
  await fs.readFile(path.join(root, "characters/rin.json")),
);
const sheet = PNG.sync.read(
  await fs.readFile(path.join(root, "public/characters/rin/sheet.png")),
);
const width = sheet.width / 4,
  height = sheet.height / 2;
const remover = new BackgroundRemoval({
  directory:
    process.env.ANIME_CODEX_MODEL_CACHE ||
    path.join(root, "test-results/background-model-cache"),
  workerPath: path.join(root, "electron/background-worker.cjs"),
  mathPath: path.join(root, "shared/background-math.cjs"),
});
try {
  for (const [phase, index] of Object.entries(config.sourceCells)) {
    if (["speaking", "interrupted"].includes(phase)) continue;
    const cell = new PNG({ width, height });
    PNG.bitblt(
      sheet,
      cell,
      (index % 4) * width,
      Math.floor(index / 4) * height,
      width,
      height,
      0,
      0,
    );
    const cutout = await remover.remove(PNG.sync.write(cell));
    await fs.writeFile(
      path.join(root, `public/characters/rin/${phase}.png`),
      cutout,
    );
    console.log(`Prepared Rin: ${phase}`);
  }
} finally {
  remover.dispose();
}
