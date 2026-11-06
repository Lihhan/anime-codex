export function sizeValue(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0.4 && n <= 1.4 ? n : 0.7;
}
export function stepMotion(p, v, seconds, bounds) {
  const dt = Math.max(0, Math.min(seconds, 0.1));
  let x = p.x + v.x * dt,
    y = p.y + v.y * dt,
    vx = v.x,
    vy = v.y;
  if (x <= bounds.left) {
    x = bounds.left;
    vx = Math.abs(vx);
  }
  if (x >= bounds.right) {
    x = bounds.right;
    vx = -Math.abs(vx);
  }
  if (y <= bounds.top) {
    y = bounds.top;
    vy = Math.abs(vy);
  }
  if (y >= bounds.bottom) {
    y = bounds.bottom;
    vy = -Math.abs(vy);
  }
  return {
    position: { x, y },
    velocity: { x: vx, y: vy },
    direction:
      Math.abs(vx) >= Math.abs(vy)
        ? vx < 0
          ? "left"
          : "right"
        : vy < 0
          ? "up"
          : "down",
  };
}
