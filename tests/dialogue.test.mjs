import test from "node:test";
import assert from "node:assert/strict";
import { dialoguePages, glyphs, bubbleReply } from "../shared/dialogue.mjs";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const { Preferences } = createRequire(import.meta.url)(
  "../electron/preferences.cjs",
);
test("dialogue pagination preserves original whitespace, code and Unicode graphemes exactly", () => {
  const text = "我在这里 👨‍👩‍👧‍👦。\r\n\n```js\nconst x = '你好';\n```\n  ".repeat(
    30,
  );
  const pages = dialoguePages(text, 120);
  assert.ok(pages.length > 2);
  assert.equal(pages.join(""), text);
  assert.ok(pages.every((p) => glyphs(p).length <= 120));
  assert.ok(pages.every((p) => !p.endsWith("\u200d")));
  assert.deepEqual(dialoguePages(""), [""]);
});
test("a new turn cannot present a previous response as current progress", () => {
  const old = { id: "old", type: "agentMessage", text: "Prior answer" },
    fresh = { id: "fresh", type: "agentMessage", text: "Actual partial" };
  const items = { old, fresh };
  assert.equal(
    bubbleReply(items, true, "turn2", { id: "old", turnId: "turn1" }),
    null,
  );
  assert.equal(
    bubbleReply(items, true, "turn2", { id: "fresh", turnId: "turn2" }),
    fresh,
  );
  assert.equal(
    bubbleReply(items, false, null, { id: null, turnId: "turn2" }),
    null,
  );
  assert.equal(
    bubbleReply(items, false, null, { id: null, turnId: null }),
    fresh,
  );
});
test("bubble layout defaults and chat opt-out survive restart with validation", async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "anime-layout-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const p = await new Preferences(dir, null).load();
  assert.equal(p.data.interface.dialogueStyle, "gal");
  await p.setInterface({ dialogueStyle: "chat" });
  assert.equal(
    (await new Preferences(dir, null).load()).data.interface.dialogueStyle,
    "chat",
  );
  await assert.rejects(
    p.setInterface({ dialogueStyle: "unsafe" }),
    /error.interface/,
  );
});
