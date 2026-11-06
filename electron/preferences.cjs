const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { PNG } = require("pngjs");
const { assertForeground } = require("../shared/background-math.cjs");
const PHASES = require("../shared/actions.json");
const LANGUAGES = ["zh", "en", "ja"];
class Preferences {
  constructor(directory, nativeImage, processBackground, builtin = null) {
    this.directory = directory;
    this.nativeImage = nativeImage;
    this.processBackground = processBackground;
    this.builtin = builtin;
    this.queue = Promise.resolve();
    this.data = {
      schemaVersion: 2,
      language: "zh",
      activeCharacter: null,
      characters: [],
      desktop: { scale: 1, autoHide: true },
      backgroundRemoval: { automatic: false },
      interface: { fontSize: 18, interactions: true },
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
        interface: {
          fontSize:
            Number.isInteger(saved.interface?.fontSize) &&
            saved.interface.fontSize >= 14 &&
            saved.interface.fontSize <= 24
              ? saved.interface.fontSize
              : 18,
          interactions: saved.interface?.interactions !== false,
        },
        backgroundRemoval: {
          automatic: saved.backgroundRemoval?.automatic === true,
        },
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
    await this.ensureBuiltin();
    const recovered = await this.recoverEmptyCutouts();
    if (!this.find(this.data.activeCharacter))
      this.data.activeCharacter = this.builtin?.profile.id || null;
    if (this.builtin || recovered) await this.save();
    return this;
  }
  async ensureBuiltin() {
    if (!this.builtin) return;
    const { profile, directory } = this.builtin;
    const existing = this.find(profile.id);
    const sources = {};
    let pristine =
      !!existing &&
      existing.name === profile.name &&
      existing.persona === profile.persona &&
      existing.width === profile.width &&
      existing.height === profile.height;
    for (const [phase, name] of Object.entries(profile.files)) {
      if (!PHASES.includes(phase) || !/^[a-z]+\.png$/.test(name))
        throw new Error("error.imageType");
      sources[phase] = await fs.readFile(path.join(directory, name));
      if (existing)
        try {
          const entry = existing.images?.[phase];
          if (
            !entry ||
            entry.width !== profile.width ||
            entry.height !== profile.height ||
            entry.backgroundRemoved ||
            !(await fs.readFile(this.assetPath(entry.file))).equals(
              sources[phase],
            )
          )
            pristine = false;
        } catch {
          pristine = false;
        }
    }
    if (pristine) return;
    if (existing) {
      const previousActive = this.data.activeCharacter,
        wasActive = previousActive === existing.id;
      const copy = this.editable(existing);
      if (!wasActive) this.data.activeCharacter = previousActive;
      // Preserve old modifications before restoring the bundled template.
      for (const phase of Object.keys(copy.images || {}))
        try {
          await fs.access(this.assetPath(copy.images[phase].file));
        } catch {
          delete copy.images[phase];
        }
    }
    const images = {};
    await fs.mkdir(path.join(this.directory, "characters"), {
      recursive: true,
    });
    for (const [phase, name] of Object.entries(profile.files)) {
      if (!PHASES.includes(phase) || !/^[a-z]+\.png$/.test(name))
        throw new Error("error.imageType");
      const file = randomUUID() + ".png";
      await fs.copyFile(path.join(directory, name), this.assetPath(file));
      images[phase] = { file, width: profile.width, height: profile.height };
    }
    const factory = {
      id: profile.id,
      builtin: "rin",
      name: profile.name,
      localizedNames: profile.localizedNames,
      persona: profile.persona,
      renderer: "images",
      width: profile.width,
      height: profile.height,
      voice: profile.voice,
      assetLicense: profile.assetLicense,
      images,
    };
    if (existing) {
      for (const c of this.data.characters)
        if (c.templateSource === "rin" && !c.images.idle)
          c.images.idle = structuredClone(images.idle);
      Object.assign(existing, factory);
    } else this.data.characters.unshift(factory);
  }
  editable(character) {
    if (!this.builtin || character.id !== this.builtin.profile.id)
      return character;
    const copy = structuredClone(character);
    copy.id = randomUUID();
    copy.templateSource = "rin";
    copy.images ||= {};
    copy.name = { zh: "凛 · 自定义", en: "Rin · Custom", ja: "凛 · カスタム" }[
      this.data.language
    ];
    delete copy.builtin;
    delete copy.localizedNames;
    this.data.characters.push(copy);
    this.data.activeCharacter = copy.id;
    return copy;
  }
  find(id) {
    return this.data.characters.find((c) => c.id === id);
  }
  async recoverEmptyCutouts() {
    let recovered = 0;
    for (const character of this.data.characters)
      for (const entry of Object.values(character.images || {})) {
        if (!entry.backgroundRemoved || !entry.originalFile) continue;
        try {
          const original = PNG.sync.read(
            await fs.readFile(this.assetPath(entry.originalFile)),
          );
          const output = PNG.sync.read(
            await fs.readFile(this.assetPath(entry.file)),
          );
          if (
            original.width !== output.width ||
            original.height !== output.height
          )
            continue;
          try {
            assertForeground(original, output);
          } catch (error) {
            if (error.message !== "error.bgNoForeground") throw error;
            entry.file = entry.originalFile;
            entry.backgroundRemoved = false;
            recovered++;
          }
        } catch {
          /* A missing or damaged asset must not prevent other profiles loading. */
        }
      }
    return recovered;
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
        backgroundRemoved: entry.backgroundRemoved === true,
        canRestore:
          entry.backgroundRemoved === true &&
          /^[a-f0-9-]{36}\.png$/i.test(entry.originalFile || ""),
      };
    }
    return { ...c, images };
  }
  async snapshot() {
    return {
      language: this.data.language,
      character: await this.character(),
      characters: this.data.characters.map((c) => ({
        id: c.id,
        name: c.name,
        builtin: c.builtin,
        localizedNames: c.localizedNames,
      })),
      desktop: this.data.desktop,
      warning: this.warning,
      backgroundRemoval: this.data.backgroundRemoval,
      interface: this.data.interface,
      builtinCharacterId: this.builtin?.profile.id,
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
    let entry = { file: asset, width, height };
    if (this.data.backgroundRemoval.automatic) {
      const cutout = await this.processCutout(encoded, width, height),
        processed = randomUUID() + ".png";
      await fs.writeFile(
        path.join(this.directory, "characters", processed),
        cutout,
      );
      entry = {
        ...entry,
        file: processed,
        originalFile: asset,
        backgroundRemoved: true,
      };
    }
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
    c = this.editable(c);
    c.images[phase] = entry;
    if (phase === "idle") {
      c.width = width;
      c.height = height;
    }
    this.data.activeCharacter = c.id;
    await this.save();
    return this.snapshot();
  }
  async removeActionImage({ id, phase }) {
    let c = this.find(id);
    if (!c) throw new Error("error.characterMissing");
    if (!PHASES.includes(phase) || phase === "idle")
      throw new Error("error.action");
    c = this.editable(c);
    delete c.images[phase];
    await this.save();
    return this.snapshot();
  }
  async processCutout(bytes, width, height) {
    if (!this.processBackground) throw new Error("error.bgUnavailable");
    const output = Buffer.from(await this.processBackground(bytes));
    if (
      output.length < 24 ||
      output.length > 24 * 1024 * 1024 ||
      !output
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      output.readUInt32BE(16) !== width ||
      output.readUInt32BE(20) !== height
    )
      throw new Error("error.bgInference");
    return output;
  }
  actionEntry(id, phase) {
    const c = this.find(id);
    if (!c) throw new Error("error.characterMissing");
    if (!PHASES.includes(phase) || !c.images[phase])
      throw new Error("error.action");
    return c.images[phase];
  }
  assetPath(file) {
    if (!/^[a-f0-9-]{36}\.png$/i.test(file || ""))
      throw new Error("error.imageType");
    return path.join(this.directory, "characters", file);
  }
  async removeBackground({ id, phase }) {
    const entry = this.actionEntry(id, phase),
      originalFile = entry.originalFile || entry.file,
      bytes = await fs.readFile(this.assetPath(originalFile)),
      cutout = await this.processCutout(bytes, entry.width, entry.height),
      file = randomUUID() + ".png";
    await fs.writeFile(this.assetPath(file), cutout);
    const c = this.editable(this.find(id));
    Object.assign(c.images[phase], {
      file,
      originalFile,
      backgroundRemoved: true,
    });
    await this.save();
    return this.snapshot();
  }
  async restoreOriginal({ id, phase }) {
    const entry = this.actionEntry(id, phase);
    if (!entry.originalFile) throw new Error("error.bgNoOriginal");
    await fs.access(this.assetPath(entry.originalFile));
    Object.assign(entry, {
      file: entry.originalFile,
      backgroundRemoved: false,
    });
    await this.save();
    return this.snapshot();
  }
  async setBackgroundOptions({ automatic }) {
    if (typeof automatic !== "boolean") throw new Error("error.bgOptions");
    this.data.backgroundRemoval = { automatic };
    await this.save();
    return { backgroundRemoval: this.data.backgroundRemoval };
  }
  async updateCharacter({ id, name, persona }) {
    let c = this.find(id);
    if (!c) throw new Error("error.characterMissing");
    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.length > 80 ||
      typeof persona !== "string" ||
      persona.length > 12000
    )
      throw new Error("error.characterProfile");
    if (c.name !== name.trim() || c.persona !== persona) c = this.editable(c);
    Object.assign(c, {
      name:
        c.id !== id && name.trim() === this.builtin?.profile.name
          ? c.name
          : name.trim(),
      persona,
    });
    await this.save();
    return this.snapshot();
  }
  async selectCharacter(id) {
    if (id === this.builtin?.profile.id) await this.ensureBuiltin();
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
  async setInterface(options) {
    if (
      !options ||
      (options.fontSize !== undefined &&
        (!Number.isInteger(options.fontSize) ||
          options.fontSize < 14 ||
          options.fontSize > 24)) ||
      (options.interactions !== undefined &&
        typeof options.interactions !== "boolean")
    )
      throw new Error("error.interface");
    this.data.interface = {
      ...this.data.interface,
      ...(options.fontSize !== undefined ? { fontSize: options.fontSize } : {}),
      ...(options.interactions !== undefined
        ? { interactions: options.interactions }
        : {}),
    };
    await this.save();
    return { interface: this.data.interface };
  }
}
module.exports = { Preferences, PHASES, LANGUAGES };
