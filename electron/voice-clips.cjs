const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID, createHash } = require("node:crypto");
const actions = require("../shared/voice-actions.json");
const ID = /^[a-f0-9-]{36}$/i;
const FILE = /^[a-f0-9-]{36}\.(wav|mp3|ogg|flac|m4a)$/i;
const LIMIT = 8 * 1024 * 1024;
const hash = (b) => createHash("sha256").update(b).digest("hex");
function format(bytes) {
  if (bytes.length < 16) throw Error("音频文件太短或已损坏。");
  if (
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WAVE"
  )
    return ["wav", "audio/wav"];
  if (bytes.toString("ascii", 0, 4) === "OggS") return ["ogg", "audio/ogg"];
  if (bytes.toString("ascii", 0, 4) === "fLaC") return ["flac", "audio/flac"];
  if (bytes.toString("ascii", 4, 8) === "ftyp") return ["m4a", "audio/mp4"];
  if (
    bytes.toString("ascii", 0, 3) === "ID3" ||
    (bytes[0] === 255 && (bytes[1] & 0xe0) === 0xe0)
  )
    return ["mp3", "audio/mpeg"];
  throw Error("请选择有效的 WAV、MP3、OGG、FLAC 或 M4A 音频。");
}
function validTarget(id, action) {
  if (!ID.test(id || "") || !Object.hasOwn(actions, action))
    throw Error("无效的角色或语音动作。");
}
class VoiceClips {
  constructor(directory) {
    this.directory = directory;
    this.library = {};
    this.pending = new Map();
    this.queue = Promise.resolve();
    this.warning = "";
  }
  async load() {
    await fs.mkdir(this.directory, { recursive: true });
    const file = path.join(this.directory, "library.json");
    let raw;
    try {
      raw = await fs.readFile(file, "utf8");
      const saved = JSON.parse(raw);
      if (
        saved.version !== 1 ||
        !saved.characters ||
        typeof saved.characters !== "object"
      )
        throw Error("Invalid audio library");
      for (const [id, clips] of Object.entries(saved.characters)) {
        if (!ID.test(id) || !clips || typeof clips !== "object")
          throw Error("Invalid audio character");
        for (const [action, c] of Object.entries(clips)) {
          validTarget(id, action);
          if (
            !FILE.test(c?.file || "") ||
            typeof c.name !== "string" ||
            ![
              "audio/wav",
              "audio/mpeg",
              "audio/ogg",
              "audio/flac",
              "audio/mp4",
            ].includes(c.mime) ||
            !Number.isFinite(c.duration) ||
            c.duration <= 0 ||
            c.duration > 45 ||
            !Number.isInteger(c.bytes) ||
            c.bytes < 16 ||
            c.bytes > LIMIT ||
            !/^[a-f0-9]{64}$/.test(c.sha256 || "")
          )
            throw Error("Invalid audio metadata");
        }
      }
      this.library = saved.characters;
    } catch (e) {
      if (e.code !== "ENOENT") {
        if (raw)
          await fs.writeFile(
            path.join(
              this.directory,
              "library-recovery-" + randomUUID() + ".json",
            ),
            raw,
            { mode: 0o600 },
          );
        this.warning =
          "语音库无法读取，原始配置已保留为恢复副本。请重新上传或恢复备份。";
      }
    }
    return this;
  }
  snapshot(id) {
    return ID.test(id || "") ? structuredClone(this.library[id] || {}) : {};
  }
  async prepare({ characterId, action }, file) {
    validTarget(characterId, action);
    const stat = await fs.lstat(file);
    if (
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      stat.size < 16 ||
      stat.size > LIMIT
    )
      throw Error("请上传 8 MB 以内的普通音频文件。");
    const bytes = await fs.readFile(file),
      [extension, mime] = format(bytes),
      token = randomUUID();
    if (bytes.length > LIMIT) throw Error("请上传 8 MB 以内的音频。");
    for (const [id, p] of this.pending)
      if (Date.now() - p.time > 180000) this.pending.delete(id);
    while (this.pending.size >= 4)
      this.pending.delete(this.pending.keys().next().value);
    const entry = {
      characterId,
      action,
      bytes,
      extension,
      mime,
      name: path.basename(file).slice(0, 120),
      time: Date.now(),
    };
    this.pending.set(token, entry);
    return {
      token,
      name: entry.name,
      mime,
      bytes: bytes.length,
      src: "data:" + mime + ";base64," + bytes.toString("base64"),
    };
  }
  commit({ token, duration }) {
    const pending = this.pending.get(token);
    this.pending.delete(token);
    if (!pending || Date.now() - pending.time > 180000)
      throw Error("上传已过期，请重新选择音频。");
    if (!Number.isFinite(duration) || duration <= 0 || duration > 45)
      throw Error("动作语音须在 45 秒以内。");
    return this.enqueue(async () => {
      const { characterId: id, action, bytes, extension, mime, name } = pending;
      const file = randomUUID() + "." + extension;
      await fs.writeFile(path.join(this.directory, file), bytes, {
        mode: 0o600,
      });
      const old = this.library[id],
        entry = {
          file,
          mime,
          name,
          bytes: bytes.length,
          duration,
          sha256: hash(bytes),
        };
      this.library[id] = { ...old, [action]: entry };
      try {
        await this.save();
      } catch (e) {
        if (old) this.library[id] = old;
        else delete this.library[id];
        await fs.unlink(path.join(this.directory, file)).catch(() => {});
        throw e;
      }
      const replaced = old?.[action]?.file;
      if (
        replaced &&
        !Object.values(this.library).some((clips) =>
          Object.values(clips).some((c) => c.file === replaced),
        )
      )
        await fs.unlink(path.join(this.directory, replaced)).catch(() => {});
      return this.snapshot(id);
    });
  }
  async source({ characterId, action }) {
    validTarget(characterId, action);
    const clip = this.library[characterId]?.[action];
    if (!clip) return null;
    if (!FILE.test(clip.file)) throw Error("无效的音频路径。");
    const file = path.join(this.directory, clip.file),
      stat = await fs.lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > LIMIT)
      throw Error("音频副本不可用，请重新上传。");
    const bytes = await fs.readFile(file),
      [, mime] = format(bytes);
    if (hash(bytes) !== clip.sha256 || mime !== clip.mime)
      throw Error("音频副本已变化，请重新上传。");
    return {
      src: "data:" + mime + ";base64," + bytes.toString("base64"),
      duration: clip.duration,
      name: clip.name,
    };
  }
  remove({ characterId, action }) {
    validTarget(characterId, action);
    return this.enqueue(async () => {
      const old = this.library[characterId],
        clip = old?.[action];
      if (!clip) return this.snapshot(characterId);
      if (!FILE.test(clip.file)) throw Error("无效的音频路径。");
      const next = { ...old };
      delete next[action];
      this.library[characterId] = next;
      try {
        await this.save();
      } catch (e) {
        this.library[characterId] = old;
        throw e;
      }
      const used = Object.values(this.library).some((clips) =>
        Object.values(clips).some((c) => c.file === clip.file),
      );
      if (!used)
        try {
          await fs.unlink(path.join(this.directory, clip.file));
        } catch (e) {
          if (e.code !== "ENOENT") throw e;
        }
      return this.snapshot(characterId);
    });
  }
  enqueue(fn) {
    this.queue = this.queue.catch(() => {}).then(fn);
    return this.queue;
  }
  async save() {
    const file = path.join(this.directory, "library.json");
    await fs.writeFile(
      file + ".tmp",
      JSON.stringify({ version: 1, characters: this.library }, null, 2),
      { mode: 0o600 },
    );
    await fs.rename(file + ".tmp", file);
  }
}
module.exports = { VoiceClips, format };
