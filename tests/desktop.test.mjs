import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { EventEmitter } from "node:events";
const require = createRequire(import.meta.url);
const { place, edgeOf, union, tabBounds } = require("../shared/desktop.cjs");
const { Desktop } = require("../electron/desktop.cjs");
const area = { x: -1920, y: 0, width: 1920, height: 1040 };
test("placement, scale limits, and every edge work with negative monitor coordinates", () => {
  const a = place({ x: -4000, y: 5000, scale: 9 }, area, 0.75);
  assert.equal(a.scale, 1.8);
  assert.equal(a.width, 576);
  assert.equal(a.x, -1920);
  assert.equal(a.y + a.height, 1040);
  assert.equal(edgeOf(a, area), "left");
  for (const [edge, p] of Object.entries({
    left: { x: -1920, y: 100 },
    right: { x: -320, y: 100 },
    top: { x: -1000, y: 0 },
    bottom: { x: -1000, y: 640 },
  })) {
    const l = { ...p, width: 320, height: 400 };
    assert.equal(edgeOf(l, area), edge);
    const tab = tabBounds(l, area, edge);
    assert.ok(tab.x >= area.x && tab.y >= area.y);
    assert.ok(tab.x + tab.width <= 0 && tab.y + tab.height <= 1040);
  }
  assert.deepEqual(
    union([area, { x: 0, y: -100, width: 2560, height: 1440 }]),
    { x: -1920, y: -100, width: 4480, height: 1440 },
  );
});
test("dragging persists position; pending approvals block docking; expand restores full UI", async () => {
  const screen = new EventEmitter();
  screen.getPrimaryDisplay = () => ({ workArea: area });
  screen.getAllDisplays = () => [{ workArea: area }];
  screen.getDisplayNearestPoint = () => ({ workArea: area });
  let bounds = { ...area },
    blocked = false,
    saves = 0;
  const preferences = {
    data: { desktop: { scale: 1, autoHide: true } },
    save: async () => saves++,
  };
  const win = {
    getBounds: () => bounds,
    setBounds: (b) => (bounds = b),
    setIgnoreMouseEvents: () => {},
  };
  const events = [];
  const c = new Desktop({
    win,
    screen,
    preferences,
    emit: (e) => events.push(e),
    canHide: () => !blocked,
  });
  c.resizeSurface();
  await c.control({ action: "beginDrag", x: 100, y: 100 });
  await c.control({ action: "dragMove", x: -3000, y: 150 });
  await c.control({ action: "endDrag" });
  assert.equal(c.snapshot().edge, "left");
  assert.ok(saves);
  await c.control({ action: "expand" });
  assert.equal(c.snapshot().edge, null);
  blocked = true;
  await c.control({ action: "move", x: -1920, y: 100 });
  assert.equal(c.snapshot().edge, null);
  await c.control({ action: "scale", value: 20 });
  assert.equal(c.snapshot().scale, 1.8);
  await c.control({ action: "autoHide", value: false });
  assert.equal(c.snapshot().autoHide, false);
  c.dispose();
  assert.equal(screen.listenerCount("display-removed"), 0);
  assert.ok(events.length > 0);
});

test("native dock hover restores input and expands without renderer mouse events", async () => {
  const screen = new EventEmitter();
  screen.getPrimaryDisplay = () => ({ workArea: area });
  screen.getDisplayNearestPoint = () => ({ workArea: area });
  let cursor = { x: -900, y: 900 },
    ignored = false;
  screen.getCursorScreenPoint = () => cursor;
  const c = new Desktop({
    screen,
    win: {
      getBounds: () => area,
      setIgnoreMouseEvents: (v) => {
        ignored = v;
      },
    },
    preferences: {
      data: { desktop: { scale: 1, autoHide: true } },
      save: async () => {},
    },
    emit: () => {},
    canHide: () => true,
  });
  try {
    await c.control({ action: "move", x: area.x, y: 200 });
    assert.equal(c.edge, "left");
    assert.equal(
      ignored,
      true,
      "desktop outside the tab remains click-through",
    );
    const tab = tabBounds(c.layout, area, "left");
    cursor = { x: tab.x + 5, y: tab.y + 5 };
    c.checkDock(1000);
    assert.equal(ignored, false, "native hover makes the tab clickable");
    c.setPassthrough(true);
    assert.equal(
      ignored,
      false,
      "a stale renderer request cannot disable the recovery target",
    );
    c.checkDock(1349);
    assert.equal(c.edge, "left");
    cursor = { x: -900, y: 900 };
    c.checkDock(1350);
    cursor = { x: tab.x + 5, y: tab.y + 5 };
    c.checkDock(1500);
    c.checkDock(1850);
    assert.equal(c.edge, null);
    assert.equal(ignored, false);
  } finally {
    c.dispose();
  }
});

test("recovery tabs stay inset on every edge and fit very small work areas", () => {
  for (const work of [area, { x: -5, y: -10, width: 30, height: 25 }]) {
    for (const edge of ["left", "right", "top", "bottom"]) {
      const tab = tabBounds({ x: work.x - 100, y: work.y + 5000 }, work, edge);
      assert.ok(tab.x >= work.x && tab.y >= work.y);
      assert.ok(tab.x + tab.width <= work.x + work.width);
      assert.ok(tab.y + tab.height <= work.y + work.height);
      if (work.width > 100)
        assert.ok(tab.x > work.x && tab.x + tab.width < work.x + work.width);
    }
  }
});
