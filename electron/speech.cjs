const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs/promises");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const os = require("node:os");
const languages = ["zh-CN", "en-US", "ja-JP"];
// Text is JSON on stdin, never interpolated into a shell command.
const windowsCommand = `$ErrorActionPreference='Stop'; [Console]::InputEncoding=New-Object System.Text.UTF8Encoding; [Console]::OutputEncoding=New-Object System.Text.UTF8Encoding; Add-Type -AssemblyName System.Speech; $s=New-Object System.Speech.Synthesis.SpeechSynthesizer; try { $p=[Console]::In.ReadToEnd() | ConvertFrom-Json; $voices=@($s.GetInstalledVoices() | Where-Object {$_.Enabled} | ForEach-Object { @{name=$_.VoiceInfo.Name;lang=$_.VoiceInfo.Culture.Name;gender=$_.VoiceInfo.Gender.ToString()} }); if ($p.mode -eq 'voices') { ConvertTo-Json -InputObject $voices -Compress; exit 0 }; $matched=@($voices | Where-Object {$_.lang.Split('-')[0] -eq $p.lang.Split('-')[0]}); if ($p.voice) {$v=$matched | Where-Object {$_.name -eq $p.voice} | Select-Object -First 1} else {$v=$matched | Where-Object {$_.lang -eq $p.lang -and $_.gender -eq 'Female'} | Select-Object -First 1; if (!$v) {$v=$matched | Where-Object {$_.gender -eq 'Female'} | Select-Object -First 1}; if (!$v) {$v=$matched | Select-Object -First 1}}; if (!$v) {throw ('No installed system voice for '+$p.lang)}; $s.SelectVoice($v.name); $s.SpeakSsml([string]$p.ssml); ConvertTo-Json -InputObject @{spoken=$true;voice=$v.name} -Compress } finally {$s.Dispose()}`;
class NativeSpeech {
  constructor(platform = process.platform) {
    this.platform = platform;
    this.child = null;
    this.directory = path.join(
      os.tmpdir(),
      "anime-codex-speech-" + process.arch,
    );
  }
  stop() {
    this.child?.kill();
    this.child = null;
  }
  run(executable, args, input) {
    this.stop();
    return new Promise((resolve, reject) => {
      const child = spawn(executable, args, {
        windowsHide: true,
        shell: false,
        stdio: ["pipe", "pipe", "pipe"],
      });
      this.child = child;
      let output = "",
        error = "";
      const timer = setTimeout(() => {
        child.kill();
        reject(Error("System speech timed out."));
      }, 120000);
      child.stdout.on("data", (b) => {
        output += b.toString();
      });
      child.stderr.on("data", (b) => {
        error = (error + b.toString()).slice(-2000);
      });
      child.stdin.on("error", () => {});
      child.on("error", (e) => {
        clearTimeout(timer);
        reject(e);
      });
      child.on("exit", (code) => {
        clearTimeout(timer);
        const cancelled = this.child !== child;
        if (!cancelled) this.child = null;
        if (cancelled) resolve({ cancelled: true });
        else if (code !== 0)
          reject(Error(error.trim() || "System speech stopped."));
        else resolve(output);
      });
      child.stdin.end(input);
    });
  }
  async windows(payload) {
    const result = await this.run(
      path.join(
        process.env.SystemRoot || "C:\\Windows",
        "System32/WindowsPowerShell/v1.0/powershell.exe",
      ),
      ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", windowsCommand],
      JSON.stringify(payload),
    );
    return typeof result === "string" ? JSON.parse(result) : result;
  }
  async mac(payload) {
    let executable =
      process.resourcesPath &&
      path.join(process.resourcesPath, "helpers/speech");
    try {
      if (!executable) throw Error();
      await fs.access(executable);
    } catch {
      executable = path.join(this.directory, "speech-v1");
      try {
        await fs.access(executable);
      } catch {
        this.compiling ||= (async () => {
          await fs.mkdir(this.directory, { recursive: true });
          const source = path.join(this.directory, "speech.swift");
          await fs.copyFile(
            path.join(__dirname, "native/speech.swift"),
            source,
          );
          await promisify(execFile)(
            "/usr/bin/swiftc",
            [source, "-O", "-o", executable],
            { timeout: 90000 },
          );
        })();
        await this.compiling;
      }
    }
    const result = await this.run(executable, [], JSON.stringify(payload));
    return typeof result === "string" ? JSON.parse(result) : result;
  }
  async voices() {
    if (this.platform === "win32") return this.windows({ mode: "voices" });
    if (this.platform !== "darwin")
      throw Error("System speech supports Windows and macOS.");
    return this.mac({ mode: "voices" });
  }
  async speak({ text, lang = "zh-CN", rate = 1, pitch = 1, voice = "" } = {}) {
    if (
      typeof text !== "string" ||
      !text.trim() ||
      text.length > 2000 ||
      !languages.includes(lang)
    )
      throw Error("Invalid speech request.");
    if (!Number.isFinite(rate) || rate < 0.5 || rate > 2)
      throw Error("Invalid speech rate.");
    if (
      !Number.isFinite(pitch) ||
      pitch < 0.8 ||
      pitch > 1.35 ||
      typeof voice !== "string" ||
      voice.length > 200
    )
      throw Error("Invalid speech pitch or voice.");
    if (this.platform === "win32")
      return this.windows({
        mode: "speak",
        text,
        lang,
        voice,
        ssml: speechMarkup(text, lang, rate, pitch),
      });
    if (this.platform !== "darwin")
      throw Error("System speech supports Windows and macOS.");
    return this.mac({ mode: "speak", text, lang, rate, pitch, voice });
  }
}
function speechMarkup(text, lang, rate, pitch) {
  const escaped = text
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "")
    .replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&apos;",
        })[c],
    );
  const shift = Math.round((pitch - 1) * 100);
  return (
    '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="' +
    lang +
    '"><prosody pitch="' +
    (shift >= 0 ? "+" : "") +
    shift +
    '%" rate="' +
    Math.round(rate * 100) +
    '%">' +
    escaped +
    "</prosody></speak>"
  );
}
module.exports = { NativeSpeech, speechMarkup };
