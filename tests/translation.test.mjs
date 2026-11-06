import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const {
  protectCode,
  translationArgs,
  validateTranslation,
} = require("../electron/translation.cjs");
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
