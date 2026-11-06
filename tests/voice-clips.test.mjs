import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { ClipPlayer } from "../shared/clip-player.mjs";
const { VoiceClips } = createRequire(import.meta.url)(
  "../electron/voice-clips.cjs",
);
const id = "00000000-0000-4000-8000-000000000001",
  other = "00000000-0000-4000-8000-000000000002";
export function silentWave(seconds = 0.5) {
  const n = Math.round(8000 * seconds) * 2,
    b = Buffer.alloc(44 + n);
  b.write("RIFF");
  b.writeUInt32LE(b.length - 8, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(8000, 24);
  b.writeUInt32LE(16000, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(n, 40);
  return b;
}
async function setup(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "anime-audio-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const source = path.join(directory, "sample.wav");
  await fs.writeFile(source, silentWave());
  return {
    directory,
    source,
    clips: await new VoiceClips(path.join(directory, "clips")).load(),
  };
}
test("uploaded audio is copied, isolated by role, integrity checked and preserved after restart", async (t) => {
  const { directory, source, clips } = await setup(t),
    staged = await clips.prepare({ characterId: id, action: "touch" }, source);
  assert.deepEqual(clips.snapshot(id), {});
  assert.equal(staged.mime, "audio/wav");
  const saved = await clips.commit({ token: staged.token, duration: 0.5 });
  assert.ok(saved.touch);
  assert.deepEqual(clips.snapshot(other), {});
  await assert.rejects(async () =>
    clips.commit({ token: staged.token, duration: 0.5 }),
  );
  const reload = await new VoiceClips(path.join(directory, "clips")).load();
  const play = await reload.source({ characterId: id, action: "touch" });
  assert.ok(play.src.startsWith("data:audio/wav;base64,"));
  assert.equal(
    await reload.source({ characterId: id, action: "failure" }),
    null,
    "missing actions remain silent",
  );
  await reload.remove({ characterId: id, action: "touch" });
  assert.deepEqual(reload.snapshot(id), {});
  assert.ok(
    await fs.stat(source),
    "deletion must never remove the original uploaded file",
  );
});
test("invalid formats, unsafe targets, oversized input and invalid durations do not enter the library", async (t) => {
  const { source, clips } = await setup(t);
  await assert.rejects(
    clips.prepare({ characterId: "../outside", action: "touch" }, source),
  );
  await assert.rejects(
    clips.prepare({ characterId: id, action: "__proto__" }, source),
  );
  const staged = await clips.prepare(
    { characterId: id, action: "thinking" },
    source,
  );
  assert.throws(() => clips.commit({ token: staged.token, duration: 46 }));
  await fs.writeFile(source, "<html>This is not audio</html>");
  await assert.rejects(
    clips.prepare({ characterId: id, action: "touch" }, source),
  );
  await fs.writeFile(source, Buffer.alloc(8 * 1024 * 1024 + 1));
  await assert.rejects(
    clips.prepare({ characterId: id, action: "touch" }, source),
  );
  assert.deepEqual(clips.snapshot(id), {});
});
test("tampered audio and manifest path traversal cannot be read as a clip", async (t) => {
  const { directory, source, clips } = await setup(t),
    p = await clips.prepare({ characterId: id, action: "idle" }, source);
  const saved = await clips.commit({ token: p.token, duration: 0.5 });
  const file = path.join(directory, "clips", saved.idle.file);
  const bytes = await fs.readFile(file);
  bytes[bytes.length - 1] = 1;
  await fs.writeFile(file, bytes);
  await assert.rejects(
    clips.source({ characterId: id, action: "idle" }),
    /变化/,
  );
  const index = path.join(directory, "clips", "library.json"),
    manifest = JSON.parse(await fs.readFile(index, "utf8"));
  manifest.characters[id].idle.file = "../sample.wav";
  await fs.writeFile(index, JSON.stringify(manifest));
  const reload = await new VoiceClips(path.join(directory, "clips")).load();
  assert.deepEqual(reload.snapshot(id), {});
  assert.ok(reload.warning);
  assert.ok(
    (await fs.readdir(path.join(directory, "clips"))).some((n) =>
      n.startsWith("library-recovery-"),
    ),
  );
});
function player({ deferred = false } = {}) {
  let resolve;
  const created = [],
    errors = [];
  let clock = 10000;
  const source = deferred
    ? () => new Promise((r) => (resolve = r))
    : async () => ({ src: "data:audio/wav;base64,fixture" });
  const p = new ClipPlayer({
    source,
    now: () => clock,
    onError: (e) => errors.push(e),
    createAudio: () => {
      const a = {
        paused: false,
        play: async () => {},
        pause() {
          this.paused = true;
        },
        load() {},
        removeAttribute() {},
      };
      created.push(a);
      return a;
    },
  });
  p.configure({
    id,
    enabled: true,
    quiet: false,
    volume: 0.75,
    clips: { touch: {}, approval: {}, idle: {} },
  });
  return {
    p,
    created,
    errors,
    resolve: (v) => resolve(v),
    advance: (n) => (clock += n),
  };
}
test("muting or switching roles cancels a pending clip before it can start", async () => {
  const a = player({ deferred: true }),
    pending = a.p.play("touch");
  a.p.configure({ ...a.p.config, enabled: false });
  a.resolve({ src: "fixture" });
  assert.equal(await pending, false);
  assert.equal(a.created.length, 0);
  const b = player({ deferred: true }),
    old = b.p.play("touch");
  b.p.configure({ ...b.p.config, id: other });
  b.resolve({ src: "fixture" });
  assert.equal(await old, false);
  assert.equal(b.created.length, 0);
});
test("clips never overlap; approvals preempt local reactions and one native request is not replayed", async () => {
  const { p, created, advance } = player();
  assert.equal(await p.play("touch"), true);
  assert.equal(await p.play("idle"), false);
  assert.equal(await p.play("approval", { key: "native-request-1" }), true);
  assert.equal(created[0].paused, true);
  assert.equal(created[1].loop, false);
  created[1].onended();
  advance(5000);
  assert.equal(await p.play("approval", { key: "native-request-1" }), false);
  assert.equal(await p.play("idle"), true);
  created.at(-1).onended();
  advance(5000);
  assert.equal(await p.play("idle"), false);
});
test("preview works with automatic audio off, while quiet mode and hidden windows remain silent", async () => {
  const { p } = player();
  p.configure({ ...p.config, enabled: false });
  assert.equal(await p.play("touch"), false);
  assert.equal(await p.play("touch", { preview: true }), true);
  p.configure({ ...p.config });
  assert.ok(
    p.audio,
    "unrelated metadata refresh must not stop an explicit preview",
  );
  p.configure({ ...p.config, quiet: true });
  assert.equal(p.audio, null);
  assert.equal(await p.play("touch", { preview: true }), false);
  p.configure({ ...p.config, quiet: false, enabled: true });
  p.suspend();
  assert.equal(await p.play("touch", { preview: true }), false);
  p.resume();
  assert.equal(await p.play("touch", { preview: true }), true);
});
