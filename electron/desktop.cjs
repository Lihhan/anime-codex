const {
  place,
  edgeOf,
  union,
  tabBounds,
  clamp,
} = require("../shared/desktop.cjs");
class Desktop {
  constructor({ win, screen, preferences, emit, canHide, recovery }) {
    Object.assign(this, { win, screen, preferences, emit, canHide, recovery });
    this.drag = null;
    this.edge = null;
    this.aspect = 0.75;
    const area = screen.getPrimaryDisplay().workArea;
    this.layout = place(
      {
        ...preferences.data.desktop,
        x: preferences.data.desktop.x ?? area.x + area.width - 360,
        y: preferences.data.desktop.y ?? area.y + area.height - 540,
      },
      area,
    );
    this.onDisplay = () => {
      this.expand();
      this.resizeSurface();
      this.setLayout(this.layout);
    };
    screen.on("display-added", this.onDisplay);
    screen.on("display-removed", this.onDisplay);
    screen.on("display-metrics-changed", this.onDisplay);
    // Transparent/click-through windows do not reliably receive mouse-enter.
    // Keep the recovery target usable without depending on renderer events.
    this.dockWatch = setInterval(() => this.checkDock(), 100);
    this.dockWatch.unref?.();
  }
  resizeSurface() {
    this.surface = union(this.screen.getAllDisplays().map((d) => d.workArea));
    this.win.setBounds(this.surface);
  }
  area(layout = this.layout) {
    return this.screen.getDisplayNearestPoint({
      x: Math.round(layout.x + layout.width / 2),
      y: Math.round(layout.y + layout.height / 2),
    }).workArea;
  }
  snapshot() {
    const b = this.win.getBounds();
    const tab = this.edge
      ? tabBounds(this.layout, this.area(), this.edge)
      : null;
    return {
      ...this.layout,
      x: this.layout.x - b.x,
      y: this.layout.y - b.y,
      edge: this.edge,
      tab: tab ? { ...tab, x: tab.x - b.x, y: tab.y - b.y } : null,
      dragging: !!this.drag,
    };
  }
  publish() {
    this.checkDock();
    if (this.edge)
      this.recovery?.show(
        tabBounds(this.layout, this.area(), this.edge),
        this.edge,
      );
    else this.recovery?.hide();
    this.emit({ method: "client/desktop", params: this.snapshot() });
    return this.snapshot();
  }
  async persist() {
    this.preferences.data.desktop = {
      ...this.preferences.data.desktop,
      x: this.layout.x,
      y: this.layout.y,
      scale: this.layout.scale,
      autoHide: this.layout.autoHide,
    };
    await this.preferences.save();
  }
  setLayout(next) {
    this.layout = place(
      { ...this.layout, ...next },
      this.area({ ...this.layout, ...next }),
      this.aspect,
    );
    return this.publish();
  }
  async control({ action, x, y, value } = {}) {
    if (action === "beginDrag") {
      if (!Number.isFinite(x) || !Number.isFinite(y))
        throw new Error("error.position");
      this.expand();
      this.drag = { x, y, start: { ...this.layout } };
      this.win.setIgnoreMouseEvents(false);
      return this.publish();
    }
    if (action === "dragMove") {
      if (this.drag && Number.isFinite(x) && Number.isFinite(y)) {
        this.layout = {
          ...this.layout,
          x: this.drag.start.x + x - this.drag.x,
          y: this.drag.start.y + y - this.drag.y,
        };
        return this.publish();
      }
      return this.snapshot();
    }
    if (action === "endDrag") {
      if (!this.drag) return this.snapshot();
      this.drag = null;
      this.setLayout(this.layout);
      if (this.layout.autoHide && this.canHide())
        this.edge = edgeOf(this.layout, this.area());
      await this.persist();
      return this.publish();
    }
    if (action === "scale") {
      if (!Number.isFinite(value)) throw new Error("error.position");
      this.expand();
      this.setLayout({ scale: clamp(value, 0.5, 1.8) });
      await this.persist();
      return this.snapshot();
    }
    if (action === "autoHide") {
      this.layout.autoHide = !!value;
      if (!value) this.expand();
      await this.persist();
      return this.publish();
    }
    if (action === "move") {
      if (!Number.isFinite(x) || !Number.isFinite(y))
        throw new Error("error.position");
      this.expand();
      this.setLayout({ x, y });
      if (this.layout.autoHide && this.canHide())
        this.edge = edgeOf(this.layout, this.area());
      await this.persist();
      return this.publish();
    }
    if (action === "expand") return this.expand();
    if (action === "reset") {
      const a = this.screen.getPrimaryDisplay().workArea;
      this.edge = null;
      this.setLayout({
        x: a.x + a.width - 360,
        y: a.y + a.height - 540,
        scale: 1,
      });
      await this.persist();
      return this.snapshot();
    }
    throw new Error("error.windowAction");
  }
  expand() {
    this.edge = null;
    this.dockHoverSince = null;
    this.win.setIgnoreMouseEvents(false);
    return this.publish();
  }
  dockContainsCursor() {
    if (!this.edge) return false;
    const point = this.screen.getCursorScreenPoint?.();
    if (!point) return false;
    const tab = tabBounds(this.layout, this.area(), this.edge);
    return (
      point.x >= tab.x &&
      point.x < tab.x + tab.width &&
      point.y >= tab.y &&
      point.y < tab.y + tab.height
    );
  }
  setPassthrough(value) {
    this.win.setIgnoreMouseEvents(
      !!value && !this.drag && !this.dockContainsCursor(),
      { forward: true },
    );
  }
  checkDock(now = Date.now()) {
    if (!this.edge || this.win.isDestroyed?.()) return;
    const inside = this.dockContainsCursor();
    this.setPassthrough(!inside);
    if (!inside) {
      this.dockHoverSince = null;
      return;
    }
    this.dockHoverSince ??= now;
    if (now - this.dockHoverSince >= 350) this.expand();
  }
  setCharacter(character = {}) {
    this.aspect = (character.width || 360) / (character.height || 480);
    this.setLayout(this.layout);
  }
  dispose() {
    clearInterval(this.dockWatch);
    this.recovery?.dispose();
    for (const event of [
      "display-added",
      "display-removed",
      "display-metrics-changed",
    ])
      this.screen.removeListener(event, this.onDisplay);
  }
}
module.exports = { Desktop };
