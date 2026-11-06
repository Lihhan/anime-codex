import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { createTranslator, responseLanguage } from "../shared/i18n.mjs";
import { alphaHit, imagePoint } from "../shared/pointer-hit.mjs";
const require = createRequire(import.meta.url),
  { Companion } = require("../electron/companion.cjs");
test("transparent pixels and letterboxing pass through; sprite hit tests use only the active atlas cell", () => {
  const data = new Uint8ClampedArray(4 * 4 * 4);
  data[(1 * 4 + 2) * 4 + 3] = 24;
  const mask = { width: 4, height: 4, data };
  assert.equal(alphaHit(mask, 0.6, 0.3), true);
  assert.equal(alphaHit(mask, 0.1, 0.3), false);
  assert.equal(alphaHit(mask, -0.1, 0.3), false);
  assert.equal(alphaHit(mask, 1, 0.3), false);
  assert.equal(
    alphaHit(mask, 0.5, 0.5, { x: 0.5, y: 0.25, width: 0.25, height: 0.25 }),
    true,
  );
  assert.equal(
    alphaHit(mask, 0.5, 0.5, { x: 0, y: 0.25, width: 0.25, height: 0.25 }),
    false,
  );
  const rect = { left: 0, top: 0, width: 200, height: 200 };
  assert.deepEqual(imagePoint(rect, 100, 200, 100, 100), { x: 0.5, y: 0.5 });
  assert.ok(imagePoint(rect, 100, 200, 0, 100).x < 0);
});
test("native status templates localize while interpolation values and unknown raw records stay untouched", () => {
  const en = createTranslator("en"),
    ja = createTranslator("ja");
  assert.equal(en("设置"), "Settings");
  assert.equal(ja("Settings"), "設定");
  assert.equal(
    ja("“Original task title”: Check failed. Click me for the report."),
    "「Original task title」：確認に失敗。私をクリックして報告を見てね。",
  );
  assert.equal(
    en("3/9 · 制作日常生活动作与过渡帧"),
    "3/9 · Creating Daily life actions and transitions",
  );
  assert.equal(en("constructor"), "constructor");
  assert.equal(ja("__proto__"), "__proto__");
  const raw = "[tool] 变量名没有改变; exitCode=1";
  assert.equal(en(raw), raw);
  const translated = en("{v0} · {v1} 秒", { v0: "用户的录音.wav", v1: "1.5" });
  assert.equal(translated, "用户的录音.wav · 1.5 s");
});
test("all new UI translation literals resolve in English and Japanese", async () => {
  const { parsers } = require("prettier/plugins/babel");
  const tables = JSON.parse(await fs.readFile("shared/messages.json", "utf8"));
  for (const file of [
    "src/CompanionApp.jsx",
    "src/VoiceClips.jsx",
    "src/CharacterStudio.jsx",
    "src/PetSprite.jsx",
  ]) {
    const ast = await parsers.babel.parse(await fs.readFile(file, "utf8"));
    function walk(node) {
      if (!node || typeof node !== "object") return;
      if (node.type === "JSXText")
        assert.doesNotMatch(
          node.value,
          /[\u3400-\u9fff]/u,
          file + ": untranslated JSX",
        );
      if (
        node.type === "CallExpression" &&
        node.callee.name === "tr" &&
        node.arguments[0]?.type === "StringLiteral"
      ) {
        const key = node.arguments[0].value;
        assert.ok(
          Object.hasOwn(tables.en, key) ||
            Object.values(tables.zh).includes(key),
          file + ": " + key,
        );
        assert.doesNotMatch(
          createTranslator("en")(key),
          /[\u3400-\u9fff]/u,
          key,
        );
      }
      for (const [key, value] of Object.entries(node)) {
        if (["loc", "comments", "tokens", "extra"].includes(key)) continue;
        if (Array.isArray(value)) value.forEach(walk);
        else if (value && typeof value === "object") walk(value);
      }
    }
    walk(ast);
  }
});
test("selected reply language reaches the companion without rewriting user text; position lock and wandering are mutually exclusive", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "companion-language-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const language of ["en", "ja"]) {
    let prompt = "";
    const c = await new Companion({
      directory: path.join(root, language),
      preferences: {
        data: { activeCharacter: "a", language },
        find: () => ({
          id: "a",
          builtin: "rin",
          name: "Rin",
          persona: "User customization stays intact.",
        }),
      },
      emit: () => {},
      shell: {},
      responseLanguage,
      translate: createTranslator(language),
      brain: async (args) => {
        prompt = args.prompt;
        return JSON.stringify({
          reply: "Fixture only",
          memories: [],
          task: null,
        });
      },
    }).load();
    try {
      const text = "变量名保持原样：例子";
      await c.message(text);
      assert.ok(prompt.includes(responseLanguage(language)));
      assert.ok(prompt.includes(JSON.stringify(text)));
      assert.ok(prompt.includes("User customization stays intact."));
      assert.equal(c.store.state.settings.lockPosition, true);
      assert.equal(c.store.state.settings.wander, false);
      await c.settings({ wander: true });
      assert.equal(c.store.state.settings.lockPosition, false);
      await c.settings({ lockPosition: true });
      assert.equal(c.store.state.settings.wander, false);
    } finally {
      await c.close();
    }
  }
});
