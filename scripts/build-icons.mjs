// Package the approved artwork without altering its design or transparency.
// Requires macOS sips and iconutil; generated outputs are committed for other platforms.
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
const source = path.resolve("assets/branding/anime-codex-icon-source.png");
await fs.mkdir("build", { recursive: true });
await fs.mkdir("public", { recursive: true });
const set = await fs.mkdtemp(path.resolve("build/icon-work-"));
const iconset = path.join(set, "icon.iconset");
await fs.mkdir(iconset);
const resize = (size, target) =>
  execFileSync(
    "/usr/bin/sips",
    ["-z", String(size), String(size), source, "--out", target],
    { stdio: "ignore" },
  );
try {
  for (const size of [16, 32, 128, 256, 512])
    for (const scale of [1, 2])
      resize(
        size * scale,
        path.join(
          iconset,
          `icon_${size}x${size}${scale === 2 ? "@2x" : ""}.png`,
        ),
      );
  execFileSync("/usr/bin/iconutil", [
    "-c",
    "icns",
    iconset,
    "-o",
    "build/icon.icns",
  ]);
  resize(1024, "build/icon.png");
  await fs.copyFile("build/icon.png", "public/app-icon.png");
  resize(32, "public/favicon.png");
  const sizes = [16, 32, 48, 64, 128, 256],
    images = [];
  for (const size of sizes) {
    const target = path.join(set, `${size}.png`);
    resize(size, target);
    images.push(await fs.readFile(target));
  }
  const header = Buffer.alloc(6 + 16 * sizes.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  sizes.forEach((size, i) => {
    const at = 6 + 16 * i;
    header[at] = header[at + 1] = size === 256 ? 0 : size;
    header.writeUInt16LE(1, at + 4);
    header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(images[i].length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += images[i].length;
  });
  await fs.writeFile("build/icon.ico", Buffer.concat([header, ...images]));
  console.log("Created macOS ICNS, Windows ICO, PNG and favicon.");
} finally {
  await fs.rm(set, { recursive: true, force: true });
}
