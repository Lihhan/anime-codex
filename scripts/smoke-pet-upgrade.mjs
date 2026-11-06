import { _electron as electron } from "playwright";
import electronPath from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const directory = await fs.mkdtemp(path.resolve("test-results/pet-upgrade-"));
const app = await electron.launch({
  executablePath: electronPath,
  args: ["."],
  env: {
    ...process.env,
    ANIME_CODEX_DATA_DIR: directory,
    ANIME_CODEX_DEV: "0",
  },
});
try {
  const page = await app.firstWindow();
  // Stub only the chat service for deterministic onboarding. Native model production has its separate real test.
  await app.evaluate(({ ipcMain }) => {
    const original = ipcMain._invokeHandlers.get("codex:call");
    ipcMain.removeHandler("codex:call");
    ipcMain.handle("codex:call", (e, name, args) =>
      name === "companionChat"
        ? { reply: "你好，我记得你的招呼。" }
        : original(e, name, args),
    );
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const pet = page.getByTestId("pet-body");
  await pet.waitFor();
  assert.equal(
    await page.locator(".pet-dock").getAttribute("data-tour"),
    "chat",
  );
  await page.getByTitle("聊天", { exact: true }).click();
  assert.equal(
    await page.locator(".pet-dock").getAttribute("data-tour"),
    "chat",
  );
  await page.getByLabel("气泡输入").fill("你好");
  await page.getByTitle("发送消息", { exact: true }).click();
  await page.waitForFunction(
    () => document.querySelector(".pet-dock").dataset.tour === "tasks",
  );
  await page.getByTitle("任务", { exact: true }).click();
  await page.getByRole("button", { name: "了解任务分发" }).click();
  assert.equal(
    await page.locator(".pet-dock").getAttribute("data-tour"),
    "life",
  );
  await page.getByTitle("生活与文件投喂").click();
  await page.screenshot({
    path: "test-results/pet-tour-life.png",
    omitBackground: true,
  });
  await page.getByRole("button", { name: "读书", exact: true }).click();
  assert.equal(
    await page.locator(".pet-dock").getAttribute("data-tour"),
    "settings",
  );
  await page.getByTitle("设置", { exact: true }).click();
  await page.getByLabel("快捷角色大小").fill("75");
  assert.equal(await page.locator(".tour-coach").count(), 0);
  await page.reload();
  await pet.waitFor();
  assert.equal(await page.locator(".tour-coach").count(), 0);
  await pet.hover();
  await page.getByTitle("设置", { exact: true }).click();
  await page.getByRole("button", { name: "角色、模型与更多设置 ↗" }).click();
  await page
    .getByLabel("切换角色")
    .selectOption("c126295a-d3f1-4746-a748-122dfb001101");
  await page.getByLabel("外观画风").selectOption("sticker");
  await page.getByTitle("收起面板，角色继续陪伴").click();
  await pet.hover();
  await page.getByTitle("生活与文件投喂").click();
  await page.getByRole("button", { name: "读书", exact: true }).click();
  await page.waitForFunction(
    () =>
      document.querySelector(".pet-sprite")?.dataset.transition === "loop" &&
      document.querySelector(".pet-sprite")?.dataset.activity === "read",
  );
  await pet.hover();
  await page.getByTitle("生活与文件投喂").click();
  await page.getByRole("button", { name: "出去跑跑", exact: true }).click();
  await page.waitForFunction(
    () => document.querySelector(".pet-sprite")?.dataset.transition !== "loop",
  );
  const before = await page.locator(".pet-world").boundingBox();
  await page.waitForTimeout(120);
  const during = await page.locator(".pet-world").boundingBox();
  assert.ok(Math.abs(before.x - during.x) < 1, "must settle before moving");
  await page.waitForFunction(
    () => document.querySelector(".pet-sprite")?.dataset.transition === "loop",
  );
  await page.waitForTimeout(350);
  const after = await page.locator(".pet-world").boundingBox();
  assert.ok(Math.abs(after.x - during.x) > 5, "must move after transition");
  // Exercise dedicated transition clips independently from the legacy fallback.
  await app.evaluate(({ ipcMain }) => {
    const original = ipcMain._invokeHandlers.get("codex:call");
    ipcMain.removeHandler("codex:call");
    ipcMain.handle("codex:call", async (e, name, args) => {
      const result = await original(e, name, args);
      if (name === "bootstrap") {
        const src = result.character.images.idle.src,
          clips = {};
        for (const key of [
          "idle",
          "read",
          "walk_right",
          "walk_left",
          "enter_walk",
          "exit_read",
        ])
          clips[key] = { src, row: 0, durations: [90, 90, 90, 90] };
        result.character.petAppearance = {
          themeHue: 225,
          chibi: { columns: 4, rows: 4, clips },
        };
      }
      return result;
    });
  });
  await page.reload();
  await pet.waitFor();
  await pet.hover();
  await page.getByTitle("生活与文件投喂").click();
  await page.getByRole("button", { name: "读书", exact: true }).click();
  await page.waitForFunction(
    () =>
      document.querySelector(".pet-sprite")?.dataset.transition === "loop" &&
      document.querySelector(".pet-sprite")?.dataset.activity === "read",
  );
  await pet.hover();
  await page.getByTitle("生活与文件投喂").click();
  await page.getByRole("button", { name: "出去跑跑", exact: true }).click();
  await page.waitForFunction(
    () => document.querySelector(".pet-sprite")?.dataset.clip === "exit_read",
  );
  await page.waitForFunction(
    () => document.querySelector(".pet-sprite")?.dataset.clip === "enter_walk",
  );
  await page.waitForFunction(
    () => document.querySelector(".pet-sprite")?.dataset.transition === "loop",
  );
  // Accelerate the scheduler's own timers, without waiting minutes or calling an LLM.
  await page.clock.install();
  await page.reload();
  await pet.waitFor();
  await page.clock.fastForward(15000);
  const first = await page.locator(".pet-sprite").getAttribute("data-activity");
  assert.ok(
    ["read", "gaming", "office", "meal", "walk"].includes(first),
    first,
  );
  await page.clock.fastForward(130000);
  const second = await page
    .locator(".pet-sprite")
    .getAttribute("data-activity");
  assert.notEqual(second, "idle");
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      tour: "all four steps and persistence",
      transition: "read to walk pauses locomotion",
      routine: [first, second],
      errors,
    }),
  );
} finally {
  await app.close();
}
