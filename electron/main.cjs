const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  screen,
  nativeImage,
  globalShortcut,
  utilityProcess,
  Tray,
  Menu,
  shell,
  powerMonitor,
} = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");

const { pathToFileURL } = require("node:url");
const { Rpc } = require("./rpc.cjs");
const { ClaudeBackend } = require("./claude.cjs");
const { loginEnvironment, resolveClaude } = require("./claude-environment.cjs");
const { CharacterStudio, personaFor } = require("./character-studio.cjs");
const { TranslationService } = require("./translation.cjs");
const { Companion } = require("./companion.cjs");
const { InputPulse } = require("./input-pulse.cjs");
const { NativeSpeech } = require("./speech.cjs");
const speech = new NativeSpeech();
let companion,
  tray,
  inputPulse,
  quitting = false;
const { resolveCodex, isCodexExecutable } = require("./codex-executable.cjs");
const { Preferences, PHASES } = require("./preferences.cjs");
const { Desktop } = require("./desktop.cjs");
const { createDockWindow } = require("./dock-window.cjs");
const { BackgroundRemoval } = require("./background.cjs");
const { createBackgroundProcess } = require("./background-process.cjs");
const messages = require("../shared/messages.json");
let preferences, desktop, background, translator, translationTest, studio;
function backend() {
  return preferences?.data.backend === "claude" ? "claude" : "codex";
}
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
  if (backend() === "claude") {
    if (
      !cwd ||
      !path.isAbsolute(directory || "") ||
      typeof persona !== "string" ||
      persona.length > 12000
    )
      throw new Error("error.project");
    return {
      cwd: directory,
      developerInstructions:
        instructions(persona) +
        (translator.config.enabled
          ? "\nWrite user-facing explanations in English; an independent UI service translates them into Chinese. Do not translate on behalf of that service."
          : ""),
    };
  }
  const options = cwd
    ? threadOptions(directory, persona, mode)
    : chatOptions(
        directory,
        persona,
        (await rpc.request("config/read", { includeLayers: false })).config,
      );
  const selected = preferences.data.codexModel || {};
  return {
    ...options,
    ...(selected.model ? { model: selected.model } : {}),
    config: {
      ...options.config,
      ...(selected.effort ? { model_reasoning_effort: selected.effort } : {}),
    },
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
const appIcon = path.join(
  root,
  app.isPackaged ? "dist" : "public",
  "app-icon.png",
);
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
    connected: !!rpc?.child || !!rpc?.connected,
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
    icon: appIcon,
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
let connectionAttempt = null;
async function connect(executable) {
  if (connectionAttempt) return connectionAttempt;
  idle();
  starting = true;
  connectionAttempt = connectNative(executable);
  try {
    return await connectionAttempt;
  } finally {
    connectionAttempt = null;
    starting = false;
  }
}
async function connectNative(executable) {
  const claude = backend() === "claude";
  const env = await loginEnvironment();
  const resolved = claude
    ? await resolveClaude({
        explicit: executable,
        saved: preferences.data.claudeExecutable,
        env,
      })
    : await resolveCodex({
        explicit: executable,
        saved: preferences.data.codexExecutable,
        env,
      });
  if (rpc) rpc.close();
  const connection = claude
    ? new ClaudeBackend({
        executable: resolved,
        env,
        directory: path.join(app.getPath("userData"), "claude-conversations"),
        translator,
      })
    : new Rpc(resolved, undefined, env);
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
    if (error.code === "ENOENT" && !claude)
      throw new Error("error.codexNotFound");
    throw error;
  }
  const account = await connection.request("account/read", {
    refreshToken: false,
  });
  preferences.data[claude ? "claudeExecutable" : "codexExecutable"] = resolved;
  await preferences.save();
  let workspaceWarning = null;
  const savedWorkspace = preferences.data.lastWorkspaces?.[backend()];
  if (!cwd && savedWorkspace) {
    try {
      if (
        !path.isAbsolute(savedWorkspace) ||
        !(await require("node:fs/promises").stat(savedWorkspace)).isDirectory()
      )
        throw new Error();
      cwd = savedWorkspace;
    } catch {
      workspaceWarning = "上次的项目目录已不可访问，请重新选择项目。";
    }
  }
  return {
    workspace: cwd,
    workspaceWarning,
    account: account.account,
    requiresOpenaiAuth: account.requiresOpenaiAuth,
  };
}
const handlers = {
  async companionState() {
    return companion.snapshot();
  },
  async companionChat({ text }) {
    return companion.message(text);
  },
  async companionStop() {
    companion.busy?.abort();
  },
  async companionSettings(values) {
    if (values.voice === false || values.quiet === true) speech.stop();
    const current = companion.store.state.settings;
    if (
      (values.keyboard ?? current.keyboard) &&
      !(values.quiet ?? current.quiet)
    )
      await inputPulse.start();
    else inputPulse.stop();
    return companion.settings(values);
  },
  async companionCursor() {
    const p = screen.getCursorScreenPoint(),
      b = win.getBounds();
    return { x: p.x - b.x, y: p.y - b.y };
  },
  async companionVoices() {
    return speech.voices();
  },
  async companionSpeak(args) {
    if (
      companion.store.state.settings.quiet ||
      (!companion.store.state.settings.voice && !args.preview)
    )
      return { cancelled: true };
    const s = companion.store.state.settings;
    return speech.speak({
      ...args,
      rate: Math.max(0.5, Math.min(2, (args.rate || 1) * s.voiceRate)),
      pitch: s.voicePitch,
      voice: s.voiceName,
    });
  },
  async companionSpeechStop() {
    speech.stop();
  },
  async companionModels() {
    return companion.models();
  },
  async companionHistory({ query = "", before = null } = {}) {
    return companion.store.history(
      companion.character()?.id,
      String(query).slice(0, 500),
      before,
    );
  },
  async companionMemory({ action, id, text, global = false }) {
    const store = companion.store;
    if (action === "delete") {
      store.state.memories = store.state.memories.filter((m) => m.id !== id);
      await store.save();
    } else
      await store.memory({
        id,
        text,
        global,
        characterId: companion.character()?.id,
        status: "confirmed",
      });
    companion.publish();
    return companion.snapshot();
  },
  async companionWorkspace() {
    const d = await dialog.showOpenDialog(win, {
      title: "选择任务执行项目",
      properties: ["openDirectory"],
    });
    if (d.canceled) return null;
    companion.store.state.settings.workspace = d.filePaths[0];
    await companion.store.save();
    companion.publish();
    return d.filePaths[0];
  },
  async companionTask(args) {
    const s = companion.store.state.settings;
    return companion.tasks.create({
      ...args,
      workspace: s.workspace,
      engine: args.engine || s.executor,
      model: s.taskModel,
      effort: s.taskEffort,
      characterId: companion.character()?.id,
    });
  },
  async companionTaskControl({ action, id, text }) {
    if (action === "cancel") return companion.tasks.cancel(id);
    if (action === "resume") return companion.tasks.resume(id, text);
    throw Error("任务操作无效。");
  },
  async companionAnswer(args) {
    return companion.tasks.answer(args);
  },
  async companionLife({ game = false, score = null } = {}) {
    companion.store.state.life.affection += 1;
    if (game) companion.store.state.life.games += 1;
    const life = companion.store.state.life;
    life.events ||= [];
    life.events.push({
      type: game ? "star-game" : "touch",
      score:
        game && Number.isInteger(score)
          ? Math.max(0, Math.min(10000, score))
          : null,
      characterId: companion.character()?.id,
      time: new Date().toISOString(),
    });
    life.events = life.events.slice(-30);
    await companion.store.save();
    companion.publish();
    return companion.store.state.life;
  },
  async companionFiles({ paths } = {}) {
    if (!paths) {
      const d = await dialog.showOpenDialog(win, {
        title: "选择要投喂的文件",
        properties: ["openFile", "multiSelections"],
      });
      if (d.canceled) return null;
      paths = d.filePaths;
    }
    return companion.prepareFiles(paths);
  },
  async companionEat({ token }) {
    return companion.eat(token);
  },
  async companionRestore({ id }) {
    const m = await companion.files.restore(id);
    companion.publish();
    return m;
  },
  async companionReveal({ id }) {
    const m = companion.store.state.meals.find((m) => m.id === id);
    if (!m) throw Error("文件记录不存在。");
    shell.showItemInFolder(m.path);
  },
  async companionIdle() {
    return powerMonitor.getSystemIdleTime();
  },
  async companionQuit() {
    app.quit();
  },
  async studioProduce(args) {
    idle();
    starting = true;
    try {
      const job = await studio.produce(args);
      return {
        job,
        preferences: await handlers.studioApply({ id: job.id, pet: true }),
      };
    } finally {
      starting = false;
    }
  },
  async studioList() {
    return studio.list();
  },
  async studioDraft(args) {
    idle();
    starting = true;
    try {
      return await studio.draft(args);
    } finally {
      starting = false;
    }
  },
  async studioGenerate(args) {
    idle();
    starting = true;
    try {
      return await studio.generate(args);
    } finally {
      starting = false;
    }
  },
  async studioCancel() {
    studio.cancel();
  },
  async studioApply({ id, candidateId, pet = false }) {
    if (!pet) idle();
    const job = await studio.read(id),
      candidate = job.candidates.find((c) => c.id === candidateId);
    if (pet) {
      const result = await preferences.installPet(
        job,
        path.join(studio.directory, id),
        personaFor(job.profile),
      );
      thread = null;
      return result;
    }
    if (!candidate || !job.profile) throw new Error("请先选择并确认形象候选。");
    await preferences.importActionImage(
      {},
      path.join(studio.directory, id, pet ? job.petPortrait : candidate.file),
    );
    const c = preferences.find(preferences.data.activeCharacter);
    c.name = job.profile.name;
    c.persona = personaFor(job.profile);
    c.profile = job.profile;
    c.studioJob = id;
    await preferences.save();
    thread = null;
    return preferences.snapshot();
  },
  async listModels() {
    if (backend() !== "codex" || !rpc) throw new Error("请先连接 Codex。");
    const models = [];
    let cursor = null;
    do {
      const page = await rpc.request("model/list", {
        cursor,
        includeHidden: false,
      });
      models.push(...page.data);
      cursor = page.nextCursor;
    } while (cursor);
    return models;
  },
  async setCodexModel({ model = "", effort = "" }) {
    idle();
    if (typeof model !== "string" || typeof effort !== "string")
      throw new Error("模型设置无效。");
    const models = await handlers.listModels();
    const entry = model ? models.find((m) => m.model === model) : null;
    if (model && !entry) throw new Error("请选择当前 Codex 提供的模型。");
    if (
      effort &&
      (!entry ||
        !entry.supportedReasoningEfforts.some(
          (e) => e.reasoningEffort === effort,
        ))
    )
      throw new Error("该模型不支持所选推理强度。");
    preferences.data.codexModel = { model, effort };
    await preferences.save();
    thread = null;
    return preferences.data.codexModel;
  },
  async setBackend({ provider }) {
    idle();
    if (!["codex", "claude"].includes(provider))
      throw new Error("Unknown backend.");
    rpc?.close();
    rpc = null;
    cwd = thread = turn = selectedExecutable = null;
    preferences.data.backend = provider;
    await preferences.save();
    return { backend: provider };
  },
  async setTranslation(args) {
    idle();
    const result = await translator.configure(args);
    preferences.data.translation = translator.config;
    // Language instruction is chosen when a native conversation is created.
    thread = null;
    await preferences.save();
    return result;
  },
  async testTranslation() {
    idle();
    if (!translator.config.enabled)
      throw new Error("Enable and save translation first.");
    starting = true;
    translationTest = new AbortController();
    try {
      const english = await translator.translate(
        "请解释这个函数，保留变量名，不要修改文件。",
        "input",
        translationTest.signal,
      );
      const chinese = await translator.translate(
        "I will explain the function without changing any files.",
        "output",
        translationTest.signal,
      );
      return { english, chinese };
    } finally {
      starting = false;
      translationTest = null;
    }
  },
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
    companion?.publish();
    return result;
  },
  async updateCharacter(profile) {
    idle();
    const result = await preferences.updateCharacter(profile);
    desktop.setCharacter(result.character);
    return result;
  },
  async removeCharacter({ id }) {
    idle();
    if (
      companion.busy ||
      companion.store.state.tasks.some(
        (t) =>
          t.characterId === id &&
          ["running", "queued", "waiting"].includes(t.status),
      )
    )
      throw Error("请先停止这个角色的对话或任务，再删除角色。");
    const result = await preferences.removeCharacter({ id });
    thread = null;
    desktop.setCharacter(result.character);
    companion.publish();
    return result;
  },
  async desktopControl(args) {
    return desktop.control(args);
  },
  async windowControl({ action, value } = {}) {
    if (action === "close") win.hide();
    else if (action === "minimize") win.minimize();
    else if (action === "alwaysOnTop") win.setAlwaysOnTop(!!value, "floating");
    else if (action === "passthrough") desktop.setPassthrough(value);
    else throw new Error("error.windowAction");
  },
  async bootstrap() {
    return {
      ...(await preferences.snapshot()),
      backend: backend(),
      codexModel: preferences.data.codexModel || { model: "", effort: "" },
      translation: translator.snapshot(),
      desktop: desktop.snapshot(),
      version: app.getVersion(),
      platform: process.platform,
      autoConnect: process.env.ANIME_CODEX_AUTOCONNECT !== "0",
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
      title:
        backend() === "claude"
          ? "Choose native Claude Code executable"
          : t("Pick official Codex executable"),
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
    preferences.data.lastWorkspaces = {
      ...preferences.data.lastWorkspaces,
      [backend()]: cwd,
    };
    await preferences.save();
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
const primaryInstance = app.requestSingleInstanceLock();
if (!primaryInstance) app.quit();
app.on("second-instance", () => {
  if (win && !win.isDestroyed()) {
    desktop?.expand();
    win.show();
    win.focus();
  }
});
if (primaryInstance)
  app.whenReady().then(async () => {
    app.dock?.setIcon(appIcon);
    studio = new CharacterStudio(
      path.join(app.getPath("userData"), "character-studio"),
      (params) => emit({ method: "client/studio", params }),
      () => ({
        model:
          companion?.store.state.settings.brainModel ||
          preferences?.data.codexModel?.model ||
          "",
        effort:
          companion?.store.state.settings.brainEffort ||
          preferences?.data.codexModel?.effort ||
          "",
      }),
    );
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
    translator = new TranslationService(app.getPath("userData"));
    await translator.load(preferences.data.translation);
    companion = await new Companion({
      directory: path.join(app.getPath("userData"), "companion"),
      preferences,
      emit,
      translator,
      shell,
    }).load();
    inputPulse = new InputPulse(
      path.join(app.getPath("userData"), "helpers"),
      (params) => emit({ method: "client/inputPulse", params }),
    );
    if (
      companion.store.state.settings.keyboard &&
      !companion.store.state.settings.quiet
    )
      inputPulse
        .start()
        .catch((e) =>
          emit({ method: "client/inputPulse", params: { error: e.message } }),
        );
    const area = screen.getPrimaryDisplay().workArea;
    const width = Math.min(1440, area.width),
      height = Math.min(950, area.height);
    win = new BrowserWindow({
      icon: appIcon,
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
            (c?.builtin
              ? c.localizedNames?.[preferences.data.language]
              : null) ||
            c?.name ||
            "Anime Codex"
          );
        },
      }),
    });
    desktop.resizeSurface();
    desktop.setCharacter(preferences.find(preferences.data.activeCharacter));
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    tray = new Tray(
      nativeImage.createFromPath(appIcon).resize({ width: 18, height: 18 }),
    );
    tray.setToolTip("Anime Companion");
    const showCompanion = () => {
      win.show();
      win.focus();
      win.setIgnoreMouseEvents(false);
      emit({ method: "client/inputRestored", params: {} });
    };
    const switchSurface = (surface) => {
      if (!appUrl) return;
      try {
        idle();
      } catch {
        showCompanion();
        void dialog.showMessageBox(win, {
          type: "info",
          message: "请先等待或停止工作台中的任务，再切换界面。",
        });
        return;
      }
      const next = new URL(appUrl);
      next.searchParams.delete("surface");
      if (surface === "workbench")
        next.searchParams.set("surface", "workbench");
      appUrl = next.href;
      void win
        .loadURL(appUrl)
        .then(() => {
          desktop.expand();
          showCompanion();
        })
        .catch((error) => {
          if (!win.isDestroyed())
            void dialog.showMessageBox(win, {
              type: "error",
              message: error.message,
            });
        });
    };
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: "唤出角色", click: showCompanion },
        { label: "桌面伙伴", click: () => switchSurface("companion") },
        { label: "编程工作台", click: () => switchSurface("workbench") },
        {
          label: "任务与聊天",
          click: () => {
            showCompanion();
            emit({ method: "client/openCompanion", params: { tab: "chat" } });
          },
        },
        { label: "暂时隐藏", click: () => win.hide() },
        { type: "separator" },
        { label: "退出角色应用", click: () => app.quit() },
      ]),
    );
    tray.on("click", showCompanion);
    app.on("activate", showCompanion);
    win.on("close", (e) => {
      if (!quitting) {
        e.preventDefault();
        win.hide();
      }
    });
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
    let url = dev
      ? "http://127.0.0.1:5173"
      : pathToFileURL(path.join(root, "dist/index.html")).href;
    if (process.env.ANIME_CODEX_SURFACE === "workbench") {
      const surface = new URL(url);
      surface.searchParams.set("surface", "workbench");
      url = surface.href;
    }
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
      if (target !== appUrl) e.preventDefault();
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
          [
            "studioProduce",
            "studioApply",
            "updateCharacter",
            "removeCharacter",
            "importActionImage",
          ].includes(name)
        )
          companion?.publish();
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
let flushingQuit = false;
app.on("before-quit", (event) => {
  speech.stop();
  quitting = true;
  inputPulse?.stop();
  translationTest?.abort();
  studio?.cancel();
  if (flushingQuit) return;
  event.preventDefault();
  flushingQuit = true;
  rpc?.close();
  // Persist interruption/completion before Electron terminates the main process.
  Promise.allSettled([rpc?.saveQueue, companion?.close()]).then(
    () => app.quit(),
    () => app.quit(),
  );
});
app.on("window-all-closed", () => {
  translationTest?.abort();
  studio?.cancel();
  background?.dispose();
  desktop?.dispose();
  globalShortcut.unregisterAll();
  rpc?.close();
  app.quit();
});
