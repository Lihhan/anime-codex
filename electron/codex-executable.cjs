const fs = require("node:fs/promises");
const path = require("node:path");

async function exists(file) {
  if (!file || !path.isAbsolute(file) || !/\.exe$/i.test(file)) return false;
  try {
    return (await fs.stat(file)).isFile();
  } catch {
    return false;
  }
}

// Always launch a native absolute executable, never a shell or npm .cmd wrapper.
async function resolveCodex({ explicit, saved, env = process.env } = {}) {
  const configured = explicit || env.CODEX_PATH;
  if (configured) {
    if (await exists(configured)) return configured;
    throw new Error("error.codexNotFound");
  }
  if (await exists(saved)) return saved;
  const environmentPath =
    Object.entries(env).find(([key]) => key.toLowerCase() === "path")?.[1] ||
    "";
  for (const entry of environmentPath.split(path.delimiter)) {
    const directory = entry.replace(/^"|"$/g, "");
    if (!path.isAbsolute(directory)) continue;
    const candidate = path.join(directory, "codex.exe");
    if (await exists(candidate)) return candidate;
  }
  if (env.LOCALAPPDATA && path.isAbsolute(env.LOCALAPPDATA)) {
    const directory = path.join(env.LOCALAPPDATA, "OpenAI", "Codex", "bin");
    const candidates = [];
    try {
      for (const item of await fs.readdir(directory, { withFileTypes: true })) {
        if (!item.isDirectory()) continue;
        const file = path.join(directory, item.name, "codex.exe");
        if (await exists(file))
          candidates.push({ file, modified: (await fs.stat(file)).mtimeMs });
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
module.exports = { resolveCodex };
