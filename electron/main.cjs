const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  screen,
  nativeImage,
  globalShortcut,
} = require("electron");
const path = require("node:path");

const { pathToFileURL } = require("node:url");
const { Rpc } = require("./rpc.cjs");
const { resolveCodex } = require("./codex-executable.cjs");
const { Preferences, PHASES } = require("./preferences.cjs");
const { Desktop } = require("./desktop.cjs");
const { BackgroundRemoval } = require("./background.cjs");
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
  return (
    persona +
    "\n\n" +
    (preferences.find(preferences.data.activeCharacter)?.name
      ? "Character display name: " +
        JSON.stringify(
          preferences.find(preferences.data.activeCharacter).name,
        ) +
        ".\n"
      : "") +
    {
      zh: "Use natural Simplified Chinese for user-facing replies unless the user asks otherwise.",
      en: "Use natural English for user-facing replies unless the user asks otherwise.",
      ja: "Use natural Japanese for user-facing replies unless the user asks otherwise.",
    }[preferences.data.language]
  );
}
function threadConfiguration(cwd, persona, mode) {
  const options = threadOptions(cwd, persona, mode);
  return { ...options, developerInstructions: instructions(persona) };
}
const {
  threadOptions,
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
const requests = new Map();
function emit(m) {
  if (win && !win.isDestroyed()) win.webContents.send("codex:event", m);
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
  async setBackgroundOptions(args) {
    return preferences.setBackgroundOptions(args);
  },
  async removeBackground(args) {
    return preferences.removeBackground(args);
  },
  async restoreOriginal(args) {
    return preferences.restoreOriginal(args);
  },
  async cancelBackgroundRemoval() {
    background.cancel();
  },
  async importActionImage(args = {}) {
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
    return preferences.removeActionImage(args);
  },
  async setLanguage({ language }) {
    return preferences.setLanguage(language);
  },
  async selectCharacter({ id }) {
    const result = await preferences.selectCharacter(id);
    desktop.setCharacter(result.character);
    return result;
  },
  async updateCharacter(profile) {
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
    else if (action === "passthrough")
      win.setIgnoreMouseEvents(!!value && !desktop.drag, { forward: true });
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
        !path.isAbsolute(executable) ||
        !/\.exe$/i.test(executable))
    )
      throw new Error("error.executable");
    return connect(executable);
  },
  async chooseExecutable() {
    const d = await dialog.showOpenDialog(win, {
      title: t("Pick official codex.exe"),
      properties: ["openFile"],
      filters: [{ name: "Codex", extensions: ["exe"] }],
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
  async newThread({ persona, mode }) {
    idle();
    if (!cwd) throw new Error("error.project");
    starting = true;
    try {
      const r = await rpc.request(
        "thread/start",
        threadConfiguration(cwd, persona, mode),
      );
      thread = r.thread.id;
      return r;
    } finally {
      starting = false;
    }
  },
  async listThreads({ cursor = null } = {}) {
    if (!cwd) return { data: [], nextCursor: null };
    return rpc.request("thread/list", {
      cwd,
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
    if (meta.thread.cwd !== cwd) throw new Error("error.projectThread");
    starting = true;
    try {
      const r = await rpc.request("thread/resume", {
        threadId: id,
        ...threadConfiguration(cwd, persona, mode),
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
    emit,
  });
  preferences = await new Preferences(
    app.getPath("userData"),
    nativeImage,
    (bytes) => background.remove(bytes),
    {
      profile: require("../characters/rin.json"),
      directory: path.join(root, "dist/characters/rin"),
    },
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
  });
  desktop.resizeSurface();
  desktop.setCharacter(preferences.find(preferences.data.activeCharacter));
  globalShortcut.register("CommandOrControl+Alt+A", () => {
    desktop.expand();
    win.setIgnoreMouseEvents(false);
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
      return await handlers[name](args);
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
