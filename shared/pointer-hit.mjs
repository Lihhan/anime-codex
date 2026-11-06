export function alphaHit(
  mask,
  x,
  y,
  region = { x: 0, y: 0, width: 1, height: 1 },
) {
  if (!mask || x < 0 || y < 0 || x >= 1 || y >= 1) return false;
  const px = Math.min(
    mask.width - 1,
    Math.floor((region.x + x * region.width) * mask.width),
  );
  const py = Math.min(
    mask.height - 1,
    Math.floor((region.y + y * region.height) * mask.height),
  );
  return mask.data[(py * mask.width + px) * 4 + 3] >= 24;
}
export function imagePoint(rect, width, height, x, y) {
  const scale = Math.min(rect.width / width, rect.height / height);
  const w = width * scale,
    h = height * scale;
  return {
    x: (x - rect.left - (rect.width - w) / 2) / w,
    y: (y - rect.top - (rect.height - h)) / h,
  };
}
