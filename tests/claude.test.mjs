import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { EventEmitter, once } from "node:events";
import { PassThrough } from "node:stream";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { ClaudeBackend } = require("../electron/claude.cjs");
const {
  loginEnvironment,
  claudeArguments,
} = require("../electron/claude-environment.cjs");
const tick = () => new Promise((resolve) => setImmediate(resolve));
async function harness(t, translate = async (text) => text) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "claude-test-"));
  const frames = [],
    events = [],
    launches = [];
  let child;
  const env = {
    HOME: "/user/home",
    PATH: "/original/bin",
    TZ: "Asia/Tokyo",
    HTTPS_PROXY: "http://proxy.local:8080",
    ANTHROPIC_BASE_URL: "https://endpoint.test",
    CUSTOM_VALUE: "unchanged",
  };
  const backend = new ClaudeBackend({
    executable: "/native/claude",
    directory,
    env,
    translator: { config: { enabled: true }, translate },
    spawnFn: (exe, args, options) => {
      launches.push({ exe, args, options });
      child = new EventEmitter();
      child.stdin = new PassThrough();
      child.stdout = new PassThrough();
      child.stderr = new PassThrough();
      child.kill = () => {
        child.exitCode = 0;
        child.emit("exit", 0);
      };
      child.stdin.on("data", (data) => {
        for (const line of data.toString().trim().split("\n")) {
          const frame = JSON.parse(line);
          frames.push(frame);
          if (frame.type === "control_request")
            queueMicrotask(() =>
              child.stdout.write(
                JSON.stringify({
                  type: "control_response",
                  response: {
                    subtype: "success",
                    request_id: frame.request_id,
                    response: {},
                  },
                }) + "\n",
              ),
            );
        }
      });
      return child;
    },
  });
  backend.on("event", (e) => events.push(e));
  t.after(async () => {
    backend.close();
    await backend.saveQueue;
    await fs.rm(directory, { recursive: true, force: true });
  });
  const { thread } = await backend.request("thread/start", {
    cwd: directory,
    developerInstructions: "Persona",
  });
  const send = async () => {
    await backend.request("turn/start", {
      threadId: thread.id,
      input: [{ text: "中文请求" }],
    });
    for (let i = 0; i < 20 && !frames.some((f) => f.type === "user"); i++) {
      await tick();
      await new Promise((r) => setTimeout(r, 2));
    }
  };
  return { backend, thread, frames, events, launches, env, send, directory };
}
test("Claude inherits exported environment and launches without permission, network or timezone overrides", async (t) => {
  const h = await harness(t, async (text) => "English: " + text);
  await h.send();
  assert.deepEqual(h.launches[0].options.env, h.env);
  assert.equal(h.launches[0].options.cwd, h.directory);
  assert.equal(h.launches[0].options.shell, false);
  assert.equal(
    h.frames.find((f) => f.type === "user").message.content,
    "English: 中文请求",
  );
  const args = h.launches[0].args;
  for (const forbidden of [
    "--permission-mode",
    "--dangerously-skip-permissions",
    "--allowedTools",
    "--settings",
    "--setting-sources",
    "--restricted",
    "--bare",
    "--strict-mcp-config",
  ])
    assert.ok(!args.includes(forbidden), forbidden);
  assert.deepEqual(claudeArguments({ id: "id", started: true }).slice(-2), [
    "--resume",
    "id",
  ]);
});
test("login shell exports are captured without losing proxy, HOME or timezone", async () => {
  const result = await loginEnvironment({
    platform: "darwin",
    env: { SHELL: "/bin/zsh" },
    run: async (exe, args, options) => {
      assert.equal(exe, "/bin/zsh");
      assert.equal(args[0], "-ilc");
      assert.deepEqual(options.env, { SHELL: "/bin/zsh" });
      return {
        stdout:
          "startup banner\nANIME_CLAUDE_ENV_START\0HOME=/home/test\0TZ=Asia/Tokyo\0HTTPS_PROXY=http://p:1\0CUSTOM=a=b\0",
      };
    },
  });
  assert.deepEqual(result, {
    HOME: "/home/test",
    TZ: "Asia/Tokyo",
    HTTPS_PROXY: "http://p:1",
    CUSTOM: "a=b",
  });
});
test("input translation failure does not launch Claude or send original prompt", async (t) => {
  const h = await harness(t, async () => {
    throw new Error("Translation unavailable");
  });
  await h.send();
  assert.equal(h.launches.length, 0);
  assert.equal(
    h.events.find((e) => e.method === "turn/completed").params.turn.status,
    "failed",
  );
});
test("permission requests require an explicit live decision and never write persistent grants", async (t) => {
  const h = await harness(t);
  await h.send();
  const input = { command: "echo approved" };
  h.backend.receive({
    type: "control_request",
    request_id: "approve-1",
    request: { subtype: "can_use_tool", tool_name: "Bash", input },
  });
  assert.ok(h.events.some((e) => e.id === "approve-1"));
  assert.ok(!h.frames.some((f) => f.type === "control_response"));
  h.backend.reply("approve-1", { decision: "accept" });
  assert.deepEqual(h.frames.at(-1).response.response, {
    behavior: "allow",
    updatedInput: input,
  });
  assert.throws(
    () => h.backend.reply("approve-1", { decision: "accept" }),
    /expired/,
  );
});
test("AskUserQuestion answers preserve the tool input and question mapping", async (t) => {
  const h = await harness(t);
  await h.send();
  h.backend.receive({
    type: "control_request",
    request_id: "ask",
    request: {
      subtype: "can_use_tool",
      tool_name: "AskUserQuestion",
      input: { questions: [{ question: "Which option?", header: "Choice" }] },
    },
  });
  h.backend.reply("ask", { answers: { 0: { answers: ["Option A"] } } });
  assert.deepEqual(h.frames.at(-1).response.response.updatedInput.answers, {
    "Which option?": "Option A",
  });
});
test("reply translation failure preserves English and actual successful task status", async (t) => {
  const h = await harness(t, async (text, direction) => {
    if (direction === "output") throw new Error("Quota");
    return text;
  });
  await h.send();
  h.backend.receive({
    type: "assistant",
    message: {
      id: "reply",
      content: [{ type: "text", text: "Actual reply." }],
    },
  });
  h.backend.receive({ type: "result", subtype: "success", is_error: false });
  await h.backend.outputQueue;
  const item =
    h.thread.id &&
    h.backend.records[0].turns[0].items.find((i) => i.id === "reply");
  assert.equal(item.text, "Actual reply.");
  assert.equal(item.originalText, "Actual reply.");
  assert.ok(item.translationError);
  assert.equal(h.backend.records[0].turns[0].status, "completed");
});
test("stop during translation aborts work, clears approvals and prevents stale replies", async (t) => {
  let rejectTranslation;
  const h = await harness(t, (text, direction, signal) =>
    direction === "input"
      ? Promise.resolve(text)
      : new Promise((resolve, reject) => {
          rejectTranslation = reject;
          signal.addEventListener(
            "abort",
            () => reject(new Error("cancelled")),
            { once: true },
          );
        }),
  );
  await h.send();
  h.backend.receive({
    type: "assistant",
    message: { id: "late", content: [{ type: "text", text: "Late reply." }] },
  });
  await tick();
  h.backend.receive({
    type: "control_request",
    request_id: "parallel",
    request: { subtype: "can_use_tool", tool_name: "Bash", input: {} },
  });
  assert.ok(
    h.events.some((e) => e.id === "parallel"),
    "approval is not blocked by translation",
  );
  h.backend.interrupt();
  await h.backend.outputQueue;
  assert.ok(rejectTranslation);
  assert.equal(h.backend.pending.size, 0);
  assert.equal(h.backend.records[0].turns[0].status, "interrupted");
  assert.ok(
    !h.events.some(
      (e) =>
        e.method === "item/completed" &&
        e.params.item.id === "late" &&
        e.params.item.translated,
    ),
  );
  assert.equal(
    h.backend.records[0].turns[0].items.find((i) => i.id === "late").text,
    "Late reply.",
  );
});
test("real tool errors are preserved verbatim and backend failures are not shown as success", async (t) => {
  const h = await harness(t);
  await h.send();
  h.backend.receive({
    type: "assistant",
    message: {
      content: [
        {
          type: "tool_use",
          id: "tool",
          name: "Read",
          input: { file_path: "/missing" },
        },
      ],
    },
  });
  h.backend.receive({
    type: "user",
    message: {
      content: [
        {
          type: "tool_result",
          tool_use_id: "tool",
          content: "ENOENT",
          is_error: true,
        },
      ],
    },
  });
  h.backend.receive({
    type: "result",
    subtype: "error_during_execution",
    is_error: true,
    errors: ["Backend failed"],
  });
  await h.backend.outputQueue;
  const turn = h.backend.records[0].turns[0];
  assert.equal(
    turn.items.find((i) => i.id === "tool").aggregatedOutput,
    "ENOENT",
  );
  assert.equal(turn.status, "failed");
});
test("streamed originals remain inspectable while Chinese translation waits for a complete message", async (t) => {
  const h = await harness(t, async (text, direction) =>
    direction === "output" ? "中文回复" : text,
  );
  await h.send();
  h.backend.receive({
    type: "stream_event",
    event: { type: "message_start", message: { id: "stream" } },
  });
  h.backend.receive({
    type: "stream_event",
    event: {
      type: "content_block_delta",
      delta: { type: "text_delta", text: "English" },
    },
  });
  const partial = h.backend.records[0].turns[0].items.find(
    (i) => i.id === "stream",
  );
  assert.equal(partial.originalText, "English");
  assert.equal(partial.text, "");
  h.backend.receive({
    type: "assistant",
    message: { id: "stream", content: [{ type: "text", text: "English" }] },
  });
  await h.backend.outputQueue;
  assert.equal(partial.text, "中文回复");
  assert.equal(partial.originalText, "English");
});
