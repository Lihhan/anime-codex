const fs = require("node:fs/promises");
const path = require("node:path");
const { spawn, execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { createInterface } = require("node:readline");
class InputPulse {
  constructor(directory, notify) {
    this.directory = directory;
    this.notify = notify;
    this.child = null;
    this.generation = 0;
  }
  async start() {
    if (this.child) return;
    if (process.platform !== "darwin")
      throw Error("全局键鼠节奏目前支持 macOS。");
    const generation = ++this.generation;
    await fs.mkdir(this.directory, { recursive: true });
    const executable = path.join(this.directory, "input-pulse-v1");
    try {
      await fs.access(executable);
    } catch {
      const source = path.join(this.directory, "input-pulse.swift");
      await fs.copyFile(
        path.join(__dirname, "native/input-pulse.swift"),
        source,
      );
      await promisify(execFile)(
        "/usr/bin/swiftc",
        [source, "-O", "-o", executable],
        { timeout: 60000 },
      );
    }
    if (generation !== this.generation) return;
    const child = spawn(executable, [], {
      stdio: ["ignore", "pipe", "ignore"],
    });
    this.child = child;
    child.on("error", (e) => this.notify({ error: e.message }));
    child.on("exit", () => {
      if (this.child === child) this.child = null;
    });
    createInterface({ input: child.stdout }).on("line", (line) => {
      try {
        const v = JSON.parse(line);
        this.notify({
          keys: Math.min(100, Number(v.keys) || 0),
          clicks: Math.min(20, Number(v.clicks) || 0),
        });
      } catch {}
    });
  }
  stop() {
    this.generation++;
    this.child?.kill();
    this.child = null;
  }
}
module.exports = { InputPulse };
