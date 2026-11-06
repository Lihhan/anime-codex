const path = require("node:path");
function createDockWindow({ BrowserWindow, parent, expand, label }) {
  let window = null,
    current = null;
  function update() {
    if (!window || window.isDestroyed() || !current) return;
    window.setBounds(current.bounds);
    window.webContents.send("dock:update", {
      edge: current.edge,
      label: label(),
    });
    window.showInactive();
  }
  return {
    show(bounds, edge) {
      current = { bounds, edge };
      if (!window || window.isDestroyed()) {
        window = new BrowserWindow({
          ...bounds,
          parent,
          frame: false,
          transparent: true,
          backgroundColor: "#00000000",
          hasShadow: false,
          resizable: false,
          movable: false,
          minimizable: false,
          maximizable: false,
          skipTaskbar: true,
          focusable: false,
          alwaysOnTop: true,
          show: false,
          title: "Anime Codex — Edge tab",
          webPreferences: {
            preload: path.join(__dirname, "dock-preload.cjs"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
          },
        });
        window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
        window.webContents.on("will-navigate", (e) => e.preventDefault());
        window.webContents.on("ipc-message", (event, channel) => {
          if (
            channel === "dock:expand" &&
            event.senderFrame === window?.webContents.mainFrame
          )
            expand();
        });
        window.webContents.on("did-finish-load", update);
        window.loadFile(path.join(__dirname, "dock.html"));
      } else update();
    },
    hide() {
      current = null;
      if (window && !window.isDestroyed()) window.hide();
    },
    dispose() {
      current = null;
      if (window && !window.isDestroyed()) window.destroy();
      window = null;
    },
  };
}
module.exports = { createDockWindow };
