const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  screen,
  nativeImage,
  globalShortcut,
  utilityProcess,
} = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");

const { pathToFileURL } = require("node:url");
const { Rpc } = require("./rpc.cjs");
const { resolveCodex, isCodexExecutable } = require("./codex-executable.cjs");
const { Preferences, PHASES } = require("./preferences.cjs");
const { Desktop } = require("./desktop.cjs");
const { createDockWindow } = require("./dock-window.cjs");
const { BackgroundRemoval } = require("./background.cjs");
const { createBackgroundProcess } = require("./background-process.cjs");
const messages = require("../shared/messages.json");
let preferences, desktop, background;
function t(key) {
  if (
    typeof key === "string" &&
    key.startsWith("error.") &&
    key.includes(":")
  ) {
    const at = key.indexOf(":");
    return t(key.slice(0, at)) + " (" + key.slice(at + 1) + ")";
  }
  return (
    messages[preferences?.data.language || "zh"]?.[key] ??
    messages.en[key] ??
    key
  );
}
function instructions(persona) {
  const c = preferences.find(preferences.data.activeCharacter);
  const name = c?.builtin
    ? c.localizedNames?.[preferences.data.language] || c.name
    : c?.name;
  return (
    persona +
    "\n\n" +
    "Address the user naturally in the first person as the configured character. Use I/my rather than narrating the character in the third person. Keep the character's consistent personality, but never invent physical experiences, execution, progress or test results. Tool evidence and permission boundaries remain authoritative.\n" +
    (name
      ? "Character display name: " +
        JSON.stringify(name) +
        ". Use this configured display name when introducing yourself.\n"
      : "") +
    {
      zh: "Use natural Simplified Chinese for user-facing replies unless the user asks otherwise.",
      en: "Use natural English for user-facing replies unless the user asks otherwise.",
      ja: "Use natural Japanese for user-facing replies unless the user asks otherwise.",
    }[preferences.data.language]
  );
}
async function threadConfiguration(directory, persona, mode) {
  const options = cwd
    ? threadOptions(directory, persona, mode)
    : chatOptions(
        directory,
        persona,
        (await rpc.request("config/read", { includeLayers: false })).config,
      );
  return {
    ...options,
    developerInstructions: instructions(options.developerInstructions),
  };
}
function conversationDirectory() {
  return cwd || path.join(app.getPath("userData"), "chat");
}
const {
  threadOptions,
  chatOptions,
  approvalMethods,
  approvalResult,
} = require("./policy.cjs");
const root = path.join(__dirname, "..");
let win,
  rpc,
  cwd = null,
  thread = null,
  turn = null,
  starting = false,
  selectedExecutable = null;
let playWindow = null,
  appUrl = null;
