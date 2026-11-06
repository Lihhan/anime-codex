import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const { resolveCodex, isCodexExecutable } = createRequire(import.meta.url)(
  "../electron/codex-executable.cjs",
);
function fixture(entries) {
  const map = new Map(Object.entries(entries));
  let closed = 0;
  const fsApi = {
    async stat(p) {
      if (!map.has(p)) throw Error("missing");
      return { isFile: () => !map.get(p).directory };
    },
    async access(p) {
      if (map.get(p).executable === false) throw Error("not executable");
    },
    async open(p) {
      return {
        async read(buffer) {
          const data = Buffer.from(map.get(p).header || "cffaedfe", "hex");
          data.copy(buffer);
          return { buffer, bytesRead: data.length };
        },
        async close() {
          closed++;
        },
      };
    },
  };
  return { fsApi, closed: () => closed };
}
test("Mac validates executable Mach-O files, including universal binaries, and closes handles", async () => {
  for (const header of [
    "cffaedfe",
    "feedfacf",
    "cafebabe",
    "bebafeca",
    "cafebabf",
  ]) {
    const f = fixture({ "/opt/codex": { header } });
    assert.equal(
      await isCodexExecutable("/opt/codex", {
        platform: "darwin",
        fsApi: f.fsApi,
      }),
      true,
    );
    assert.equal(f.closed(), 1);
  }
  for (const entry of [
    { header: "23212f62" },
    { header: "7f454c46" },
    { header: "4d5a9000" },
    { header: "cf" },
    { directory: true },
    { executable: false },
  ]) {
    const f = fixture({ "/opt/codex": entry });
    assert.equal(
      await isCodexExecutable("/opt/codex", {
        platform: "darwin",
        fsApi: f.fsApi,
      }),
      false,
    );
  }
  assert.equal(await isCodexExecutable("codex", { platform: "darwin" }), false);
});
test("Mac explicit paths and saved selections have priority; invalid explicit config fails closed", async () => {
  const f = fixture({ "/chosen/codex": {}, "/saved/codex": {} }),
    options = {
      platform: "darwin",
      home: "/Users/test",
      env: {},
      fsApi: f.fsApi,
    };
  assert.equal(
    await resolveCodex({
      ...options,
      explicit: "/chosen/codex",
      saved: "/saved/codex",
    }),
    "/chosen/codex",
  );
  assert.equal(
    await resolveCodex({ ...options, saved: "/saved/codex" }),
    "/saved/codex",
  );
  await assert.rejects(
    resolveCodex({ ...options, explicit: "/missing", saved: "/saved/codex" }),
    /error.codexNotFound/,
  );
});
test("Mac skips npm scripts and relative PATH entries before selecting a native executable", async () => {
  const f = fixture({
    "/npm/codex": { header: "23212f62" },
    "/native/codex": {},
  });
  assert.equal(
    await resolveCodex({
      platform: "darwin",
      home: "/Users/test",
      env: { PATH: ".:/npm:/native" },
      fsApi: f.fsApi,
    }),
    "/native/codex",
  );
});
test("Finder empty-PATH launches discover standalone, Homebrew and application-bundle installations", async () => {
  for (const target of [
    "/Users/test/.local/bin/codex",
    "/opt/homebrew/bin/codex",
    "/usr/local/bin/codex",
    "/Applications/Codex.app/Contents/Resources/codex",
    "/Applications/ChatGPT.app/Contents/Resources/codex",
    "/Users/test/Applications/Codex.app/Contents/Resources/codex",
  ]) {
    const f = fixture({ [target]: {} });
    assert.equal(
      await resolveCodex({
        platform: "darwin",
        home: "/Users/test",
        env: { PATH: "" },
        saved: "/removed/codex",
        fsApi: f.fsApi,
      }),
      target,
    );
  }
  const f = fixture({ "/custom/bin/codex": {} });
  assert.equal(
    await resolveCodex({
      platform: "darwin",
      home: "/Users/test",
      env: { CODEX_INSTALL_DIR: "/custom/bin" },
      fsApi: f.fsApi,
    }),
    "/custom/bin/codex",
  );
});
test("Mac discovery reports missing native binaries without executing shell commands", async () => {
  const f = fixture({ "/opt/homebrew/bin/codex": { header: "23212f62" } });
  await assert.rejects(
    resolveCodex({
      platform: "darwin",
      home: "/Users/test",
      env: {},
      fsApi: f.fsApi,
    }),
    /error.codexNotFound/,
  );
});
