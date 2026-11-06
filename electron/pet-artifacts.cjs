const fs = require("node:fs/promises");
const { PNG } = require("pngjs");
// Structural QA only: semantic identity and continuity still require a real preview.
async function validateSheet(file) {
  const stat = await fs.lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 24 * 1024 * 1024)
    throw Error("动作图文件无效或过大");
  const bytes = await fs.readFile(file);
  if (
    bytes.length < 24 ||
    !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    throw Error("动作图不是 PNG");
  if (bytes.readUInt32BE(16) > 4096 || bytes.readUInt32BE(20) > 4096)
    throw Error("动作图尺寸过大");
  const png = PNG.sync.read(bytes);
  if (
    png.width % 4 ||
    png.height % 4 ||
    png.width < 512 ||
    png.height < 512 ||
    png.width !== png.height
  )
    throw Error("需要正方形、严格 4×4 的动作图集，尺寸为 4 的倍数");
  const cw = png.width / 4,
    ch = png.height / 4,
    boxes = [];
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 4; col++) {
      let count = 0,
        clear = 0,
        minX = cw,
        minY = ch,
        maxX = -1,
        maxY = -1;
      for (let y = 0; y < ch; y++)
        for (let x = 0; x < cw; x++) {
          const a =
            png.data[((row * ch + y) * png.width + col * cw + x) * 4 + 3];
          if (a <= 23) clear++;
          if (a > 40) {
            count++;
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
      if (count < cw * ch * 0.015 || clear < cw * ch * 0.35)
        throw Error(`第 ${row + 1} 行第 ${col + 1} 帧为空或背景不透明`);
      if (minX < 2 || minY < 2 || maxX > cw - 3 || maxY > ch - 3)
        throw Error(`第 ${row + 1} 行第 ${col + 1} 帧贴边，可能被裁切`);
      boxes.push({ minX, minY, maxX, maxY });
    }
  // Reject copied static cells as animation (transparent padding is ignored).
  for (let row = 0; row < 4; row++) {
    let differences = 0;
    for (let col = 1; col < 4; col++)
      for (let y = 0; y < ch; y++)
        for (let x = 0; x < cw; x++) {
          const a = ((row * ch + y) * png.width + x) * 4,
            b = ((row * ch + y) * png.width + col * cw + x) * 4;
          if (
            (png.data[a + 3] > 40 || png.data[b + 3] > 40) &&
            [0, 1, 2, 3].some(
              (k) => Math.abs(png.data[a + k] - png.data[b + k]) > 12,
            )
          )
            differences++;
        }
    if (differences < 30) throw Error(`第 ${row + 1} 行没有可见的动作变化`);
  }
  return { width: png.width, height: png.height, frames: 16, boxes };
}
async function idlePortrait(file) {
  const png = PNG.sync.read(await fs.readFile(file)),
    size = png.width / 4,
    out = new PNG({ width: size, height: size });
  PNG.bitblt(png, out, 0, 0, size, size, 0, 0);
  return PNG.sync.write(out);
}
// Deterministic atlas packing: preserve every source cell and its pixels; add padding
// for non-divisible/non-square tool output instead of paying for another image.
async function packSheet(source, target) {
  const stat = await fs.lstat(source);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 24 * 1024 * 1024)
    throw Error("动作图文件无效或过大");
  const bytes = await fs.readFile(source);
  if (
    bytes.length < 24 ||
    !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    throw Error("动作图不是 PNG");
  const w = bytes.readUInt32BE(16),
    h = bytes.readUInt32BE(20);
  if (w < 512 || h < 512 || w > 4096 || h > 4096)
    throw Error("动作图尺寸不在允许范围");
  const png = PNG.sync.read(bytes),
    cell = Math.ceil(Math.max(w, h) / 4),
    out = new PNG({ width: cell * 4, height: cell * 4 });
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      const x = Math.floor((c * w) / 4),
        y = Math.floor((r * h) / 4),
        cw = Math.floor(((c + 1) * w) / 4) - x,
        ch = Math.floor(((r + 1) * h) / 4) - y;
      PNG.bitblt(
        png,
        out,
        x,
        y,
        cw,
        ch,
        c * cell + Math.floor((cell - cw) / 2),
        r * cell + cell - ch,
      );
    }
  await fs.writeFile(target, PNG.sync.write(out));
  return validateSheet(target);
}
module.exports = { validateSheet, idlePortrait, packSheet };
