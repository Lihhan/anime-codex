const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const PHASES = require("../shared/actions.json");
const LANGUAGES = ["zh", "en", "ja"];
class Preferences {
  constructor(directory, nativeImage) {
    this.directory = directory;
    this.nativeImage = nativeImage;
    this.queue = Promise.resolve();
    this.data = {
      schemaVersion: 2,
      language: "zh",
      activeCharacter: null,
      characters: [],
      desktop: { scale: 1, autoHide: true },
    };
  }
  async load() {
    try {
      const saved = JSON.parse(
        await fs.readFile(
          path.join(this.directory, "preferences.json"),
          "utf8",
        ),
      );
      this.data = {
        ...this.data,
        ...saved,
        language: LANGUAGES.includes(saved.language) ? saved.language : "zh",
        desktop: { ...this.data.desktop, ...saved.desktop },
        characters: (Array.isArray(saved.characters) ? saved.characters : [])
          .filter(
            (c) =>
              c &&
              typeof c.id === "string" &&
              /^[a-f0-9-]{36}$/i.test(c.id) &&
              ["images", "sprite"].includes(c.renderer),
          )
          .map((c) =>
            c.renderer === "sprite"
              ? {
                  ...c,
                  renderer: "images",
                  images: {
                    idle: {
                      file: c.id + ".png",
                      width: c.width,
                      height: c.height,
                    },
                  },
                }
              : c,
          ),
      };
    } catch (e) {
      if (e.code !== "ENOENT")
        this.warning =
          "Preferences could not be loaded; defaults were restored.";
    }
    if (!this.find(this.data.activeCharacter)) this.data.activeCharacter = null;
    return this;
  }
  find(id) {
    return this.data.characters.find((c) => c.id === id);
  }
  async save() {
    const serialized = JSON.stringify(this.data, null, 2);
    this.queue = this.queue
      .catch(() => {})
      .then(async () => {
        await fs.mkdir(this.directory, { recursive: true });
        const file = path.join(this.directory, "preferences.json");
        await fs.writeFile(file + ".tmp", serialized);
        await fs.rename(file + ".tmp", file);
      });
    return this.queue;
  }
  async character(id = this.data.activeCharacter) {
    if (!id) return null;
    const c = this.find(id);
    if (!c) throw new Error("error.characterMissing");
    const images = {};
    for (const phase of PHASES) {
      const entry = c.images?.[phase];
      if (!entry) continue;
      if (!/^[a-f0-9-]{36}\.png$/i.test(entry.file))
        throw new Error("error.imageType");
      const png = await fs.readFile(
        path.join(this.directory, "characters", entry.file),
      );
      images[phase] = {
        width: entry.width,
        height: entry.height,
        src: "data:image/png;base64," + png.toString("base64"),
      };
    }
    return { ...c, images };
  }
  async snapshot() {
    return {
      language: this.data.language,
      character: await this.character(),
      characters: this.data.characters.map((c) => ({ id: c.id, name: c.name })),
      desktop: this.data.desktop,
      warning: this.warning,
    };
  }
  async decodeImage(file) {
    const stat = await fs.stat(file);
    if (!stat.isFile() || stat.size > 15 * 1024 * 1024)
      throw new Error("error.imageSize");
    const bytes = await fs.readFile(file);
    const png = bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
      webp =
        bytes.toString("ascii", 0, 4) === "RIFF" &&
        bytes.toString("ascii", 8, 12) === "WEBP";
    if ((!png && !jpeg && !webp) || (png && bytes.length < 24))
      throw new Error("error.imageType");
    if (png && (bytes.readUInt32BE(16) > 8192 || bytes.readUInt32BE(20) > 8192))
      throw new Error("error.imageDimensions");
    const image = this.nativeImage.createFromBuffer(bytes);
    if (image.isEmpty()) throw new Error("error.imageType");
    const { width, height } = image.getSize();
    if (!width || !height || width > 8192 || height > 8192)
      throw new Error("error.imageDimensions");
    const encoded = image.toPNG();
    if (encoded.length > 24 * 1024 * 1024) throw new Error("error.imageSize");
    return { width, height, encoded };
  }
  async importActionImage({ id = null, phase = "idle" } = {}, file) {
    if (!PHASES.includes(phase)) throw new Error("error.action");
    let c = id ? this.find(id) : null;
    if ((id && !c) || (!c && phase !== "idle"))
      throw new Error("error.characterMissing");
    const { width, height, encoded } = await this.decodeImage(file);
    const asset = randomUUID() + ".png";
    await fs.mkdir(path.join(this.directory, "characters"), {
      recursive: true,
    });
    await fs.writeFile(path.join(this.directory, "characters", asset), encoded);
    if (!c) {
      c = {
        id: randomUUID(),
        name: path.basename(file, path.extname(file)).slice(0, 80),
        persona:
          "You are a thoughtful programming companion. Speak naturally and clearly. Never invent tool calls, edits or test results. Report failures and uncertainty honestly.",
        renderer: "images",
        images: {},
        voice: { rate: 1, pitch: 1 },
      };
      this.data.characters.push(c);
    }
    c.images[phase] = { file: asset, width, height };
    if (phase === "idle") {
      c.width = width;
      c.height = height;
    }
    this.data.activeCharacter = c.id;
    await this.save();
    return this.snapshot();
  }
  async removeActionImage({ id, phase }) {
    const c = this.find(id);
    if (!c) throw new Error("error.characterMissing");
    if (!PHASES.includes(phase) || phase === "idle")
      throw new Error("error.action");
    delete c.images[phase];
    await this.save();
    return this.snapshot();
  }
  async updateCharacter({ id, name, persona }) {
    const c = this.find(id);
    if (!c) throw new Error("error.characterMissing");
    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.length > 80 ||
      typeof persona !== "string" ||
      persona.length > 12000
    )
      throw new Error("error.characterProfile");
    Object.assign(c, { name: name.trim(), persona });
    await this.save();
    return this.snapshot();
  }
  async selectCharacter(id) {
    if (!this.find(id)) throw new Error("error.characterMissing");
    this.data.activeCharacter = id;
    await this.save();
    return this.snapshot();
  }
  async setLanguage(language) {
    if (!LANGUAGES.includes(language)) throw new Error("error.language");
    this.data.language = language;
    await this.save();
    return { language };
  }
}
module.exports = { Preferences, PHASES, LANGUAGES };
