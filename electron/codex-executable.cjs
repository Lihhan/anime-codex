const fs = require("node:fs/promises");
const { constants } = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const MACH_O = new Set([
  "feedface",
  "cefaedfe",
  "feedfacf",
  "cffaedfe",
  "cafebabe",
  "bebafeca",
  "cafebabf",
  "bfbafeca",
]);
// Never invoke a shell, npm shim or project-relative executable.
async function isCodexExecutable(
  file,
  { platform = process.platform, fsApi = fs } = {},
) {
  const paths = platform === "win32" ? path.win32 : path.posix;
  if (!file || !paths.isAbsolute(file)) return false;
  if (platform === "win32" && !/\.exe$/i.test(file)) return false;
  if (!["win32", "darwin"].includes(platform)) return false;
  try {
    if (!(await fsApi.stat(file)).isFile()) return false;
    if (platform === "win32") return true;
    await fsApi.access(file, constants.X_OK);
    const handle = await fsApi.open(file, "r");
    try {
      const { buffer, bytesRead } = await handle.read(Buffer.alloc(4), 0, 4, 0);
      return bytesRead === 4 && MACH_O.has(buffer.toString("hex"));
    } finally {
      await handle.close();
    }
  } catch {
    return false;
  }
}
async function resolveCodex({
  explicit,
  saved,
  env = process.env,
  platform = process.platform,
  home = os.homedir(),
  fsApi = fs,
} = {}) {
  const valid = (file) => isCodexExecutable(file, { platform, fsApi });
  const configured = explicit || env.CODEX_PATH;
  if (configured) {
    if (await valid(configured)) return configured;
    throw new Error("error.codexNotFound");
  }
  if (await valid(saved)) return saved;
  const paths = platform === "darwin" ? path.posix : path;
  const environmentPath =
    Object.entries(env).find(([key]) => key.toLowerCase() === "path")?.[1] ||
    "";
  for (const entry of environmentPath.split(
    platform === "darwin" ? ":" : path.delimiter,
  )) {
    const directory = entry.replace(/^"|"$/g, "");
    if (!paths.isAbsolute(directory)) continue;
    const candidate = paths.join(
      directory,
      platform === "win32" ? "codex.exe" : "codex",
    );
    if (await valid(candidate)) return candidate;
  }
  if (platform === "darwin") {
    // Finder launches do not inherit an interactive shell's PATH.
    const candidates = [
      env.CODEX_INSTALL_DIR && paths.isAbsolute(env.CODEX_INSTALL_DIR)
        ? paths.join(env.CODEX_INSTALL_DIR, "codex")
        : null,
      paths.isAbsolute(home) ? paths.join(home, ".local/bin/codex") : null,
      "/opt/homebrew/bin/codex",
      "/usr/local/bin/codex",
      "/Applications/Codex.app/Contents/Resources/codex",
      "/Applications/ChatGPT.app/Contents/Resources/codex",
      paths.isAbsolute(home)
        ? paths.join(home, "Applications/Codex.app/Contents/Resources/codex")
        : null,
      paths.isAbsolute(home)
        ? paths.join(home, "Applications/ChatGPT.app/Contents/Resources/codex")
        : null,
    ];
    for (const candidate of candidates)
      if (await valid(candidate)) return candidate;
  }
  if (
    platform === "win32" &&
    env.LOCALAPPDATA &&
    path.isAbsolute(env.LOCALAPPDATA)
  ) {
    const standalone = path.join(
      env.LOCALAPPDATA,
      "Programs/OpenAI/Codex/bin/codex.exe",
    );
    if (await valid(standalone)) return standalone;
    const directory = path.join(env.LOCALAPPDATA, "OpenAI/Codex/bin");
    const candidates = [];
    try {
      for (const item of await fsApi.readdir(directory, {
        withFileTypes: true,
      })) {
        if (!item.isDirectory()) continue;
        const file = path.join(directory, item.name, "codex.exe");
        if (await valid(file))
          candidates.push({ file, modified: (await fsApi.stat(file)).mtimeMs });
      }
    } catch (error) {
      if (!["ENOENT", "EACCES", "EPERM"].includes(error.code)) throw error;
    }
    candidates.sort(
      (a, b) => b.modified - a.modified || a.file.localeCompare(b.file),
    );
    if (candidates.length) return candidates[0].file;
  }
  throw new Error("error.codexNotFound");
}
module.exports = { resolveCodex, isCodexExecutable };
