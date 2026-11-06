import { _electron as electron } from "playwright";
import electronPath from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const catalog = JSON.parse(
  await fs.readFile("characters/catalog.json", "utf8"),
);
await fs.mkdir("test-results", { recursive: true });
const directory = await fs.mkdtemp(
  path.resolve("test-results/builtin-motion-"),
);
const app = await electron.launch({
  executablePath: process.env.ANIME_CODEX_EXECUTABLE || electronPath,
  args: process.env.ANIME_CODEX_EXECUTABLE ? [] : ["."],
  env: {
    ...process.env,
    ANIME_CODEX_DEV: "0",
    ANIME_CODEX_SURFACE: "",
    ANIME_CODEX_DATA_DIR: directory,
  },
});
try {
  const page = await app.firstWindow(),
    errors = [],
    results = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.getByTestId("pet-body").waitFor();
  if (await page.getByRole("button", { name: "稍后再认识" }).count())
    await page.getByRole("button", { name: "稍后再认识" }).click();
  await page.getByTestId("pet-body").hover();
  await page.getByTitle("设置", { exact: true }).click();
  await page.getByRole("button", { name: "角色、模型与更多设置 ↗" }).click();
  for (const slug of ["rin", "nahida", "kaguya", "iroha", "elysia"]) {
    await page
      .getByLabel("切换角色")
      .selectOption(catalog.find((c) => c.slug === slug).id);
    await page.waitForFunction(
      (id) =>
        document.querySelector('[data-testid="companion-app"]')?.dataset
          .characterId === id,
      catalog.find((c) => c.slug === slug).id,
    );
    await page.getByLabel("外观画风").selectOption("chibi");
    await page.waitForFunction(
      (slug) =>
        document
          .querySelector(".pet-sprite")
          ?.style.backgroundImage.includes("/" + slug + "/complete-v1/"),
      slug,
    );
    const decoded = await page.locator(".pet-sprite").evaluate(async (n) => {
      const image = new Image();
      image.src = n.style.backgroundImage.slice(5, -2);
      await image.decode();
      return image.naturalWidth > 0 && image.naturalHeight > 0;
    });
    assert.equal(decoded, true);
    const first = await page.locator(".pet-sprite").getAttribute("data-frame");
    await page.waitForFunction(
      (first) => document.querySelector(".pet-sprite")?.dataset.frame !== first,
      first,
    );
    await page.getByRole("button", { name: "办公", exact: true }).click();
    await page.waitForFunction(
      () =>
        document.querySelector(".pet-sprite")?.dataset.activity === "office",
    );
    await page.waitForFunction(
      () =>
        document.querySelector(".pet-sprite")?.dataset.transition !== "loop",
    );
    results.push({
      slug,
      decoded: true,
      framesAdvance: true,
      activityTransition: true,
    });
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(
    "test-results/builtin-motion.json",
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        platform: process.platform,
        characters: results,
        modelCalls: false,
      },
      null,
      2,
    ),
  );
  console.log(
    "All five complete character packs decode, animate and enter activity transitions.",
  );
} finally {
  await app.close();
}
