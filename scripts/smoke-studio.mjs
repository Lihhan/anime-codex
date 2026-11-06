import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
const { CharacterStudio } = createRequire(import.meta.url)(
  "../electron/character-studio.cjs",
);
if (process.env.RUN_REAL_CODEX !== "1")
  throw Error("RUN_REAL_CODEX=1 required");
// Finder uses the normal profile; do not inherit this development agent's alternate CODEX_HOME.
delete process.env.CODEX_HOME;
const directory = await fs.mkdtemp(path.resolve("test-results/studio-"));
const studio = new CharacterStudio(directory, (p) =>
  console.log(p.stage, p.message),
);
let job = await studio.draft({
  name: "小苔",
  work: "原创角色",
  customSetting:
    "一位安静、好奇的森林图书管理员。短绿色头发，米色针织衫，棕色短靴，叶片发夹。说话简洁自然，喜欢把复杂知识解释清楚。",
});
console.log("Draft created", job.id, job.profile.voiceRules.length, directory);
await fs.writeFile(
  "test-results/studio-location.json",
  JSON.stringify({ directory, id: job.id }),
);
if (process.env.TEST_IMAGE === "1") {
  job = await studio.generate({
    id: job.id,
    direction: "balanced",
    style: "chibi",
  });
  console.log(
    "Image generated",
    job.candidates.map((c) => ({ id: c.id, file: c.file })),
  );
}
