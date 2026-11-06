const clamp = (n, limit) => Math.max(-limit, Math.min(limit, n));
// Coordinates are Electron screen DIPs relative to the native window, matching CSS.
export function gazeAt(cursor, bounds) {
  if (
    ![
      cursor?.x,
      cursor?.y,
      bounds?.x,
      bounds?.y,
      bounds?.width,
      bounds?.height,
    ].every(Number.isFinite)
  )
    return { x: 0, y: 0 };
  return {
    x: clamp(
      (cursor.x - bounds.x - bounds.width / 2) / Math.max(100, bounds.width),
      1,
    ),
    y: clamp(
      (cursor.y - bounds.y - bounds.height * 0.3) /
        Math.max(100, bounds.height),
      1,
    ),
  };
}
