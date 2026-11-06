import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const require = createRequire(import.meta.url);
const {
  protectCode,
  translationArgs,
  validateTranslation,
  TranslationService,
} = require("../electron/translation.cjs");

test("optional reply translation follows the selected interface language and preserves original code", async (t) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "translation-language-"),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  let received = "";
  const service = new TranslationService(directory, {
    language: () => "ja",
    resolve: async () => "fixture-only",
    spawnFn: () => {
      const child = new EventEmitter();
      child.stdout = new PassThrough();
      child.stderr = new PassThrough();
      child.stdin = new PassThrough();
      child.kill = () => {};
      child.stdin.on("data", (data) => {
        received += data.toString();
      });
      child.stdin.on("finish", () =>
        queueMicrotask(() => {
          const protectedText = JSON.parse(
            received.slice(received.lastIndexOf("\n") + 1),
          );
          child.stdout.write(
            JSON.stringify({
              type: "item.completed",
              item: { type: "agent_message", text: protectedText },
            }) + "\n",
          );
          child.stdout.write(JSON.stringify({ type: "turn.completed" }) + "\n");
          child.emit("close", 0);
        }),
      );
      return child;
    },
  });
  const original =
    "Unverified result. `变量名 += 1`\n```js\nconst 示例 = 2;\n```";
  assert.equal(await service.translate(original, "output"), original);
  assert.match(received, /faithfully into Japanese/);
  assert.match(received, /Never strengthen a claim/);
});
test("translation protects fenced and inline code byte-for-byte and rejects missing placeholders", () => {
  const text = "解释 `a += 1`\n```js\nconst x = '中文';\n```";
  const protectedText = protectCode(text);
  assert.ok(!protectedText.text.includes("a += 1"));
  assert.equal(
    protectedText.restore(protectedText.text.replace("解释", "Explain")),
    text.replace("解释", "Explain"),
  );
  assert.throws(() => protectedText.restore("lost code"), /protected code/);
  assert.throws(
    () => protectedText.restore(protectedText.text + protectedText.text),
    /protected code/,
  );
});
test("Codex translation uses subscription auth, a separate directory and read-only ephemeral calls", () => {
  const args = translationArgs("/translation/only", "test-model");
  assert.ok(args.includes("--ignore-user-config"));
  assert.ok(args.includes("--ephemeral"));
  assert.ok(args.includes('forced_login_method="chatgpt"'));
  assert.equal(args[args.indexOf("--sandbox") + 1], "read-only");
  assert.equal(args[args.indexOf("-C") + 1], "/translation/only");
  assert.equal(args[args.indexOf("--model") + 1], "test-model");
  assert.equal(args.at(-1), "-");
  assert.equal(validateTranslation().provider, "codex");
});
