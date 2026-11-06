const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const path = require("node:path");
const os = require("node:os");
const { isCodexExecutable } = require("./codex-executable.cjs");
const execute = promisify(execFile);

async function loginEnvironment({
  env = process.env,
  platform = process.platform,
  run = execute,
} = {}) {
  if (platform === "win32") return { ...env };
  const shell = env.SHELL || (platform === "darwin" ? "/bin/zsh" : "/bin/bash");
  if (!path.isAbsolute(shell))
    throw new Error("The login shell must have an absolute path.");
  // Recover the same exported environment as a newly opened login terminal.
  // Never print this output: it can contain authentication and proxy credentials.
  const marker = "ANIME_CLAUDE_ENV_START\0";
  const { stdout } = await run(
    shell,
    ["-ilc", "printf 'ANIME_CLAUDE_ENV_START\\0'; /usr/bin/env -0"],
    {
      env: { ...env },
      cwd: os.homedir(),
      timeout: 15000,
      maxBuffer: 4 * 1024 * 1024,
      encoding: "utf8",
    },
  );
  const offset = stdout.indexOf(marker);
  if (offset < 0)
    throw new Error("Could not read the login-shell environment.");
  const result = {};
  for (const entry of stdout.slice(offset + marker.length).split("\0")) {
    const i = entry.indexOf("=");
    if (i > 0 && /^[A-Za-z_][A-Za-z0-9_]*$/.test(entry.slice(0, i)))
      result[entry.slice(0, i)] = entry.slice(i + 1);
  }
  if (!result.HOME) throw new Error("The login shell did not supply HOME.");
  return result;
}
async function resolveClaude({
  explicit,
  saved,
  env = process.env,
  platform = process.platform,
  fsApi,
} = {}) {
  const paths = platform === "win32" ? path.win32 : path.posix;
  const name = platform === "win32" ? "claude.exe" : "claude";
  const environmentPath =
    Object.entries(env).find(([key]) => key.toLowerCase() === "path")?.[1] ||
    "";
  const candidates = explicit
    ? [explicit]
    : [
        env.CLAUDE_PATH,
        saved,
        ...environmentPath
          .split(platform === "win32" ? ";" : ":")
          .map((p) => p.replace(/^"|"$/g, ""))
          .filter(paths.isAbsolute)
          .map((p) => paths.join(p, name)),
        paths.join(
          env.USERPROFILE || env.HOME || os.homedir(),
          ".local",
          "bin",
          name,
        ),
        "/opt/homebrew/bin/claude",
        "/usr/local/bin/claude",
      ];
  for (const file of candidates)
    if (
      await isCodexExecutable(file, { platform, ...(fsApi ? { fsApi } : {}) })
    )
      return file;
  throw new Error(
    "Native Claude Code executable not found. Install Claude Code or select its executable in Settings.",
  );
}
function claudeArguments(record) {
  const args = [
    "--print",
    "--verbose",
    "--input-format",
    "stream-json",
    "--output-format",
    "stream-json",
    "--include-partial-messages",
    "--permission-prompt-tool",
    "stdio",
  ];
  args.push(record.started ? "--resume" : "--session-id", record.id);
  if (record.persona) args.push("--append-system-prompt", record.persona);
  // Deliberately omit permission-mode, tool allowlists, settings, sandbox,
  // endpoint, proxy and timezone overrides. Claude owns those policies.
  return args;
}
module.exports = { loginEnvironment, resolveClaude, claudeArguments };
