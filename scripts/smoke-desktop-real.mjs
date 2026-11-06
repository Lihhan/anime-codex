import { _electron as electron } from "playwright";
import electronPath from "electron";
import { useChatLayout } from "./ui-layout.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
if (process.env.RUN_REAL_CODEX !== "1")
  throw new Error("请设置 RUN_REAL_CODEX=1，检查会消耗真实 Codex 用量。");
const fixture = path.resolve("test-results/desktop-workspace");
await fs.mkdir(fixture, { recursive: true });
await fs.writeFile(
  path.join(fixture, "hello.js"),
  "export function greet(name) { return `你好，${name}！`; }\n",
);
const app = await electron.launch({
  executablePath: process.env.ANIME_CODEX_EXECUTABLE || electronPath,
  args: process.env.ANIME_CODEX_EXECUTABLE ? [] : ["."],
  env: {
    ...process.env,
    ANIME_CODEX_DEV: "0",
    ANIME_CODEX_SURFACE: "workbench",
    ANIME_CODEX_AUTOCONNECT: "0",
    ANIME_CODEX_DATA_DIR: await fs.mkdtemp(
      path.resolve("test-results/real-ui-profile-"),
    ),
  },
});
try {
  const page = await app.firstWindow();
  await useChatLayout(page);
  await page.getByText("今天想做点什么？").waitFor();
  await app.evaluate(({ dialog }, dir) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [dir] });
  }, fixture);
  await page
    .getByRole("button", { name: "连接 Codex 并选择项目", exact: true })
    .click();
  await page
    .getByRole("button", { name: "desktop-workspace", exact: true })
    .waitFor();
  await page.locator(".setup-guide").waitFor({ state: "hidden" });
  await page
    .getByTestId("message-input")
    .fill(
      '先用一句自然的中文以第一人称介绍你自己和角色名，再实际读取 hello.js，简短解释它做什么，并给出 greet("世界") 的返回值。不要修改任何文件。',
    );
  await page.getByRole("button", { name: "发送 ↗" }).click();
  await page
    .getByRole("button", { name: "停止", exact: false })
    .waitFor({ timeout: 70000 });
  await page
    .getByRole("button", { name: "停止", exact: false })
    .waitFor({ state: "hidden", timeout: 150000 });
  const response = await page
    .locator(".agentMessage .message-body")
    .allTextContents();
  const visibleErrors = await page.locator(".error").allTextContents();
  await fs.writeFile(
    "test-results/real-desktop-latest.json",
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        response,
        errors: visibleErrors,
        toolCount: await page.locator(".tool").count(),
      },
      null,
      2,
    ),
  );
  if (!response.join("").includes("世界"))
    console.log(JSON.stringify({ response, errors: visibleErrors }));
  assert.ok(response.join("").includes("世界"));
  assert.ok(
    response.join("").includes("我"),
    "Expected first-person character voice",
  );
  assert.match(response.join(""), /凛|Rin/);
  assert.equal(await page.locator(".error").count(), 0);
  assert.ok((await page.locator(".tool").count()) > 0);
  await page.screenshot({ path: "test-results/desktop-real.png" });
  await page.getByRole("button", { name: "展开工作台", exact: true }).click();
  await page.getByRole("button", { name: "刷新会话" }).click();
  await page.locator(".thread-list button.selected").waitFor();
  await page.locator(".thread-list button.selected").click();
  await page.locator(".agentMessage .message-body").first().waitFor();
  assert.ok(
    (await page.locator(".agentMessage .message-body").allTextContents())
      .join("")
      .includes("世界"),
  );
  console.log(
    "Real Electron -> preload -> main -> Codex -> streamed UI -> history resume passed.",
  );
} finally {
  await app.close();
}