function playStatus() {
  return {
    working: !!turn || starting,
    approval: requests.size > 0,
    connected: !!rpc?.child,
  };
}
async function playSnapshot() {
  const c = await preferences.character();
  return {
    language: preferences.data.language,
    interface: preferences.data.interface,
    character: c
      ? {
          id: c.id,
          name: c.name,
          builtin: c.builtin,
          localizedNames: c.localizedNames,
          images: c.images,
        }
      : null,
    status: playStatus(),
  };
}
function openPlay() {
  if (playWindow && !playWindow.isDestroyed()) {
    if (playWindow.isMinimized()) playWindow.restore();
    playWindow.show();
    playWindow.focus();
    return;
  }
  playWindow = new BrowserWindow({
    width: 960,
    height: 790,
    minWidth: 700,
    minHeight: 600,
    parent: win,
    title: "Anime Codex · Play",
    backgroundColor: "#171923",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "play-preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  const child = playWindow;
  const url = new URL(appUrl);
  url.searchParams.set("surface", "play");
  child.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  child.webContents.on("will-navigate", (event, target) => {
    if (target !== url.href) event.preventDefault();
  });
  child.once("ready-to-show", () => {
    if (!child.isDestroyed()) child.show();
  });
  child.on("closed", () => {
    if (playWindow === child) playWindow = null;
  });
  child.loadURL(url.href);
}
const requests = new Map();
function emit(m) {
  if (win && !win.isDestroyed()) win.webContents.send("codex:event", m);
  if (
    playWindow &&
    !playWindow.isDestroyed() &&
    (m.id !== undefined ||
      [
        "turn/started",
        "turn/completed",
        "client/disconnected",
        "serverRequest/resolved",
      ].includes(m.method))
  )
    playWindow.webContents.send("companion:status", playStatus());
}
function idle() {
  if (turn || starting || requests.size) throw new Error("error.busy");
}
function knownThread(id) {
  if (!thread || id !== thread) throw new Error("error.thread");
}
async function connect(executable) {
  idle();
  const resolved = await resolveCodex({
    explicit: executable,
    saved: preferences.data.codexExecutable,
  });
  if (rpc) rpc.close();
  const connection = new Rpc(resolved);
  rpc = connection;
  connection.on("event", (m) => {
    if (rpc !== connection) return;
    if (m.id !== undefined) {
      requests.set(String(m.id), m);
      desktop.expand();
    }
    if (m.method === "turn/started") turn = m.params.turn.id;
    if (m.method === "serverRequest/resolved")
      requests.delete(String(m.params.requestId));
    if (m.method === "turn/completed") {
      turn = null;
      requests.clear();
    }
    emit(m);
  });
  connection.on("disconnect", (message) => {
    if (rpc !== connection) return;
    turn = null;
    starting = false;
    requests.clear();
    emit({ method: "client/disconnected", params: { message: t(message) } });
  });
  try {
    await connection.start();
  } catch (error) {
    if (error.code === "ENOENT") throw new Error("error.codexNotFound");
    throw error;
  }
  const account = await connection.request("account/read", {
    refreshToken: false,
  });
  preferences.data.codexExecutable = resolved;
  await preferences.save();
  return {
    account: account.account,
    requiresOpenaiAuth: account.requiresOpenaiAuth,
  };
}
const handlers = {
  async setInterface(args) {
    return preferences.setInterface(args);
  },
  async openPlay() {
    openPlay();
  },
  async setBackgroundOptions(args) {
    return preferences.setBackgroundOptions(args);
  },
  async removeBackground(args) {
    idle();
    return preferences.removeBackground(args);
  },
  async restoreOriginal(args) {
    idle();
    return preferences.restoreOriginal(args);
  },
  async cancelBackgroundRemoval() {
    background.cancel();
  },
  async importActionImage(args = {}) {
    idle();
    const phase = args.phase || "idle";
    if (!PHASES.includes(phase)) throw new Error("error.action");
    const d = await dialog.showOpenDialog(win, {
      title: t("Upload image") + " · " + t("action." + phase),
      properties: ["openFile"],
      filters: [
        {
          name: t("Character image"),
          extensions: ["png", "jpg", "jpeg", "webp"],
        },
      ],
    });
    if (d.canceled) return null;
    const result = await preferences.importActionImage(
      { ...args, phase },
      d.filePaths[0],
    );
    desktop.setCharacter(result.character);
    return result;
  },
  async removeActionImage(args) {
    idle();
    return preferences.removeActionImage(args);
  },
  async setLanguage({ language }) {
    return preferences.setLanguage(language);
  },
  async selectCharacter({ id }) {
    idle();
    const changed = preferences.data.activeCharacter !== id;
    const result = await preferences.selectCharacter(id);
    if (changed) thread = null;
    desktop.setCharacter(result.character);
    return result;
  },
  async updateCharacter(profile) {
    idle();
    const result = await preferences.updateCharacter(profile);
    desktop.setCharacter(result.character);
    return result;
  },
  async desktopControl(args) {
    return desktop.control(args);
  },
  async windowControl({ action, value } = {}) {
    if (action === "close") win.close();
    else if (action === "minimize") win.minimize();
    else if (action === "alwaysOnTop") win.setAlwaysOnTop(!!value, "floating");
    else if (action === "passthrough") desktop.setPassthrough(value);
    else throw new Error("error.windowAction");
  },
  async bootstrap() {
    return {
      ...(await preferences.snapshot()),
      desktop: desktop.snapshot(),
      version: app.getVersion(),
      background: {
        ...background.status,
        modelCached: await background.isCached(),
      },
    };
  },
  async connect({ executable } = {}) {
    if (
      executable &&
      (executable !== selectedExecutable ||
        !(await isCodexExecutable(executable)))
    )
      throw new Error("error.executable");
    return connect(executable);
  },
  async chooseExecutable() {
    const d = await dialog.showOpenDialog(win, {
      title: t("Pick official Codex executable"),
      properties: ["openFile"],
      ...(process.platform === "win32"
        ? { filters: [{ name: "Codex", extensions: ["exe"] }] }
        : {}),
    });
    selectedExecutable = d.canceled ? null : d.filePaths[0];
    return selectedExecutable;
  },
  async chooseWorkspace() {
    idle();
    const d = await dialog.showOpenDialog(win, {
      title: t("Choose the project Codex may work on"),
      properties: ["openDirectory"],
    });
    if (d.canceled) return null;
    cwd = d.filePaths[0];
    thread = null;
    return cwd;
  },
  async clearWorkspace() {
    idle();
    cwd = null;
    thread = null;
  },
  async newThread({ persona, mode }) {
    idle();
    const directory = conversationDirectory();
    if (!cwd) await fs.mkdir(directory, { recursive: true });
    starting = true;
    try {
      const r = await rpc.request(
        "thread/start",
        await threadConfiguration(directory, persona, mode),
      );
      thread = r.thread.id;
      return r;
    } finally {
      starting = false;
    }
  },
  async listThreads({ cursor = null } = {}) {
    if (!rpc?.child) return { data: [], nextCursor: null };
    return rpc.request("thread/list", {
      cwd: conversationDirectory(),
      limit: 30,
      cursor,
      sortKey: "updated_at",
    });
  },
  async resume({ id, persona, mode }) {
    idle();
    const meta = await rpc.request("thread/read", {
      threadId: id,
      includeTurns: false,
    });
    if (path.resolve(meta.thread.cwd) !== path.resolve(conversationDirectory()))
      throw new Error("error.projectThread");
    starting = true;
    try {
      const r = await rpc.request("thread/resume", {
        threadId: id,
        ...(await threadConfiguration(conversationDirectory(), persona, mode)),
        excludeTurns: true,
      });
      thread = r.thread.id;
      return r;
    } finally {
      starting = false;
    }
  },
  async history({ id, cursor = null }) {
    knownThread(id);
    return rpc.request("thread/turns/list", {
      threadId: id,
      cursor,
      limit: 20,
      sortDirection: "desc",
      itemsView: "full",
    });
  },
  async send({ id, text }) {
    knownThread(id);
    idle();
    if (typeof text !== "string" || !text.trim() || text.length > 100000)
      throw new Error("error.message");
    starting = true;
    try {
      const r = await rpc.request("turn/start", {
        threadId: id,
        input: [{ type: "text", text, text_elements: [] }],
      });
      turn = r.turn.status === "inProgress" ? r.turn.id : turn;
      return r;
    } finally {
      starting = false;
    }
  },
  async interrupt() {
    if (turn)
      await rpc.request("turn/interrupt", { threadId: thread, turnId: turn });
  },
  async answer({ id, decision, answers }) {
    const r = requests.get(String(id));
    if (!r) throw new Error("error.requestExpired");
    let result;
    if (approvalMethods.includes(r.method))
      result = approvalResult(r, decision);
    else if (r.method === "item/tool/requestUserInput") {
      result = { answers: {} };
      for (const q of r.params.questions) {
        const answer = answers?.[q.id];
        if (typeof answer !== "string" || !answer.trim())
          throw new Error("error.answers");
        result.answers[q.id] = { answers: [answer] };
      }
    } else if (r.method === "item/permissions/requestApproval")
      result = { permissions: {}, scope: "turn" };
    else if (r.method === "mcpServer/elicitation/request")
      result = { action: "decline", content: null, _meta: null };
    else {
      rpc.reject(r.id);
      requests.delete(String(id));
      return;
    }
    rpc.reply(r.id, result);
    requests.delete(String(id));
    emit({ method: "serverRequest/resolved", params: { requestId: r.id } });
  },
};
if (process.env.ANIME_CODEX_DATA_DIR) {
  if (!path.isAbsolute(process.env.ANIME_CODEX_DATA_DIR))
    throw new Error("ANIME_CODEX_DATA_DIR must be absolute");
  app.setPath("userData", process.env.ANIME_CODEX_DATA_DIR);
}
app.whenReady().then(async () => {
  if (
    process.env.ANIME_CODEX_MODEL_CACHE &&
    !path.isAbsolute(process.env.ANIME_CODEX_MODEL_CACHE)
  )
    throw new Error("ANIME_CODEX_MODEL_CACHE must be absolute");
  const workerRoot = app.isPackaged
    ? path.join(process.resourcesPath, "app.asar.unpacked")
    : root;
  background = new BackgroundRemoval({
    directory:
      process.env.ANIME_CODEX_MODEL_CACHE ||
      path.join(app.getPath("userData"), "models"),
    workerPath: path.join(workerRoot, "electron/background-worker.cjs"),
    mathPath: path.join(workerRoot, "shared/background-math.cjs"),
    reuseWorker: !(process.platform === "darwin" && process.arch === "x64"),
    workerFactory:
      process.platform === "darwin" && process.arch === "x64"
        ? (file, options) =>
            createBackgroundProcess(utilityProcess, file, options)
        : undefined,
    emit,
  });
  preferences = await new Preferences(
    app.getPath("userData"),
    nativeImage,
    (bytes) => background.remove(bytes),
    require("../characters/catalog.json").map(({ slug }) => ({
      profile: require("../characters/" + slug + ".json"),
      directory: path.join(root, "dist/characters", slug),
    })),
  ).load();
  const area = screen.getPrimaryDisplay().workArea;
  const width = Math.min(1440, area.width),
    height = Math.min(950, area.height);
  win = new BrowserWindow({
    width,
    height,
    x: area.x + area.width - width,
    y: area.y + area.height - height,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    resizable: false,
    alwaysOnTop: true,
    title: "Anime Codex",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  desktop = new Desktop({
    win,
    screen,
    preferences,
    emit,
    canHide: () => requests.size === 0,
    recovery: createDockWindow({
      BrowserWindow,
      parent: win,
      expand: () => desktop.expand(),
      label: () => {
        const c = preferences.find(preferences.data.activeCharacter);
        return (
          (c?.builtin ? c.localizedNames?.[preferences.data.language] : null) ||
          c?.name ||
          "Anime Codex"
        );
      },
    }),
  });
  desktop.resizeSurface();
  desktop.setCharacter(preferences.find(preferences.data.activeCharacter));
  globalShortcut.register("CommandOrControl+Alt+A", () => {
    desktop.expand();
    win.setIgnoreMouseEvents(false);
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
    emit({ method: "client/inputRestored", params: {} });
  });
  win.on("blur", () => {
    if (desktop.drag) desktop.control({ action: "endDrag" }).catch(() => {});
  });
  const dev = process.env.ANIME_CODEX_DEV === "1";
  const url = dev
    ? "http://127.0.0.1:5173"
    : pathToFileURL(path.join(root, "dist/index.html")).href;
  appUrl = url;
  win.on("closed", () => {
    desktop?.dispose();
    if (playWindow && !playWindow.isDestroyed()) playWindow.destroy();
  });
  ipcMain.handle("companion:call", async (event, method) => {
    if (
      !playWindow ||
      playWindow.isDestroyed() ||
      event.sender !== playWindow.webContents ||
      event.senderFrame !== playWindow.webContents.mainFrame
    )
      throw new Error(t("error.call"));
    if (method === "bootstrap") return playSnapshot();
    if (method === "close") {
      playWindow.close();
      return;
    }
    if (method === "showMain") {
      playWindow.minimize();
      desktop.expand();
      win.show();
      win.focus();
      return;
    }
    throw new Error(t("error.call"));
  });
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (e, target) => {
    if (target !== url) e.preventDefault();
  });
  ipcMain.handle("codex:call", async (e, name, args) => {
    if (
      e.sender !== win.webContents ||
      e.senderFrame !== win.webContents.mainFrame ||
      !Object.hasOwn(handlers, name)
    )
      throw new Error(t("error.call"));
    try {
      const result = await handlers[name](args);
      if (
        playWindow &&
        !playWindow.isDestroyed() &&
        [
          "setInterface",
          "setLanguage",
          "selectCharacter",
          "updateCharacter",
          "importActionImage",
          "removeActionImage",
          "removeBackground",
          "restoreOriginal",
        ].includes(name)
      )
        playWindow.webContents.send("companion:refresh");
      return result;
    } catch (error) {
      throw new Error(t(error.message));
    }
  });
  win.loadURL(url);
});
app.on("window-all-closed", () => {
  background?.dispose();
  desktop?.dispose();
  globalShortcut.unregisterAll();
  rpc?.close();
  app.quit();
});
