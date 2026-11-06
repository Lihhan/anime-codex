import { _electron as electron } from "playwright";
import electronPath from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
if (process.env.RUN_REAL_CODEX !== "1")
  throw Error(
    "Set RUN_REAL_CODEX=1. This check runs four real read-only Codex turns.",
  );
const require = createRequire(import.meta.url),
  catalog = require("../characters/catalog.json");
await fs.mkdir("test-results", { recursive: true });
const workspace = await fs.mkdtemp(
  path.resolve("test-results/preset-real-workspace-"),
);
const token = "preset-read-" + Date.now();
await fs.writeFile(path.join(workspace, "profile-marker.txt"), token);
const app = await electron.launch({
  executablePath: process.env.ANIME_CODEX_EXECUTABLE || electronPath,
  args: process.env.ANIME_CODEX_EXECUTABLE ? [] : ["."],
  env: {
    ...process.env,
    ANIME_CODEX_DEV: "0",
    ANIME_CODEX_DATA_DIR: await fs.mkdtemp(
      path.resolve("test-results/preset-real-profile-"),
    ),
  },
});
try {
  const page = await app.firstWindow();
  await page.getByTestId("character-images").waitFor();
  await app.evaluate(({ dialog }, directory) => {
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [directory],
    });
  }, workspace);
  await page.getByTestId("gal-connect").click();
  await page
    .getByTestId("gal-connect")
    .waitFor({ state: "hidden", timeout: 70000 });
  const results = [];
  for (const { slug, id } of catalog.slice(1)) {
    await page.getByTestId("settings-toggle").click();
    await page.getByTestId("preset-" + slug).click();
    await page.waitForFunction(
      ({ id, slug }) =>
        document.querySelector('[data-testid="character-select"]').value ===
          id &&
        !document.querySelector('[data-testid="preset-' + slug + '"]').disabled,
      { id, slug },
    );
    await page.getByTestId("settings-close").click();
    await page
      .getByTestId("gal-input")
      .fill(
        "请用一句自然的中文，以当前角色的名字、第一人称介绍自己。然后实际读取 profile-marker.txt，原样返回其中的内容。不要修改任何文件。最后，假设我说‘我改了半天还是报错，烦死了’，请按你自己的性格给我一句自然的回应，不要把假设说成已经发生的工作。",
      );
    await page.getByTestId("gal-send").click();
    await page.getByTestId("gal-stop").waitFor({ timeout: 70000 });
    await page
      .getByTestId("gal-stop")
      .waitFor({ state: "hidden", timeout: 150000 });
    await page.getByTestId("gal-history").click();
    const response = (
      await page.locator(".agentMessage .message-body").allTextContents()
    ).join("\n");
    const toolCount = await page.locator(".tool").count();
    const expected = {
      furina: "芙宁娜",
      nahida: "纳西妲",
      kaguya: "辉夜",
      iroha: "彩叶",
    }[slug];
    assert.ok(
      response.includes(expected),
      "Wrong self-introduction for " + slug,
    );
    assert.ok(response.includes("我"));
    assert.ok(response.includes(token), "Real file marker missing for " + slug);
    assert.ok(toolCount > 0);
    assert.equal(await page.locator(".error").count(), 0);
    results.push({ slug, response, toolCount });
    console.log("Real character/file-read turn passed: " + slug);
    await page.getByTestId("gal-back").click();
  }
  assert.equal(
    await fs.readFile(path.join(workspace, "profile-marker.txt"), "utf8"),
    token,
  );
  const threads = await page.evaluate(() => window.animeCodex.listThreads({}));
  assert.ok(threads.data.length >= 4);
  await fs.writeFile(
    "test-results/presets-real-codex.json",
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        realProgrammingBackend: true,
        readOnly: true,
        sourceFileUnchanged: true,
        independentThreads: threads.data.length,
        results,
      },
      null,
      2,
    ),
  );
} finally {
  await app.close();
}
