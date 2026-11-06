const important = new Set(["approval", "success", "failure", "interrupted"]);
export class ClipPlayer {
  constructor({
    source,
    createAudio,
    now = Date.now,
    onError = () => {},
    onStatus = () => {},
  }) {
    Object.assign(this, { source, createAudio, now, onError, onStatus });
    this.generation = 0;
    this.played = new Set();
    this.lastAt = -Infinity;
    this.lastIdle = -Infinity;
    this.config = {};
    this.priority = 0;
  }
  configure(config) {
    const changed = this.config.id !== config.id;
    if (
      changed ||
      (this.config.enabled && !config.enabled) ||
      config.quiet ||
      config.volume === 0
    )
      this.stop();
    if (changed) {
      this.played.clear();
      this.lastAt = -Infinity;
      this.lastIdle = -Infinity;
    }
    this.config = config;
    if (this.audio) this.audio.volume = Math.max(0, Math.min(1, config.volume));
  }
  stop() {
    this.generation++;
    this.priority = 0;
    if (this.audio) {
      this.audio.pause();
      this.audio.removeAttribute?.("src");
      this.audio.load?.();
      this.audio = null;
    }
    this.onStatus(null);
  }
  suspend() {
    this.suspended = true;
    this.stop();
  }
  resume() {
    this.suspended = false;
  }
  async play(action, { preview = false, key } = {}) {
    const c = this.config,
      now = this.now();
    if (
      this.suspended ||
      !c.id ||
      c.quiet ||
      c.volume === 0 ||
      (!preview && !c.enabled) ||
      !c.clips?.[action]
    )
      return false;
    const priority = preview ? 100 : important.has(action) ? 10 : 1;
    if (!preview) {
      if (key && this.played.has(key)) return false;
      if (priority < 10 && now - this.lastAt < 2500) return false;
      if (action === "idle" && now - this.lastIdle < 120000) return false;
      if (this.priority >= priority && this.priority > 0) return false;
    }
    this.stop();
    this.priority = priority;
    const generation = this.generation;
    if (key) this.played.add(key);
    if (this.played.size > 400)
      this.played.delete(this.played.values().next().value);
    this.lastAt = now;
    if (action === "idle") this.lastIdle = now;
    try {
      const clip = await this.source({ id: c.id, action });
      if (generation !== this.generation || !clip) return false;
      const audio = this.createAudio(clip.src);
      this.audio = audio;
      audio.volume = c.volume;
      audio.loop = false;
      audio.onended = () => {
        if (this.audio === audio) this.stop();
      };
      audio.onerror = () => {
        if (this.audio === audio) {
          this.stop();
          this.onError("无法播放这个音频，请替换为本机支持的格式。");
        }
      };
      await audio.play();
      if (generation !== this.generation) {
        audio.pause();
        return false;
      }
      this.onStatus(action);
      return true;
    } catch (e) {
      if (generation === this.generation) {
        this.stop();
        this.onError(e.message || "音频播放失败。");
      }
      return false;
    } finally {
      if (generation === this.generation && !this.audio) this.priority = 0;
    }
  }
}
