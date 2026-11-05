import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough, Writable } from "node:stream";
import { createRequire } from "node:module";
const { Rpc } = createRequire(import.meta.url)("../electron/rpc.cjs");
function fake() {
  const c = new EventEmitter();
  c.stdout = new PassThrough();
  c.stderr = new PassThrough();
  c.messages = [];
  c.stdin = new Writable({
    write(b, _e, cb) {
      const m = JSON.parse(b);
      c.messages.push(m);
      if (m.method && m.id)
        c.stdout.write(
          JSON.stringify({
            id: m.id,
            result:
              m.method === "initialize" ? { userAgent: "test" } : { ok: true },
          }) + "\n",
        );
      cb();
    },
  });
  c.kill = () => c.emit("exit", 0);
  return c;
}
test("handshake, bidirectional request ids, UTF-8 split frames, errors and exit cleanup", async () => {
  const c = fake();
  const rpc = new Rpc("test", () => c);
  let disconnected = false;
  rpc.on("disconnect", () => (disconnected = true));
  await rpc.start();
  assert.equal(c.messages[0].method, "initialize");
  assert.equal(c.messages[1].method, "initialized");
  assert.deepEqual(await rpc.request("thread/start"), { ok: true });
  const events = [];
  rpc.on("event", (m) => events.push(m));
  const frame = Buffer.from(
    JSON.stringify({
      method: "item/agentMessage/delta",
      params: { delta: "你好" },
    }) + "\n",
  );
  c.stdout.write(frame.subarray(0, frame.length - 4));
  c.stdout.write(frame.subarray(frame.length - 4));
  c.stdout.write(
    '{"id":42,"method":"item/fileChange/requestApproval","params":{}}\n',
  );
  await new Promise((r) => setImmediate(r));
  assert.equal(events[0].params.delta, "你好");
  assert.equal(events[1].id, 42);
  rpc.reply(42, { decision: "decline" });
  assert.deepEqual(c.messages.at(-1), {
    id: 42,
    result: { decision: "decline" },
  });
  rpc.reject(43);
  assert.equal(c.messages.at(-1).error.code, -32601);
  rpc.close();
  assert.equal(disconnected, true);
  assert.equal(rpc.pending.size, 0);
});
test("server errors become rejected promises and invalid stdout is diagnostic", async () => {
  const c = fake();
  const rpc = new Rpc("test", () => c);
  await rpc.start();
  let diag = false;
  rpc.on("diagnostic", () => (diag = true));
  c.stdout.write("invalid json\n");
  await new Promise((r) => setImmediate(r));
  assert.equal(diag, true);
  c.stdin = new Writable({
    write(b, _e, cb) {
      const m = JSON.parse(b);
      c.stdout.write(
        JSON.stringify({ id: m.id, error: { code: -1, message: "denied" } }) +
          "\n",
      );
      cb();
    },
  });
  await assert.rejects(rpc.request("test"), /denied/);
  rpc.close();
});
