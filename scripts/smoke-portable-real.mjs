import { _electron as electron } from "playwright";
import electronPath from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
if (process.env.RUN_REAL_CODEX !== "1")
  throw Error(
    "Set RUN_REAL_CODEX=1; this test uses actual Codex subscription turns.",
  );
const directory = await fs.mkdtemp(path.resolve("test-results/portable-real-"));
const project = path.join(directory, "project");
await fs.mkdir(project);
const env = {
  ...process.env,
  ANIME_CODEX_DEV: "0",
  ANIME_CODEX_DATA_DIR: directory,
};
delete env.CODEX_HOME;
delete env.ANIME_CODEX_SURFACE;
const options = {
  executablePath: process.env.ANIME_CODEX_EXECUTABLE || electronPath,
  args: process.env.ANIME_CODEX_EXECUTABLE ? [] : ["."],
  env,
};
let app = await electron.launch(options);
try {
  const page = await app.firstWindow();
  await page.getByTestId("companion-app").waitFor();
  await page.evaluate(() =>
    window.animeCodex.companionSettings({ autoDispatch: false }),
  );
  const marker = "PORTABLE_CHAT_" + Date.now();
  await page.evaluate(
    (text) => window.animeCodex.companionChat({ text }),
    "今天我们只随便聊一句。请以第一人称介绍自己和角色名，并原样回复这个词：" +
      marker +
      "。不要创建任务或调用执行工具。",
  );
  let state = await page.evaluate(() => window.animeCodex.companionState());
  assert.ok(
    state.messages.some(
      (m) => m.role === "assistant" && m.text.includes(marker),
    ),
  );
  await app.evaluate(({ dialog }, project) => {
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [project],
    });
  }, project);
  await page.evaluate(() => window.animeCodex.companionWorkspace());
  const task = await page.evaluate(
    (project) =>
      window.animeCodex.companionTask({
        engine: "codex",
        workspace: project,
        prompt:
          "Work only in this disposable directory. Create proof.cjs that uses node:assert/strict to verify 6*7 equals 42. Run node proof.cjs. Do not access other projects, network or delegate. Report the actual result.",
        verificationCommand: "node proof.cjs",
        title: "Portable native code check",
      }),
    project,
  );
  const deadline = Date.now() + 180000;
  let result,
    approvalRequired = false;
  while (Date.now() < deadline) {
    state = await page.evaluate(() => window.animeCodex.companionState());
    result = state.tasks.find((t) => t.id === task.id);
    if (result.requests?.length) {
      approvalRequired = true;
      await page.evaluate(
        (id) =>
          window.animeCodex.companionTaskControl({ action: "cancel", id }),
        task.id,
      );
      await page.waitForFunction(
        async (id) =>
          (await window.animeCodex.companionState()).tasks.find(
            (t) => t.id === id,
          ).status === "interrupted",
        task.id,
      );
      result = (
        await page.evaluate(() => window.animeCodex.companionState())
      ).tasks.find((t) => t.id === task.id);
      break;
    }
    if (["completed", "failed", "interrupted"].includes(result.status)) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  if (approvalRequired) {
    assert.equal(result.status, "interrupted");
  } else {
    assert.equal(result.status, "completed", result.error || result.output);
    assert.equal(result.verification, "passed");
    assert.equal(result.check.exitCode, 0);
    assert.ok(
      (await fs.readFile(path.join(project, "proof.cjs"), "utf8")).includes(
        "assert",
      ),
    );
  }
  await page.evaluate(() =>
    window.animeCodex.companionMemory({
      text: "Portable test memory",
      global: false,
    }),
  );
  await app.close();
  app = await electron.launch(options);
  const again = await app.firstWindow();
  await again.getByTestId("companion-app").waitFor();
  state = await again.evaluate(() => window.animeCodex.companionState());
  assert.ok(
    state.tasks.some(
      (t) =>
        t.id === task.id &&
        (approvalRequired
          ? t.status === "interrupted"
          : t.verification === "passed"),
    ),
  );
  assert.ok(state.messages.some((m) => m.text.includes(marker)));
  assert.ok(
    state.memories.some(
      (m) => m.text === "Portable test memory" && m.status === "confirmed",
    ),
  );
  await fs.writeFile(
    "test-results/portable-real.json",
    JSON.stringify(
      {
        platform: process.platform,
        realChat: true,
        actualNativeTaskRequest: true,
        nativeExecutionCompleted: !approvalRequired,
        liveApprovalAndCancellation: approvalRequired,
        actualPlatformVerification: !approvalRequired,
        taskId: task.id,
        toolEvents: result.events.length,
        restartPersistence: true,
        claudeModelTurn: false,
        approvalsGranted: 0,
      },
      null,
      2,
    ),
  );
  console.log(
    "Real chat and native task workflow verified; live approvals are never granted automatically.",
  );
} finally {
  await app.close();
}
