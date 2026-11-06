const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
class CompanionStore {
  constructor(directory) {
    this.directory = directory;
    this.queue = Promise.resolve();
    this.messages = [];
    this.isNew = true;
    this.state = {
      version: 1,
      summaries: {},
      memories: [],
      tasks: [],
      meals: [],
      settings: {
        wander: false,
        lockPosition: true,
        collapseOnBlur: true,
        proactive: true,
        quiet: false,
        voice: false,
        voiceVolume: 0.75,
        cursor: true,
        keyboard: false,
        autoDispatch: true,
        brainModel: "",
        brainEffort: "low",
        executor: "codex",
        workspace: "",
        taskModel: "",
        taskEffort: "",
      },
      life: { affection: 0, games: 0 },
    };
  }
  async load() {
    await fs.mkdir(this.directory, { recursive: true, mode: 0o700 });
    try {
      const saved = JSON.parse(
        await fs.readFile(path.join(this.directory, "state.json"), "utf8"),
      );
      this.isNew = false;
      if (saved.settings?.lockPosition === undefined) {
        saved.settings ||= {};
        saved.settings.lockPosition = true;
        saved.settings.wander = false;
      }
      this.state = {
        ...this.state,
        ...saved,
        settings: { ...this.state.settings, ...saved.settings },
      };
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    try {
      const lines = (
        await fs.readFile(path.join(this.directory, "history.jsonl"), "utf8")
      ).split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        try {
          this.messages.push(JSON.parse(lines[i]));
        } catch (e) {
          if (i < lines.length - 2) throw e;
          await fs.writeFile(
            path.join(this.directory, "history.jsonl"),
            this.messages.map((m) => JSON.stringify(m)).join("\n") + "\n",
            { mode: 0o600 },
          );
        }
      }
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    if (this.state.settings.lockPosition === undefined)
      this.state.settings.lockPosition = true;
    for (const key of ["voiceStyle", "voiceName", "voiceRate", "voicePitch"])
      delete this.state.settings[key];
    if (
      !Number.isFinite(this.state.settings.voiceVolume) ||
      this.state.settings.voiceVolume < 0 ||
      this.state.settings.voiceVolume > 1
    )
      this.state.settings.voiceVolume = 0.75;
    for (const t of this.state.tasks)
      if (["running", "queued", "waiting"].includes(t.status)) {
        t.status = "interrupted";
        t.error = "应用上次退出，执行已中断。检查现有结果后可继续原线程。";
      }
    await this.save();
    return this;
  }
  enqueue(action) {
    const next = this.queue.then(action);
    this.queue = next.catch(() => {});
    return next;
  }
  save() {
    const data = JSON.stringify(this.state, null, 2);
    return this.enqueue(async () => {
      const file = path.join(this.directory, "state.json");
      await fs.writeFile(file + ".tmp", data, { mode: 0o600 });
      await fs.rename(file + ".tmp", file);
    });
  }
  async addMessage(role, text, extra = {}) {
    const m = {
      id: randomUUID(),
      role,
      text,
      time: new Date().toISOString(),
      ...extra,
    };
    await this.enqueue(() =>
      fs.appendFile(
        path.join(this.directory, "history.jsonl"),
        JSON.stringify(m) + "\n",
        { mode: 0o600 },
      ),
    );
    this.messages.push(m);
    return m;
  }
  history(characterId, query = "", before = null, limit = 60) {
    let list = this.messages.filter((m) => m.characterId === characterId);
    if (query)
      list = list.filter((m) =>
        m.text.toLowerCase().includes(query.toLowerCase()),
      );
    if (before) {
      const n = list.findIndex((m) => m.id === before);
      if (n >= 0) list = list.slice(0, n);
    }
    return list.slice(-limit);
  }
  context(characterId, query) {
    const own = this.messages.filter((m) => m.characterId === characterId),
      recent = own.slice(-18);
    const terms = [
      ...new Set(
        (
          query.toLowerCase().match(/[a-z0-9_]{3,}|[\u4e00-\u9fff]{2,}/g) || []
        ).flatMap((t) =>
          /^[\u4e00-\u9fff]+$/.test(t)
            ? [
                t,
                ...Array.from({ length: Math.max(0, t.length - 1) }, (_, i) =>
                  t.slice(i, i + 2),
                ),
              ]
            : [t],
        ),
      ),
    ];
    const recalled = own
      .slice(0, -18)
      .map((m) => ({
        m,
        score: terms.reduce(
          (n, t) => n + (m.text.toLowerCase().includes(t) ? 1 : 0),
          0,
        ),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((x) => x.m);
    return {
      summary: this.state.summaries?.[characterId] || null,
      memories: this.state.memories
        .filter(
          (m) =>
            (m.characterId === characterId || m.global) &&
            m.status === "confirmed",
        )
        .slice(-60),
      recalled: recalled.map((m) => ({ ...m, text: m.text.slice(0, 2500) })),
      recent: recent.map((m) => ({ ...m, text: m.text.slice(-6000) })),
    };
  }
  async memory({
    id,
    text,
    characterId,
    global = false,
    status = "confirmed",
    sourceId = null,
  }) {
    if (typeof text !== "string" || !text.trim() || text.length > 2000)
      throw Error("记忆需为 1–2000 字。");
    const old = this.state.memories.find((m) => m.id === id);
    if (id && !old) throw Error("记忆不存在。");
    const m = {
      id: old?.id || randomUUID(),
      text: text.trim(),
      characterId,
      global: !!global,
      status,
      sourceId: old?.sourceId || sourceId,
      updatedAt: new Date().toISOString(),
    };
    if (old) Object.assign(old, m);
    else this.state.memories.push(m);
    await this.save();
    return m;
  }
}
module.exports = { CompanionStore };
