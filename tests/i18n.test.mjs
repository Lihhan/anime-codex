import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createTranslator, responseLanguage } from "../shared/i18n.mjs";
const messages = JSON.parse(
  await fs.readFile(
    new URL("../shared/messages.json", import.meta.url),
    "utf8",
  ),
);
test("all supported languages cover every UI key and preserve interpolation variables", () => {
  const keys = Object.keys(messages.en).sort();
  for (const language of ["zh", "en", "ja"]) {
    assert.deepEqual(Object.keys(messages[language]).sort(), keys);
    for (const key of keys) {
      assert.ok(messages[language][key]);
      assert.deepEqual(
        (messages[language][key].match(/\{\w+\}/g) || []).sort(),
        (messages.en[key].match(/\{\w+\}/g) || []).sort(),
      );
    }
  }
  assert.equal(
    createTranslator("en")("Chat with {name}", { name: "Alice" }),
    "Chat with Alice",
  );
  assert.equal(createTranslator("ja")("Language"), "言語");
  assert.match(responseLanguage("en"), /English/);
  assert.match(responseLanguage("ja"), /Japanese/);
});
test("UI translation calls all resolve, including native errors", async () => {
  const source = await fs.readFile(
    new URL("../src/main.jsx", import.meta.url),
    "utf8",
  );
  for (const match of source.matchAll(/\bt\(["']([^"']+)["']/g)) {
    if (match[1].endsWith(".")) continue;
    assert.ok(messages.en[match[1]], "Missing key: " + match[1]);
  }
});
