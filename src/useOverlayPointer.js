import { useEffect } from "react";
import { alphaHit, imagePoint } from "../shared/pointer-hit.mjs";
const masks = new Map();
function getMask(src) {
  if (masks.has(src)) return masks.get(src);
  const entry = { mask: null };
  const image = new Image();
  image.onload = () => {
    try {
      const canvas = document.createElement("canvas");
      const scale = Math.min(
        1,
        512 / Math.max(image.naturalWidth, image.naturalHeight),
      );
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      entry.mask = context.getImageData(0, 0, canvas.width, canvas.height);
    } catch {
      entry.failed = true;
    }
  };
  image.onerror = () => {
    entry.failed = true;
  };
  image.src = src;
  masks.set(src, entry);
  if (masks.size > 16) masks.delete(masks.keys().next().value);
  return entry;
}
export function interactiveAt(x, y, selector) {
  const target = document.elementFromPoint(x, y);
  if (!(target instanceof Element)) return false;
  if (target.closest(".quick-dismiss") || target.matches(".approval-shade"))
    return false;
  const interactive = target.closest(selector);
  if (!interactive) return false;
  const body = interactive.closest(".pet-body,.character");
  if (!body || target.closest("button,input,textarea,select")) return true;
  const sprite = body.querySelector(".pet-sprite"),
    portrait = body.querySelector(".state-image.visible");
  const image = sprite || portrait;
  if (!image) return true;
  const rect = image.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const src = sprite
    ? sprite.style.backgroundImage.replace(/^url\(["']?|["']?\)$/g, "")
    : portrait.src;
  const entry = getMask(src);
  if (!entry.mask) return !entry.failed;
  const point = sprite
    ? { x: (x - rect.left) / rect.width, y: (y - rect.top) / rect.height }
    : imagePoint(rect, portrait.naturalWidth, portrait.naturalHeight, x, y);
  const region = sprite
    ? {
        x: +sprite.dataset.hitX,
        y: +sprite.dataset.hitY,
        width: +sprite.dataset.hitWidth,
        height: +sprite.dataset.hitHeight,
      }
    : undefined;
  return alphaHit(entry.mask, point.x, point.y, region);
}
export function useOverlayPointer(api, { selector, dragging, enabled = true }) {
  useEffect(() => {
    if (!api) return;
    let stopped = false,
      busy = false,
      previous;
    const apply = (ignored) => {
      if (stopped || previous === ignored) return;
      previous = ignored;
      document.documentElement.dataset.pointerPassthrough = String(ignored);
      void api
        .windowControl({ action: "passthrough", value: ignored })
        .catch(() => {
          previous = undefined;
        });
    };
    const move = (x, y) =>
      apply(enabled && !dragging.current && !interactiveAt(x, y, selector));
    const onMouse = (e) => move(e.clientX, e.clientY);
    const poll = async () => {
      if (busy || stopped) return;
      busy = true;
      try {
        const p = await api.companionCursor();
        if (!stopped) move(p.x, p.y);
      } catch {
        apply(enabled && !dragging.current);
      } finally {
        busy = false;
      }
    };
    document.addEventListener("mousemove", onMouse);
    const timer = setInterval(poll, 80);
    void poll();
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("mousemove", onMouse);
    };
  }, [api, selector, dragging, enabled]);
}
