import { _electron as electron } from "playwright";
import electronPath from "electron";
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
  executablePath: electronPath,
  args: ["."],
  env: { ...process.env, ANIME_CODEX_DEV: "0" },
});
try {
  const page = await app.firstWindow();
  await page.getByText("今天想做点什么？").waitFor();
  await page.getByRole("button", { name: "连接与角色", exact: true }).click();
  await page.getByRole("button", { name: "连接 PATH 中的 Codex" }).click();
  await page
    .locator(".connection.online")
    .waitFor({ state: "attached", timeout: 70000 });
  await app.evaluate(({ dialog }, dir) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [dir] });
  }, fixture);
  await page.getByRole("button", { name: "选择项目", exact: true }).click();
  await page
    .getByRole("button", { name: "desktop-workspace", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "连接与角色", exact: true }).click();
  await page
    .getByLabel("给凛的消息")
    .fill(
      '读取 hello.js，用简短自然的中文解释它做什么，并给出 greet("世界") 的返回值。请实际读取文件，不要修改任何文件。',
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
  assert.ok(response.join("").includes("世界"));
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
