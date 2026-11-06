import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { CompanionStore } = require("../electron/companion-store.cjs");
const { FileMeals } = require("../electron/companion-files.cjs");
const { TaskManager } = require("../electron/companion-tasks.cjs");
const { Companion } = require("../electron/companion.cjs");
async function setup(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "companion-test-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return {
    dir,
    store: await new CompanionStore(path.join(dir, "data")).load(),
  };
}
async function until(fn) {
  const deadline = Date.now() + 15000;
  while (!fn()) {
    if (Date.now() > deadline) throw Error("timed out");
    await new Promise((r) => setTimeout(r, 10));
  }
}
test("history survives restart, searches older messages, and isolates character memories", async (t) => {
  const { store } = await setup(t);
  await store.memory({ text: "喜欢薄荷绿", characterId: "a" });
  await store.memory({ text: "不应跨角色出现", characterId: "b" });
  await store.addMessage("user", "旧日约定香蕉", { characterId: "a" });
  for (let n = 0; n < 25; n++)
    await store.addMessage("user", "日常" + n, { characterId: "a" });
  const reload = await new CompanionStore(store.directory).load();
  assert.equal(reload.history("a").length, 26);
  assert.equal(reload.context("a", "香蕉").recalled[0].text, "旧日约定香蕉");
  assert.equal(reload.context("a", "").memories.length, 1);
  assert.equal(reload.history("b").length, 0);
});
test("food uses trash, exact restore, rejects overwrites, symlinks, and changed files", async (t) => {
  const { store, dir } = await setup(t);
  const original = path.join(dir, "snack.txt");
  await fs.writeFile(original, "hello");
  const meals = new FileMeals(store, {
    trashItem: (f) => fs.rename(f, path.join(dir, "trashed.txt")),
  });
  const preview = await meals.inspect([original]);
  const [m] = await meals.eat(preview);
  assert.equal(m.status, "eaten");
  await assert.rejects(fs.access(original));
  await meals.restore(m.id);
  assert.equal(await fs.readFile(original, "utf8"), "hello");
  assert.equal(
    await fs.readFile(path.join(dir, "trashed.txt"), "utf8"),
    "hello",
  );
  await assert.rejects(meals.restore(m.id));
  const link = path.join(dir, "link");
  await fs.symlink(original, link);
  await assert.rejects(meals.inspect([link]));
  const second = await meals.inspect([original]);
  await fs.writeFile(original, "changed");
  const [failed] = await meals.eat(second);
  assert.equal(failed.status, "failed");
  assert.equal(await fs.readFile(original, "utf8"), "changed");
});
class Fake extends EventEmitter {
  async start() {}
  async request(method, p) {
    if (method === "thread/start" || method === "thread/resume")
      return { thread: { id: p.threadId || "thread-" + Math.random() } };
    if (method === "turn/start") {
      this.emit("event", {
        method: "turn/started",
        params: { turn: { id: "turn-1" } },
      });
      this.prompt = p;
      return { turn: { id: "turn-1" } };
    }
  }
  reply(id, result) {
    this.replyValue = { id, result };
  }
  reject() {}
  close() {}
  finish() {
    this.emit("event", {
      method: "item/completed",
      params: {
        item: {
          type: "commandExecution",
          command: "node check.mjs",
          exitCode: 0,
          status: "completed",
        },
      },
    });
    this.emit("event", {
      method: "item/completed",
      params: { item: { type: "agentMessage", text: "Done" } },
    });
    this.emit("event", {
      method: "turn/completed",
      params: { turn: { id: "turn-1", status: "completed" } },
    });
  }
}
test("same workspace is serial, different workspace can run, evidence stays unverified and threads resume", async (t) => {
  const { store, dir } = await setup(t);
  const other = path.join(dir, "other");
  await fs.mkdir(other);
  const connections = [];
  const manager = new TaskManager({
    store,
    notify: () => {},
    onFinish: async () => {},
    createConnection: async () => {
      const c = new Fake();
      connections.push(c);
      return c;
    },
  });
  t.after(() => manager.close());
  const one = await manager.create({
      workspace: dir,
      prompt: "a",
      characterId: "a",
    }),
    two = await manager.create({
      workspace: dir,
      prompt: "b",
      characterId: "a",
    }),
    three = await manager.create({
      workspace: other,
      prompt: "c",
      engine: "claude",
      characterId: "a",
    });
  await until(
    () => connections.length === 2 && connections.every((c) => c.prompt),
  );
  assert.equal(two.status, "queued");
  connections[0].finish();
  connections[1].finish();
  await until(() => connections.length === 3 && connections[2].prompt);
  connections[2].finish();
  await until(() => manager.active.size === 0);
  assert.equal(one.status, "completed");
  assert.equal(one.verification, "unverified");
  assert.equal(one.events[0].exitCode, 0);
  const thread = one.threadId;
  await manager.resume(one.id, "followup");
  await until(() => connections.length === 4 && connections[3].prompt);
  assert.equal(one.threadId, thread);
  connections[3].finish();
  await until(() => manager.active.size === 0);
});
test("permission requests pause tasks, answers are single use, cancellation survives reload", async (t) => {
  const { store, dir } = await setup(t);
  let c;
  const manager = new TaskManager({
    store,
    notify: () => {},
    onFinish: async () => {},
    createConnection: async () => (c = new Fake()),
  });
  t.after(() => manager.close());
  const job = await manager.create({ workspace: dir, prompt: "a" });
  await until(() => c?.prompt);
  c.emit("event", {
    id: 9,
    method: "item/commandExecution/requestApproval",
    params: {
      command: "ssh server hostname",
      availableDecisions: ["accept", "decline"],
    },
  });
  assert.equal(job.status, "waiting");
  await manager.answer({ taskId: job.id, id: 9, decision: "accept" });
  assert.deepEqual(c.replyValue, { id: 9, result: { decision: "accept" } });
  await assert.rejects(
    manager.answer({ taskId: job.id, id: 9, decision: "accept" }),
  );
  await manager.cancel(job.id);
  await until(() => !manager.active.size);
  assert.equal(job.status, "interrupted");
  const loaded = await new CompanionStore(store.directory).load();
  assert.equal(loaded.state.tasks[0].status, "interrupted");
});
test("role brain cannot execute, proposed memories require confirmation, task can run independently", async (t) => {
  const { dir } = await setup(t);
  const profile = { id: "a", name: "小苔", persona: "温和" };
  const companion = await new Companion({
    directory: path.join(dir, "comp"),
    preferences: { data: { activeCharacter: "a" }, find: () => profile },
    emit: () => {},
    shell: {},
    brain: async () =>
      JSON.stringify({
        reply: "记在建议里了。",
        memories: ["喜欢薄荷绿"],
        task: null,
      }),
  }).load();
  t.after(() => companion.close());
  await companion.message("我喜欢薄荷绿");
  assert.equal(companion.snapshot().messages.length, 2);
  assert.equal(companion.store.state.memories[0].status, "suggested");
  assert.equal(companion.store.context("a", "").memories.length, 0);
});

