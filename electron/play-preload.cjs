const { contextBridge, ipcRenderer } = require("electron");
const call = (method) =>
  ipcRenderer.invoke("companion:call", method).catch((error) => {
    throw new Error(
      error.message.replace(
        /^Error invoking remote method '[^']+': (?:Error: )?/,
        "",
      ),
    );
  });
contextBridge.exposeInMainWorld("animePlay", {
  bootstrap: () => call("bootstrap"),
  close: () => call("close"),
  showMain: () => call("showMain"),
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
