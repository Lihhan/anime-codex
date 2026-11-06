const path = require("node:path");
// Only a user-authored verification command belongs here. Paths use cwd, not interpolation.
function checkCommand(command, env, platform = process.platform) {
  if (typeof command !== "string" || !command.trim())
    throw Error("A check command is required.");
  if (platform === "win32") {
    const root = env.SystemRoot || env.SYSTEMROOT || "C:\\Windows";
    const executable =
      env.ComSpec || env.COMSPEC || path.win32.join(root, "System32/cmd.exe");
    if (!path.win32.isAbsolute(executable))
      throw Error("The Windows command processor must be absolute.");
    return { executable, args: ["/d", "/s", "/c", command] };
  }
  const executable = env.SHELL || "/bin/sh";
  if (!path.posix.isAbsolute(executable))
    throw Error("The check shell must be absolute.");
  return { executable, args: ["-c", command] };
}
module.exports = { checkCommand };
