import { _electron as electron } from "playwright";
import electronPath from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
await fs.mkdir("test-results", { recursive: true });
const directory = await fs.mkdtemp(path.resolve("test-results/voice-clips-"));
const file = path.join(directory, "my-reaction.wav");
// Real, silent PCM fixture: exercise the native decoder without making noise.
const bytes = Buffer.alloc(44 + 16000 * 2);
bytes.write("RIFF");
bytes.writeUInt32LE(bytes.length - 8, 4);
bytes.write("WAVEfmt ", 8);
bytes.writeUInt32LE(16, 16);
bytes.writeUInt16LE(1, 20);
bytes.writeUInt16LE(1, 22);
bytes.writeUInt32LE(8000, 24);
bytes.writeUInt32LE(16000, 28);
bytes.writeUInt16LE(2, 32);
bytes.writeUInt16LE(16, 34);
bytes.write("data", 36);
bytes.writeUInt32LE(bytes.length - 44, 40);
await fs.writeFile(file, bytes);
const options = {
  executablePath: process.env.ANIME_CODEX_EXECUTABLE || electronPath,
  args: process.env.ANIME_CODEX_EXECUTABLE ? [] : ["."],
  env: {
    ...process.env,
    ANIME_CODEX_DEV: "0",
    ANIME_CODEX_SURFACE: "",
    ANIME_CODEX_DATA_DIR: directory,
  },
};
let app = await electron.launch(options);
const errors = [];
async function open(page) {
  page.on("pageerror", (e) => errors.push(e.message));
  await page.getByTestId("pet-body").waitFor();
  if (await page.getByRole("button", { name: "稍后再认识" }).count())
    await page.getByRole("button", { name: "稍后再认识" }).click();
  await page.getByTestId("pet-body").hover();
  await page.getByTitle("设置", { exact: true }).click();
  await page.getByRole("button", { name: "角色、模型与更多设置 ↗" }).click();
  await page.getByTestId("voice-clip-settings").waitFor();
}
try {
  let page = await app.firstWindow();
  await open(page);
  await app.evaluate(({ dialog }, file) => {
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [file],
    });
  }, file);
  const slot = page.getByTestId("voice-slot-touch");
  await slot.getByRole("button", { name: "上传", exact: true }).click();
  await slot.getByText("my-reaction.wav · 2.0 秒").waitFor();
  let state = await page.evaluate(() => window.animeCodex.companionState());
  const id = state.characterId,
    first = state.audio.touch.file;
  assert.equal(state.settings.voice, false);
  // Observe genuine HTMLMediaElement events; neither Audio nor play() is mocked.
  await page.evaluate(() => {
    window.mediaEvidence = [];
    const NativeAudio = window.Audio;
    window.Audio = new Proxy(NativeAudio, {
      construct(target, args) {
        const audio = Reflect.construct(target, args);
        for (const event of ["playing", "ended", "error"])
          audio.addEventListener(event, () => window.mediaEvidence.push(event));
        return audio;
      },
    });
  });
  await slot.getByRole("button", { name: "试听", exact: true }).click();
  await slot.getByRole("button", { name: "播放中…", exact: true }).waitFor();
  await slot.getByRole("button", { name: "试听", exact: true }).waitFor();
  assert.deepEqual(await page.evaluate(() => window.mediaEvidence), [
    "playing",
    "ended",
  ]);
  await slot.getByRole("button", { name: "替换", exact: true }).click();
  await page.waitForFunction(
    (first) =>
      window.animeCodex
        .companionState()
        .then((s) => s.audio.touch.file !== first),
    first,
  );
  await slot
    .getByRole("button", { name: "替换", exact: true })
    .click({ trial: true });
  await assert.rejects(fs.access(path.join(directory, "voice-clips", first)));
  const boot = await page.evaluate(() => window.animeCodex.bootstrap());
  const other = boot.characters.find((c) => c.id !== id).id;
  await page.getByLabel("切换角色").selectOption(other);
  await slot.getByText("尚未上传", { exact: true }).waitFor();
  await page.getByLabel("切换角色").selectOption(id);
  await slot.getByText("my-reaction.wav · 2.0 秒").waitFor();
  await page.getByLabel("播放我上传的动作语音", { exact: true }).check();
  await app.close();
  app = await electron.launch(options);
  page = await app.firstWindow();
  await open(page);
  assert.equal(
    await page.getByLabel("播放我上传的动作语音", { exact: true }).isChecked(),
    true,
  );
  await page
    .getByTestId("voice-slot-touch")
    .getByText("my-reaction.wav · 2.0 秒")
    .waitFor();
  await page
    .getByTestId("voice-slot-touch")
    .getByRole("button", { name: "删除", exact: true })
    .click();
  await page
    .getByTestId("voice-slot-touch")
    .getByText("尚未上传", { exact: true })
    .waitFor();
  assert.deepEqual(await fs.readFile(file), bytes);
  assert.deepEqual(errors, []);
  await fs.writeFile(
    "test-results/voice-clips-ui.json",
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        platform: process.platform,
        packaged: !!process.env.ANIME_CODEX_EXECUTABLE,
        upload: true,
        nativeDecodeAndPlayback: true,
        replacementCleanup: true,
        roleIsolation: true,
        restart: true,
        deletionPreservesOriginal: true,
        physicalSpeakerAudition: false,
        modelCalls: false,
      },
      null,
      2,
    ),
  );
  console.log(
    "Action audio passed: native decode/playback, upload/replace/delete, role isolation and restart.",
  );
} finally {
  await app.close();
}
