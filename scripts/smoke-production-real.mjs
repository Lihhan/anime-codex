import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
const { CharacterStudio } = createRequire(import.meta.url)(
  "../electron/character-studio.cjs",
);
if (process.env.RUN_REAL_CODEX !== "1")
  throw Error("RUN_REAL_CODEX=1 required");
delete process.env.CODEX_HOME;
const root =
  process.env.RESUME_DIR ||
  (await fs.mkdtemp(path.resolve("test-results/production-real-")));
const state = JSON.parse(
  await fs.readFile(
    path.join(
      process.env.HOME,
      "Library/Application Support/anime-codex/companion/state.json",
    ),
    "utf8",
  ),
);
const selection = {
  model: state.settings.brainModel || "",
  effort: state.settings.brainEffort || "",
};
const studio = new CharacterStudio(
  root,
  (p) => console.log(JSON.stringify(p)),
  () => selection,
);
process.on("SIGINT", () => studio.cancel());
process.on("SIGTERM", () => studio.cancel());
await studio.list();
try {
  const job = await studio.produce(
    process.env.RESUME_JOB
      ? { id: process.env.RESUME_JOB }
      : {
          name: "小苔",
          work: "原创桌宠",
          customSetting:
            "安静而好奇的森林图书管理员，绿色短发、米色针织衫、棕色短靴和叶片发夹。喜欢读书、吃小点心和玩拼图。说话简短自然。",
        },
  );
  console.log("READY", job.id);
  await fs.writeFile(
    "test-results/production-real.json",
    JSON.stringify({
      directory: root,
      id: job.id,
      status: job.status,
      selection,
    }),
  );
} catch (error) {
  await fs.writeFile(
    "test-results/production-real.json",
    JSON.stringify({ directory: root, error: error.message, selection }),
  );
  console.error(error.message);
  process.exitCode = 1;
}
