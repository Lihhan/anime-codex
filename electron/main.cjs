const { app, BrowserWindow, ipcMain, dialog, screen } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const { pathToFileURL } = require("node:url");
const { Rpc } = require("./rpc.cjs");
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
  if (turn || starting || requests.size)
    throw new Error("请等待本轮结束，或先停止任务");
}
function knownThread(id) {
  if (!thread || id !== thread) throw new Error("线程不匹配");
}
async function connect(executable) {
  idle();
  if (rpc) rpc.close();
  rpc = new Rpc(executable || process.env.CODEX_PATH || "codex");
  rpc.on("event", (m) => {
    if (m.id !== undefined) {
      requests.set(String(m.id), m);
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
  rpc.on("disconnect", (message) => {
    turn = null;
    starting = false;
    requests.clear();
    emit({ method: "client/disconnected", params: { message } });
  });
  await rpc.start();
  const account = await rpc.request("account/read", { refreshToken: false });
  return {
    account: account.account,
    requiresOpenaiAuth: account.requiresOpenaiAuth,
  };
}
const handlers = {
  async windowControl({ action, value } = {}) {
    if (action === "close") win.close();
    else if (action === "minimize") win.minimize();
    else if (action === "alwaysOnTop") win.setAlwaysOnTop(!!value, "floating");
    else if (action === "passthrough")
      win.setIgnoreMouseEvents(!!value, { forward: true });
    else throw new Error("无效窗口操作");
  },
  async bootstrap() {
    return {
      character: JSON.parse(
        await fs.readFile(path.join(root, "characters/rin.json"), "utf8"),
      ),
      version: app.getVersion(),
    };
  },
  async connect({ executable } = {}) {
    if (
      executable &&
      (executable !== selectedExecutable ||
        !path.isAbsolute(executable) ||
        !/\.exe$/i.test(executable))
    )
      throw new Error("请通过文件选择器选择官方 codex.exe");
    return connect(executable);
  },
  async chooseExecutable() {
    const d = await dialog.showOpenDialog(win, {
      title: "选择官方 codex.exe",
      properties: ["openFile"],
      filters: [{ name: "Codex", extensions: ["exe"] }],
    });
    selectedExecutable = d.canceled ? null : d.filePaths[0];
    return selectedExecutable;
  },
  async chooseWorkspace() {
    idle();
    const d = await dialog.showOpenDialog(win, {
      title: "选择 Codex 可以工作的项目",
      properties: ["openDirectory"],
    });
    if (d.canceled) return null;
    cwd = d.filePaths[0];
    thread = null;
    return cwd;
  },
  async newThread({ persona, mode }) {
    idle();
    if (!cwd) throw new Error("请先选择项目");
    starting = true;
    try {
      const r = await rpc.request(
        "thread/start",
        threadOptions(cwd, persona, mode),
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
    if (meta.thread.cwd !== cwd) throw new Error("该线程不属于当前项目");
    starting = true;
    try {
      const r = await rpc.request("thread/resume", {
        threadId: id,
        ...threadOptions(cwd, persona, mode),
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
      throw new Error("请输入有效消息");
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
    if (!r) throw new Error("该请求已失效");
    let result;
    if (approvalMethods.includes(r.method))
      result = approvalResult(r, decision);
    else if (r.method === "item/tool/requestUserInput") {
      result = { answers: {} };
      for (const q of r.params.questions) {
        const answer = answers?.[q.id];
        if (typeof answer !== "string" || !answer.trim())
          throw new Error("请回答每个问题");
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
app.whenReady().then(() => {
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
      throw new Error("无效调用");
    return handlers[name](args);
  });
  win.loadURL(url);
});
app.on("window-all-closed", () => {
  rpc?.close();
  app.quit();
});
