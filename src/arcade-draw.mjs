import {
  WORLD,
  chargeDistance,
  beagleFrame,
} from "../shared/arcade-engine.mjs";
import sprite from "../shared/arcade-sprite.json" with { type: "json" };
const snap = (n) => Math.round(n / 2) * 2;
function block(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(snap(x), snap(y), Math.max(2, snap(w)), Math.max(2, snap(h)));
}
function border(ctx, x, y, w, h, color) {
  block(ctx, x, y, w, 2, color);
  block(ctx, x, y + h - 2, w, 2, color);
  block(ctx, x, y, 2, h, color);
  block(ctx, x + w - 2, y, 2, h, color);
}
const stars = Array.from({ length: 45 }, (_, i) => ({
  x: (i * 179 + 37) % 800,
  y: (i * 73 + 19) % 205,
  size: i % 5 === 0 ? 4 : 2,
}));
const moon = [
  "000111110000",
  "001111111000",
  "011111110000",
  "111111100000",
  "111111000000",
  "111111000000",
  "111111100000",
  "011111110000",
  "001111111100",
  "000111111000",
  "000011110000",
];
const kite = ["0001000", "0112110", "1222221", "0112110", "0001000"];
function platform(ctx, p, target, current, camera) {
  const x = p.x - p.width / 2 - camera,
    y = p.y;
  block(ctx, x + 8, y + 8, p.width - 16, 24, "#282b46");
  block(ctx, x + 14, y + 32, p.width - 28, 6, "#20263f");
  block(ctx, x, y - 6, p.width, 12, target ? "#72cdbf" : "#9c8aca");
  block(ctx, x + 4, y - 8, p.width - 8, 4, target ? "#bdffe0" : "#d4bcff");
  block(ctx, x + 4, y + 4, p.width - 8, 4, target ? "#408f9e" : "#665d9b");
  if (target) border(ctx, p.x - camera - 12, y - 12, 24, 8, "#e8d5ff");
  if (current) block(ctx, p.x - camera - 6, y + 18, 12, 2, "#c7b5ff");
}
function beagle(ctx, s, images, reduced) {
  const pose = beagleFrame(s, reduced),
    r = sprite.frames[pose],
    image = images.sheet;
  if (!image) return;
  let h =
    pose === "duck"
      ? 44
      : pose === "land"
        ? 62
        : pose === "hurt"
          ? 68
          : pose === "cheer"
            ? 82
            : 78;
  if (s.kind === "hop" && s.status === "charging")
    h -= Math.floor((s.charge / 1.2) * 3) * 2;
  const w = snap((h * r.width) / r.height),
    x = s.x - (s.kind === "hop" ? s.camera : 0);
  const grounded = s.kind === "runner" && s.y >= WORLD.ground - 0.1;
  const bob =
    grounded && s.status === "running" && !reduced
      ? Math.floor(s.elapsed * 11) % 2
        ? 2
        : 0
      : 0;
  ctx.drawImage(
    image,
    r.x,
    r.y,
    r.width,
    r.height,
    snap(x - w / 2),
    snap(s.y - h + bob),
    w,
    snap(h),
  );
}
export function drawArcade(ctx, s, images, { reduced = false } = {}) {
  ctx.clearRect(0, 0, 800, 420);
  block(ctx, 0, 0, 800, 90, "#17213c");
  block(ctx, 0, 90, 800, 90, "#202744");
  block(ctx, 0, 180, 800, 100, "#292e50");
  block(ctx, 0, 280, 800, 140, "#363453");
  const shift = s.kind === "hop" ? s.camera * 0.12 : s.distance * 0.12;
  for (const star of stars) {
    const x = (((star.x - shift) % 800) + 800) % 800;
    block(
      ctx,
      x,
      star.y,
      star.size,
      star.size,
      star.size === 4 ? "#f6e4bb" : "#9d9fc2",
    );
  }
  for (let y = 0; y < moon.length; y++)
    for (let x = 0; x < moon[y].length; x++)
      if (moon[y][x] === "1")
        block(ctx, 662 + x * 5, 45 + y * 5, 6, 6, "#e6d2da");
  for (let layer = 0; layer < 2; layer++)
    for (let x = 0; x < 800; x += 16) {
      const y = snap(
        256 +
          layer * 38 +
          Math.round(Math.sin((x + shift * (layer + 1)) / 110) * 4) * 6,
      );
      block(ctx, x, y, 16, 420 - y, layer ? "#252c47" : "#232b47");
    }
  if (s.kind === "hop") {
    for (const p of s.platforms)
      platform(ctx, p, p === s.target, p === s.current, s.camera);
    block(ctx, s.x - s.camera - 18, s.current.y + 4, 36, 4, "#171e36");
    if (s.status === "charging") {
      const d = chargeDistance(s.charge);
      for (let i = 0; i <= 22; i++) {
        const p = i / 22;
        block(
          ctx,
          s.x + d * p - s.camera,
          s.y +
            (s.target.y - s.y) * p -
            Math.sin(Math.PI * p) * (80 + d * 0.17) -
            4,
          4,
          4,
          "#f4d79c",
        );
      }
      border(ctx, s.x + d - s.camera - 10, s.target.y - 10, 20, 8, "#ffe6b6");
    }
    if (s.landTime > 0 && !reduced)
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5,
          r = (0.65 - s.landTime) * 88;
        block(
          ctx,
          s.x - s.camera + Math.cos(a) * r,
          s.y - 10 + Math.sin(a) * r * 0.4,
          4,
          4,
          s.flash === "perfect" ? "#ffe1a0" : "#aaf5d2",
        );
      }
    beagle(ctx, s, images, reduced);
    block(ctx, 28, 390, 744, 8, "#171e36");
    border(ctx, 26, 388, 748, 12, "#6e6794");
    if (s.status === "charging")
      block(
        ctx,
        28,
        390,
        Math.max(2, (744 * s.charge) / 1.2),
        8,
        s.charge > 0.95 ? "#f7ce8b" : "#91d9bc",
      );
  } else {
    block(ctx, 0, WORLD.ground + 2, 800, 94, "#212b42");
    block(ctx, 0, WORLD.ground + 2, 800, 4, "#91c4c9");
    for (let i = 0; i < 20; i++)
      block(
        ctx,
        ((((i * 57 - s.distance) % 855) + 855) % 855) - 25,
        WORLD.ground + 20 + (i % 3) * 15,
        18,
        2,
        "#4a5979",
      );
    for (const o of s.obstacles) {
      if (o.type === "kite") {
        const palette = { 1: "#d899b7", 2: "#f6d9df" };
        for (let y = 0; y < kite.length; y++)
          for (let x = 0; x < kite[y].length; x++)
            if (palette[kite[y][x]])
              block(ctx, o.x + x * 6, o.y + y * 4, 6, 4, palette[kite[y][x]]);
      } else {
        block(ctx, o.x, o.y + 12, o.width, o.height - 12, "#7da7ba");
        block(ctx, o.x + 4, o.y + 4, o.width - 8, 10, "#96cfda");
        block(ctx, o.x + 10, o.y, o.width - 20, 6, "#c0ebe6");
        block(ctx, o.x + o.width * 0.5, o.y + 8, 4, o.height - 10, "#bedfe2");
        block(ctx, o.x, o.y + o.height - 4, o.width, 4, "#4e7d97");
      }
    }
    block(ctx, s.x - 20, WORLD.ground + 6, 40, 4, "#171e36");
    beagle(ctx, s, images, reduced);
  }
}
