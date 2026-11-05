// Capture the real UI in an isolated profile. Preview actions never execute tasks.
import { _electron as electron } from "playwright";
import electronPath from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
const { PNG } = createRequire(import.meta.url)("pngjs");
await fs.mkdir("test-results", { recursive: true });
await fs.mkdir("docs/images", { recursive: true });
const directory = await fs.mkdtemp(path.resolve("test-results/rin-demo-"));
const app = await electron.launch({
  executablePath: process.env.ANIME_CODEX_EXECUTABLE || electronPath,
  args: process.env.ANIME_CODEX_EXECUTABLE ? [] : ["."],
  env: {
    ...process.env,
    ANIME_CODEX_DEV: "0",
    ANIME_CODEX_DATA_DIR: directory,
  },
});
try {
  const page = await app.firstWindow();
  await page.getByTestId("character-images").waitFor();
  await page.getByTestId("language-select").selectOption("en");
  await page.waitForFunction(() => document.documentElement.lang === "en");
  await page.waitForTimeout(1000);
  const clip = await page.evaluate(() => {
    const bounds = [".scene", ".conversation", ".overlay-controls"].map((s) =>
      document.querySelector(s).getBoundingClientRect(),
    );
    const x = Math.max(0, Math.floor(Math.min(...bounds.map((b) => b.x)) - 16));
    const y = Math.max(0, Math.floor(Math.min(...bounds.map((b) => b.y)) - 16));
    return {
      x,
      y,
      width: Math.min(
        innerWidth - x,
        Math.ceil(Math.max(...bounds.map((b) => b.right)) - x + 16),
      ),
      height: Math.min(
        innerHeight - y,
        Math.ceil(Math.max(...bounds.map((b) => b.bottom)) - y + 16),
      ),
    };
  });
  await page.screenshot({
    path: "docs/images/rin-desktop.png",
    clip,
    omitBackground: true,
  });
  await page.getByTestId("settings-toggle").click();
  const frames = [];
  for (const phase of ["thinking", "coding", "approval", "success"]) {
    await page.locator(`[data-testid="slot-${phase}"] .action-preview`).click();
    await page.waitForTimeout(800);
    const scene = page.locator(".scene");
    await page.getByTestId("settings-toggle").click();
    // Preview labels stay in the capture; no events or replies are fabricated.
    frames.push(
      PNG.sync.read(
        await scene.screenshot({
          omitBackground: true,
          animations: "disabled",
        }),
      ),
    );
    await page.getByTestId("settings-toggle").click();
  }
  const gap = 20,
    width = frames.reduce((n, frame) => n + frame.width, 0) + gap * 3;
  const strip = new PNG({
    width,
    height: Math.max(...frames.map((frame) => frame.height)),
  });
  let x = 0;
  for (const frame of frames) {
    PNG.bitblt(frame, strip, 0, 0, frame.width, frame.height, x, 0);
    x += frame.width + gap;
  }
  await fs.writeFile("docs/images/rin-actions.png", PNG.sync.write(strip));
  console.log(
    "Captured real Rin desktop and four clearly marked action previews.",
  );
} finally {
  await app.close();
}
