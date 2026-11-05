const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("animePlay", {
  bootstrap: () => ipcRenderer.invoke("companion:call", "bootstrap"),
  close: () => ipcRenderer.invoke("companion:call", "close"),
  showMain: () => ipcRenderer.invoke("companion:call", "showMain"),
  onStatus(callback) {
    const listener = (_, status) => callback(status);
    ipcRenderer.on("companion:status", listener);
    return () => ipcRenderer.removeListener("companion:status", listener);
  },
  onRefresh(callback) {
    const listener = () => callback();
    ipcRenderer.on("companion:refresh", listener);
    return () => ipcRenderer.removeListener("companion:refresh", listener);
  },
});
