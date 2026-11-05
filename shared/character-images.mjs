import actions from "./actions.json" with { type: "json" };
export { actions };
export function resolveAction(images, phase) {
  return images?.[phase] ? phase : images?.idle ? "idle" : null;
}
