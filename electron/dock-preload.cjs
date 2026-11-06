const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("edgeTab", {
  expand: () => ipcRenderer.send("dock:expand"),
  onUpdate: (callback) =>
    ipcRenderer.on("dock:update", (_event, data) => callback(data)),
});
