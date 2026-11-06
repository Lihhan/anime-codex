export function glyphs(text) {
  const value = String(text || "");
  return typeof Intl.Segmenter === "function"
    ? Array.from(
        new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
          value,
        ),
        (v) => v.segment,
      )
    : Array.from(value);
}
// Presentation-only pages: joining them reproduces the exact original response.
export function dialoguePages(text, limit = 200) {
  const chars = glyphs(text);
  if (!chars.length) return [""];
  const pages = [];
  let start = 0;
  while (start < chars.length) {
    let end = Math.min(chars.length, start + Math.max(20, limit));
    if (end < chars.length)
      for (let i = end - 1; i > start + limit * 0.6; i--)
        if (/[\n。！？.!?]/u.test(chars[i])) {
          end = i + 1;
          break;
        }
    pages.push(chars.slice(start, end).join(""));
    start = end;
  }
  return pages;
}
export function bubbleReply(items, busy, turnId, live) {
  if (busy)
    return live?.id && live.turnId === turnId ? items[live.id] || null : null;
  if (live?.turnId && !live.id) return null;
  return (
    items[live?.id] ||
    Object.values(items)
      .filter((i) => i.type === "agentMessage")
      .at(-1) ||
    null
  );
}
