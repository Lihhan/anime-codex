// Actual local greetings and labeled previews only; no task is executed.
import { _electron as electron } from "playwright";
import electronPath from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
const catalog = createRequire(import.meta.url)("../characters/catalog.json");
const { PNG } = createRequire(import.meta.url)("pngjs");
await fs.mkdir("docs/images", { recursive: true });
await fs.mkdir("test-results", { recursive: true });
const app = await electron.launch({
  executablePath: process.env.ANIME_CODEX_EXECUTABLE || electronPath,
  args: process.env.ANIME_CODEX_EXECUTABLE ? [] : ["."],
  env: {
    ...process.env,
    ANIME_CODEX_DEV: "0",
    ANIME_CODEX_DATA_DIR: await fs.mkdtemp(
      path.resolve("test-results/preset-demo-"),
    ),
  },
});
try {
  const page = await app.firstWindow();
  await page.getByTestId("character-images").waitFor();
  await page.getByTestId("language-select").selectOption("en");
  await page.waitForFunction(() => document.documentElement.lang === "en");
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
    await page.getByTestId("gal-line").click();
    await page.waitForTimeout(900);
    const clip = await page.evaluate(() => {
      const b = [".scene", ".conversation", ".overlay-controls"].map((s) =>
        document.querySelector(s).getBoundingClientRect(),
      );
      const x = Math.max(0, Math.floor(Math.min(...b.map((v) => v.x)) - 14)),
        y = Math.max(0, Math.floor(Math.min(...b.map((v) => v.y)) - 14));
      return {
        x,
        y,
        width: Math.min(
          innerWidth - x,
          Math.ceil(Math.max(...b.map((v) => v.right)) - x + 14),
        ),
        height: Math.min(
          innerHeight - y,
          Math.ceil(Math.max(...b.map((v) => v.bottom)) - y + 14),
        ),
      };
    });
    const screenshot = await page.screenshot({
      path: "docs/images/preset-" + slug + ".png",
      clip,
      omitBackground: true,
    });
    const png = PNG.sync.read(screenshot);
    for (let i = 0; i < png.data.length; i += 4)
      if (png.data[i + 3] === 0) png.data.fill(0, i, i + 3);
    await fs.writeFile(
      "docs/images/preset-" + slug + ".png",
      PNG.sync.write(png),
    );
  }
  console.log(
    "Captured the four actual character greetings without connecting a project.",
  );
} finally {
  await app.close();
}
