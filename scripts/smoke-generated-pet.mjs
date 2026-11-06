import { _electron as electron } from "playwright";
import electronPath from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const fixture = JSON.parse(
  await fs.readFile("test-results/production-real.json", "utf8"),
);
if (fixture.status !== "ready")
  throw Error("A completed real production job is required");
const directory = await fs.mkdtemp(path.resolve("test-results/generated-pet-"));
await fs.cp(fixture.directory, path.join(directory, "character-studio"), {
  recursive: true,
});
const options = {
  executablePath: electronPath,
  args: ["."],
  env: {
    ...process.env,
    ANIME_CODEX_DATA_DIR: directory,
    ANIME_CODEX_DEV: "0",
  },
};
let app = await electron.launch(options);
try {
  let page = await app.firstWindow();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.getByTestId("pet-body").waitFor();
  const applied = await page.evaluate(
    (id) => window.animeCodex.studioProduce({ id }),
    fixture.id,
  );
  assert.equal(applied.preferences.character.name, "小苔");
  const id = applied.preferences.character.id;
  await page.reload();
  await page.getByTestId("pet-body").waitFor();
  await page.getByRole("button", { name: "稍后再认识" }).click();
  assert.ok(
    (
      await page.evaluate(() => window.animeCodex.bootstrap())
    ).character.petAppearance.chibi.clips.exit_read.src.startsWith(
      "data:image/png",
    ),
  );
  const action = async (name) => {
    await page.getByTestId("pet-body").hover();
    await page.getByTitle("生活与文件投喂").click();
    await page.getByRole("button", { name, exact: true }).click();
  };
  await action("读书");
  await page.waitForFunction(
    () =>
      document.querySelector(".pet-sprite")?.dataset.transition === "loop" &&
      document.querySelector(".pet-sprite")?.dataset.activity === "read",
  );
  await page.screenshot({
    path: "test-results/generated-pet-read.png",
    omitBackground: true,
  });
  await action("出去跑跑");
  await page.waitForFunction(
    () => document.querySelector(".pet-sprite")?.dataset.clip === "exit_read",
  );
  await page.screenshot({
    path: "test-results/generated-pet-exit-read.png",
    omitBackground: true,
  });
  await page.waitForFunction(
    () => document.querySelector(".pet-sprite")?.dataset.clip === "enter_walk",
  );
  await page.waitForFunction(
    () => document.querySelector(".pet-sprite")?.dataset.transition === "loop",
  );
  await app.close();
  app = await electron.launch(options);
  page = await app.firstWindow();
  await page.getByTestId("pet-body").waitFor();
  const boot = await page.evaluate(() => window.animeCodex.bootstrap());
  assert.equal(boot.character.id, id);
  assert.equal(await page.locator(".tour-coach").count(), 0);
  assert.deepEqual(errors, []);
  await fs.writeFile(
    "test-results/generated-pet.json",
    JSON.stringify(
      {
        directory,
        id,
        productionJob: fixture.id,
        realImages: true,
        automaticActivation: true,
        transitionClips: true,
        restartPreserved: true,
      },
      null,
      2,
    ),
  );
  console.log(
    "Real generated pet activated, transitions rendered, restart preserved",
  );
} finally {
  await app.close();
}
