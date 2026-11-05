// Coordinates are relative to the image content, excluding object-fit letterboxing.
export function touchPoint(rect, width, height, x, y) {
  const scale = Math.min(rect.width / width, rect.height / height);
  const w = width * scale,
    h = height * scale;
  const nx = (x - rect.left - (rect.width - w) / 2) / w;
  const ny = (y - rect.top - (rect.height - h)) / h;
  if (nx < 0 || nx >= 1 || ny < 0 || ny >= 1) return null;
  return {
    x: nx,
    y: ny,
    region: ny < 0.38 ? "hair" : ny > 0.76 ? "hands" : "shoulders",
  };
}
export function isDrag(start, point) {
  return Math.hypot(point.x - start.x, point.y - start.y) > 6;
}
