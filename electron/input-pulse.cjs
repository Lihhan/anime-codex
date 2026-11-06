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
    if (process.platform === "win32") return this.startWindows();
    if (process.platform !== "darwin")
      throw Error("全局键鼠节奏支持 Windows 和 macOS。");
    const generation = ++this.generation;
    await fs.mkdir(this.directory, { recursive: true });
    let executable = path.join(this.directory, "input-pulse-v1");
    const bundled =
      process.resourcesPath &&
      path.join(process.resourcesPath, "helpers/input-pulse");
    if (bundled) {
      try {
        await fs.access(bundled);
        executable = bundled;
      } catch {}
    }
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
  async startWindows() {
    const generation = ++this.generation;
    const source = path.join(
      __dirname.replace(/app\.asar([\\/])/, "app.asar.unpacked$1"),
      "native/input-pulse.cs",
    );
    const executable = path.join(
      process.env.SystemRoot || "C:\\Windows",
      "System32/WindowsPowerShell/v1.0/powershell.exe",
    );
    // The source path is quoted as a PowerShell literal, never as executable code.
    const command =
      "$ErrorActionPreference='Stop'; Add-Type -LiteralPath '" +
      source.replace(/'/g, "''") +
      "'; [AnimeInputPulse]::Run()";
    const child = spawn(
      executable,
      ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", command],
      {
        windowsHide: true,
        shell: false,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    this.child = child;
    await new Promise((resolve, reject) => {
      let ready = false;
      const fail = (error) => {
        clearTimeout(timer);
        if (this.child === child) this.child = null;
        child.kill();
        if (!ready) reject(error);
        else this.notify({ error: error.message });
      };
      const timer = setTimeout(
        () => fail(Error("Windows input counter startup timed out.")),
        15000,
      );
      child.once("error", fail);
      child.once("exit", (code) => {
        clearTimeout(timer);
        if (this.child === child) this.child = null;
        if (!ready)
          reject(
            Error(
              "Windows input counter stopped before it was ready (" +
                code +
                ").",
            ),
          );
      });
      // Compiler/startup diagnostics are not input data and are not persisted.
      child.stderr.on("data", () => {});
      createInterface({ input: child.stdout }).on("line", (line) => {
        let value;
        try {
          value = JSON.parse(line);
        } catch {
          return;
        }
        if (value.ready) {
          clearTimeout(timer);
          if (generation !== this.generation)
            return fail(Error("Input counter startup was cancelled."));
          ready = true;
          resolve();
          return;
        }
        if (ready)
          this.notify({
            keys: Math.max(0, Math.min(100, Number(value.keys) || 0)),
            clicks: Math.max(0, Math.min(20, Number(value.clicks) || 0)),
          });
      });
    });
  }
  stop() {
    this.generation++;
    this.child?.kill();
    this.child = null;
  }
}
module.exports = { InputPulse };
