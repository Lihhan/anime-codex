import { _electron as electron } from "playwright";
import electronPath from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
if (process.env.RUN_REAL_CODEX !== "1")
  throw Error(
    "Set RUN_REAL_CODEX=1; this check runs three actual model turns.",
  );
const profile = await fs.mkdtemp(
  path.resolve("test-results/chat-real-profile-"),
);
const project = await fs.mkdtemp(
  path.resolve("test-results/chat-real-project-"),
);
const secret = "actual-file-" + Date.now(),
  memory = "memory-" + Date.now();
await fs.writeFile(path.join(project, "marker.txt"), secret);
const app = await electron.launch({
  executablePath: process.env.ANIME_CODEX_EXECUTABLE || electronPath,
  args: process.env.ANIME_CODEX_EXECUTABLE ? [] : ["."],
  env: { ...process.env, ANIME_CODEX_DEV: "0",
    ANIME_CODEX_SURFACE: "workbench",
    ANIME_CODEX_AUTOCONNECT: "0", ANIME_CODEX_DATA_DIR: profile },
});
try {
  const page = await app.firstWindow();
  await page.getByTestId("gal-input").waitFor();
  await app.evaluate(({ dialog }, project) => {
    globalThis.pickerCount = 0;
    dialog.showOpenDialog = async () => {
      globalThis.pickerCount++;
      return { canceled: false, filePaths: [project] };
    };
  }, project);
  async function send(text) {
    await page.getByTestId("gal-input").fill(text);
    await page.getByTestId("gal-send").click();
    await page.waitForFunction(
      () =>
        document.querySelector(' [data-testid="gal-stop"]') ||
        document.querySelector(".error"),
      null,
      { timeout: 90000 },
    );
    const immediate = await page.locator(".error").allTextContents();
    if (immediate.length) throw Error(immediate.join("\n"));
    await page
      .getByTestId("gal-stop")
      .waitFor({ state: "hidden", timeout: 180000 });
    assert.deepEqual(await page.locator(".error").allTextContents(), []);
  }
  await send(
    "用自然的中文以第一人称介绍自己，告诉我角色名字。今天我们随便聊聊，记住这个词：" +
      memory +
      "。",
  );
  assert.equal(await app.evaluate(() => globalThis.pickerCount), 0);
  const chatThreads = await page.evaluate(() =>
    window.animeCodex.listThreads(),
  );
  assert.ok(chatThreads.data.length >= 1);
  const chatId = chatThreads.data[0].id;
  assert.equal(
    path.resolve(chatThreads.data[0].cwd),
    path.join(profile, "chat"),
  );
  await send(
    "我刚才让你记住的词是什么？另外请读取这个文件的实际内容：" +
      path.join(project, "marker.txt") +
      "。如果当前模式不能读取，请直接告诉我，不要猜。",
  );
  const chatHistory = await page.evaluate(
    (id) => window.animeCodex.history({ id }),
    chatId,
  );
  const chatItems = chatHistory.data.flatMap((t) => t.items || []),
    reply = chatItems
      .filter((i) => i.type === "agentMessage")
      .map((i) => i.text)
      .join("\n");
  assert.ok(reply.includes("我") && reply.includes("凛"));
  assert.ok(reply.includes(memory));
  assert.ok(!reply.includes(secret));
  assert.equal(
    chatItems.filter((i) =>
      ["commandExecution", "fileChange", "mcpToolCall"].includes(i.type),
    ).length,
    0,
  );
  await page.getByTestId("gal-connect").click();
  assert.equal(await app.evaluate(() => globalThis.pickerCount), 1);
  await page.getByTestId("return-to-chat").waitFor();
  await send("实际读取 marker.txt 并原样返回文件内容，不要修改文件。");
  const projectThreads = await page.evaluate(() =>
    window.animeCodex.listThreads(),
  );
  assert.ok(projectThreads.data.length >= 1);
  const projectId = projectThreads.data[0].id;
  assert.notEqual(projectId, chatId);
  const projectHistory = await page.evaluate(
    (id) => window.animeCodex.history({ id }),
    projectId,
  );
  const projectItems = projectHistory.data.flatMap((t) => t.items || []);
  assert.ok(
    projectItems
      .filter((i) => i.type === "agentMessage")
      .some((i) => i.text.includes(secret)),
  );
  assert.ok(projectItems.some((i) => i.type === "commandExecution"));
  await page.getByTestId("return-to-chat").click();
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="return-to-chat"]'),
  );
  const restored = await page.evaluate(() => window.animeCodex.listThreads());
  assert.ok(restored.data.some((t) => t.id === chatId));
  assert.ok(!restored.data.some((t) => t.id === projectId));
  const character = (await page.evaluate(() => window.animeCodex.bootstrap()))
    .character;
  const resumed = await page.evaluate(
    ({ id, persona }) =>
      window.animeCodex.resume({ id, persona, mode: "workspace-write" }),
    { id: chatId, persona: character.persona },
  );
  assert.equal(resumed.sandbox.type, "readOnly");
  assert.equal(resumed.approvalPolicy, "never");
  assert.ok(
    (await page.evaluate((id) => window.animeCodex.history({ id }), chatId))
      .data.length >= 2,
  );
  assert.equal(
    await fs.readFile(path.join(project, "marker.txt"), "utf8"),
    secret,
  );
  await fs.writeFile(
    "test-results/chat-real.json",
    JSON.stringify(
      {
        realBackend: true,
        automaticConnection: true,
        noProjectPickerForChat: true,
        chatDirectoryIsolated: true,
        chatMemory: true,
        noChatTools: true,
        actualProjectRead: true,
        separateHistory: true,
        chatResumeWithWriteSettingStillReadOnly: true,
        sourceUnchanged: true,
        reply,
      },
      null,
      2,
    ),
  );
  console.log(
    "Real chat passed: automatic connection, memory, no project picker/tools, project file read, return and resumed history.",
  );
} finally {
  await app.close();
}
