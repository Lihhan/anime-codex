function clamp(v, min, max) {
  return Math.min(Math.max(v, min), Math.max(min, max));
}
function size(scale, aspect = 0.75) {
  const width = Math.round(320 * clamp(Number(scale) || 1, 0.5, 1.8));
  return {
    width,
    height: Math.min(
      1000,
      Math.round(width / Math.max(0.2, Math.min(3, aspect))),
    ),
  };
}
function place(layout, area, aspect = 0.75) {
  const dimensions = size(layout.scale, aspect);
  return {
    ...layout,
    scale: clamp(Number(layout.scale) || 1, 0.5, 1.8),
    ...dimensions,
    x: clamp(layout.x, area.x, area.x + area.width - dimensions.width),
    y: clamp(layout.y, area.y, area.y + area.height - dimensions.height),
  };
}
function edgeOf(layout, area, threshold = 18) {
  const distances = {
    left: Math.abs(layout.x - area.x),
    right: Math.abs(layout.x + layout.width - area.x - area.width),
    top: Math.abs(layout.y - area.y),
    bottom: Math.abs(layout.y + layout.height - area.y - area.height),
  };
  const [edge, distance] = Object.entries(distances).sort(
    (a, b) => a[1] - b[1],
  )[0];
  return distance <= threshold ? edge : null;
}
function union(areas) {
  const x = Math.min(...areas.map((a) => a.x)),
    y = Math.min(...areas.map((a) => a.y));
  return {
    x,
    y,
    width: Math.max(...areas.map((a) => a.x + a.width)) - x,
    height: Math.max(...areas.map((a) => a.y + a.height)) - y,
  };
}
function tabBounds(layout, area, edge) {
  const horizontal = edge === "top" || edge === "bottom",
    width = Math.min(area.width, horizontal ? 152 : 52),
    height = Math.min(area.height, horizontal ? 44 : 152),
    insetX = Math.min(8, Math.max(0, (area.width - width) / 2)),
    insetY = Math.min(8, Math.max(0, (area.height - height) / 2));
  return {
    x:
      edge === "left"
        ? area.x + insetX
        : edge === "right"
          ? area.x + area.width - width - insetX
          : clamp(
              layout.x,
              area.x + insetX,
              area.x + area.width - width - insetX,
            ),
    y:
      edge === "top"
        ? area.y + insetY
        : edge === "bottom"
          ? area.y + area.height - height - insetY
          : clamp(
              layout.y,
              area.y + insetY,
              area.y + area.height - height - insetY,
            ),
    width,
    height,
  };
}
module.exports = { clamp, size, place, edgeOf, union, tabBounds };
