import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { sheets, makePack } = require("../shared/pet-production.cjs");
const { validateSheet } = require("../electron/pet-artifacts.cjs");
const catalog = require("../characters/catalog.json");
const [slug, jobFile] = process.argv.slice(2);
if (!catalog.some((c) => c.slug === slug) || slug === "furina" || !jobFile)
  throw Error(
    "Usage: node scripts/import-builtin-pack.mjs <non-Furina builtin slug> <completed job.json>",
  );
const job = JSON.parse(await fs.readFile(jobFile, "utf8"));
if (job.status !== "ready" || !job.petPortrait || !job.candidates?.length)
  throw Error("Production job is incomplete");
const root = path.dirname(path.resolve(jobFile));
const target = path.resolve("public/characters", slug, "complete-v1");
await fs.mkdir(target, { recursive: true });
const source = async (name) => {
  if (
    typeof name !== "string" ||
    path.basename(name) !== name ||
    !name.endsWith(".png")
  )
    throw Error("Invalid production asset path");
  const file = path.join(root, name),
    stat = await fs.lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 24 * 1024 * 1024)
    throw Error("Invalid production asset");
  return file;
};
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function copy(file, name) {
  const bytes = await fs.readFile(file),
    destination = path.join(target, name);
  try {
    const existing = await fs.readFile(destination);
    if (digest(existing) !== digest(bytes))
      throw Error("Refusing to overwrite another generated pack: " + name);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
    await fs.writeFile(destination, bytes);
  }
  return digest(bytes);
}
const provenance = {
  pipeline: "CharacterStudio.produce",
  contract: "shared/pet-production.cjs",
  profileBasis:
    "Existing builtin persona and original portrait; no persona replacement",
  generatedAt: job.createdAt,
  frames: 112,
  structuralValidationOnly: true,
  sheets: {},
};
for (const sheet of sheets) {
  const entry = job.petFiles?.[sheet.id];
  if (!entry) throw Error("Missing " + sheet.id);
  if (
    !entry.evidence?.some(
      (e) => e.type === "imageGeneration" && e.status !== "failed",
    )
  )
    throw Error("Missing actual image-generation evidence for " + sheet.id);
  const file = await source(entry.file),
    qa = await validateSheet(file);
  provenance.sheets[sheet.id] = {
    sha256: await copy(file, sheet.id + ".png"),
    originalSha256: digest(await fs.readFile(await source(entry.originalFile))),
    qa,
    evidence: entry.evidence.map(({ type, status }) => ({ type, status })),
  };
}
provenance.referenceSha256 = await copy(
  await source(job.candidates[0].file),
  "reference.png",
);
await copy(await source(job.petPortrait), "preview.png");
await fs.writeFile(
  path.join(target, "provenance.json"),
  JSON.stringify(provenance, null, 2) + "\n",
);
const manifestFile = "shared/pet-appearances.json";
const appearances = JSON.parse(await fs.readFile(manifestFile, "utf8"));
const hues = { rin: 175, nahida: 110, kaguya: 335, iroha: 255, elysia: 320 };
appearances[slug] = {
  ...appearances[slug],
  themeHue: appearances[slug]?.themeHue ?? hues[slug],
  chibi: makePack(
    Object.fromEntries(
      sheets.map((s) => [s.id, `./characters/${slug}/complete-v1/${s.id}.png`]),
    ),
  ),
};
await fs.writeFile(manifestFile, JSON.stringify(appearances, null, 2) + "\n");
console.log(
  JSON.stringify({ slug, frames: 112, validatedSheets: 7, directory: target }),
);