test("a torn final history append is repaired before a new append", async (t) => {
  const { store } = await setup(t);
  await store.addMessage("user", "完整记录", { characterId: "a" });
  await fs.appendFile(
    path.join(store.directory, "history.jsonl"),
    '{"partial":',
  );
  const restored = await new CompanionStore(store.directory).load();
  await restored.addMessage("assistant", "后续记录", { characterId: "a" });
  const again = await new CompanionStore(store.directory).load();
  assert.deepEqual(
    again.history("a").map((m) => m.text),
    ["完整记录", "后续记录"],
  );
});
test("background consolidation retains source cursor and original searchable history", async (t) => {
  const { dir } = await setup(t);
  const c = await new Companion({
    directory: path.join(dir, "summary"),
    preferences: { data: { activeCharacter: "a" }, find: () => ({ id: "a" }) },
    emit: () => {},
    shell: {},
    brain: async () => "用户偏好薄荷绿；还有一个未完成问题。",
  }).load();
  t.after(() => c.close());
  for (let i = 0; i < 25; i++)
    await c.store.addMessage("user", "历史" + i, { characterId: "a" });
  await c.consolidate("a");
  assert.equal(c.store.state.summaries.a.count, 25);
  assert.equal(c.store.history("a").length, 25);
  assert.ok(c.store.context("a", "").summary.text.includes("未完成"));
});
test("a failed explicit completion check is never labeled passed", async (t) => {
  const { store, dir } = await setup(t);
  let connection;
  const manager = new TaskManager({
    store,
    notify: () => {},
    onFinish: async () => {},
    createConnection: async () => (connection = new Fake()),
  });
  t.after(() => manager.close());
  const task = await manager.create({
    workspace: dir,
    prompt: "do work",
    verificationCommand: "exit 7",
  });
  await until(() => connection?.prompt);
  connection.finish();
  await until(() => !manager.active.size);
  assert.equal(task.status, "completed");
  assert.equal(task.verification, "failed");
  assert.equal(task.check.exitCode, 7);
});
test("explicit task routing starts a worker without blocking subsequent character chat", async (t) => {
  const { dir } = await setup(t);
  let count = 0,
    worker;
  const c = await new Companion({
    directory: path.join(dir, "routing"),
    preferences: {
      data: { activeCharacter: "a" },
      find: () => ({ id: "a", name: "小苔" }),
    },
    emit: () => {},
    shell: {},
    createConnection: async () => (worker = new Fake()),
    brain: async () =>
      JSON.stringify(
        ++count === 1
          ? {
              reply: "我来安排。",
              memories: [],
              task: { engine: "claude", title: "检查项目", prompt: "检查项目" },
            }
          : { reply: "任务还在进行，我在这里。", memories: [], task: null },
      ),
  }).load();
  t.after(() => c.close());
  c.store.state.settings.workspace = dir;
  await c.message("让 Claude 检查项目");
  await until(() => worker?.prompt);
  await c.message("先陪我聊聊天");
  assert.equal(c.store.state.tasks[0].engine, "claude");
  assert.equal(c.store.state.tasks[0].status, "running");
  assert.ok(c.snapshot().messages.at(-1).text.includes("我在这里"));
  worker.finish();
  await until(() => !c.tasks.active.size);
});

test('character-specific conversational guidance reaches the brain without replacing custom persona', async(t)=>{
 const {dir}=await setup(t);let received='';
 const c=await new Companion({directory:path.join(dir,'persona-check'),preferences:{data:{activeCharacter:'f'},find:()=>({id:'f',name:'芙宁娜',templateSource:'furina',persona:'用户定制：回答短一点'})},emit:()=>{},shell:{},brain:async({prompt})=>{received=prompt;return JSON.stringify({reply:'嗯，我听着。',memories:[],task:null});}}).load();
 t.after(()=>c.close());await c.message('陪我聊一会儿');assert.match(received,/Furina calibration/);assert.match(received,/用户定制：回答短一点/);assert.match(received,/never dismissive/);
});
