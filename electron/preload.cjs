const { contextBridge, ipcRenderer } = require("electron");
const names = [
  "bootstrap",
  "connect",
  "chooseExecutable",
  "chooseWorkspace",
  "newThread",
  "listThreads",
  "resume",
  "history",
  "send",
  "interrupt",
  "answer",
  "windowControl",
  "setLanguage",
  "selectCharacter",
  "updateCharacter",
  "importActionImage",
  "removeActionImage",
  "desktopControl",
];
contextBridge.exposeInMainWorld("animeCodex", {
  ...Object.fromEntries(
    names.map((name) => [
      name,
      (args) => ipcRenderer.invoke("codex:call", name, args),
    ]),
  ),
  onEvent(callback) {
    const listener = (_event, message) => callback(message);
    ipcRenderer.on("codex:event", listener);
    return () => ipcRenderer.removeListener("codex:event", listener);
  },
});
