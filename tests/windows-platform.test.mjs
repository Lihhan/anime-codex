import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { checkCommand } = require("../electron/check-command.cjs");
const {
  resolveClaude,
  loginEnvironment,
} = require("../electron/claude-environment.cjs");
test("user-authored checks use the native Windows command processor, without modifying the command", () => {
  const command = 'npm test -- --name "a b"';
  assert.deepEqual(
    checkCommand(
      command,
      { ComSpec: "C:\\Windows\\System32\\cmd.exe" },
      "win32",
    ),
    {
      executable: "C:\\Windows\\System32\\cmd.exe",
      args: ["/d", "/s", "/c", command],
    },
  );
  assert.deepEqual(checkCommand(command, { SHELL: "/bin/zsh" }, "darwin"), {
    executable: "/bin/zsh",
    args: ["-c", command],
  });
  assert.throws(() =>
    checkCommand(command, { ComSpec: "relative.exe" }, "win32"),
  );
});
test("Claude discovery honors Windows Path casing, quoted directories and native installers", async () => {
  const executable = "C:\\Program Files\\Claude\\claude.exe";
  const fsApi = {
    stat: async (file) => ({ isFile: () => file === executable }),
  };
  const env = Object.freeze({
    Path: '"C:\\Program Files\\Claude";relative',
    USERPROFILE: "C:\\Users\\sample",
  });
  assert.equal(
    await resolveClaude({ env, platform: "win32", fsApi }),
    executable,
  );
  await assert.rejects(
    resolveClaude({
      explicit: "C:\\Claude\\claude.cmd",
      env,
      platform: "win32",
      fsApi,
    }),
  );
  const local = "C:\\Users\\sample\\.local\\bin\\claude.exe";
  assert.equal(
    await resolveClaude({
      env: { USERPROFILE: "C:\\Users\\sample" },
      platform: "win32",
      fsApi: { stat: async (file) => ({ isFile: () => file === local }) },
    }),
    local,
  );
});
test("Windows environment inheritance preserves exported values and does not invoke a POSIX shell", async () => {
  const env = {
    Path: "C:\\Tools",
    USERPROFILE: "C:\\Users\\sample",
    CUSTOM: "a=b",
    HTTPS_PROXY: "fixture",
    TZ: "Asia/Tokyo",
  };
  assert.deepEqual(
    await loginEnvironment({
      env,
      platform: "win32",
      run: () => {
        throw Error("must not launch a shell");
      },
    }),
    env,
  );
});
