import test from "node:test";
import assert from "node:assert/strict";
import { initialState, reduceEvent } from "../shared/state.mjs";
const ev = (method, params = {}, id) => ({
  method,
  params,
  ...(id === undefined ? {} : { id }),
});
test("real lifecycle: tool classification, approvals take precedence, stream, completion", () => {
  let s = reduceEvent(
    initialState(),
    ev("turn/started", { turn: { id: "t" } }),
  );
  assert.equal(s.busy, true);
  s = reduceEvent(
    s,
    ev("item/started", {
      item: {
        id: "read",
        type: "commandExecution",
        commandActions: [{ type: "read" }],
      },
    }),
  );
  assert.equal(s.phase, "reading");
  s = reduceEvent(
    s,
    ev("item/commandExecution/requestApproval", { itemId: "read" }, 7),
  );
  assert.equal(s.phase, "approval");
  s = reduceEvent(s, ev("item/agentMessage/delta", { delta: "hello" }));
  assert.equal(s.phase, "approval");
  s = reduceEvent(s, ev("serverRequest/resolved", { requestId: 7 }));
  assert.equal(s.phase, "reading");
  s = reduceEvent(s, ev("item/completed", { item: { id: "read" } }));
  s = reduceEvent(
    s,
    ev("item/started", { item: { id: "write", type: "fileChange" } }),
  );
  assert.equal(s.phase, "coding");
  s = reduceEvent(s, ev("turn/diff/updated", { diff: "+hello" }));
  assert.equal(s.diff, "+hello");
  s = reduceEvent(s, ev("turn/completed", { turn: { status: "completed" } }));
  assert.equal(s.phase, "success");
  assert.equal(s.busy, false);
});
test("failure, interrupt and disconnection are never shown as success", () => {
  for (const [status, expected] of [
    ["failed", "failure"],
    ["interrupted", "interrupted"],
  ]) {
    const s = reduceEvent(
      initialState(),
      ev("turn/completed", { turn: { status, error: { message: "test" } } }),
    );
    assert.equal(s.phase, expected);
  }
  let s = reduceEvent(initialState(), ev("anything/request", {}, 9));
  s = reduceEvent(s, ev("client/disconnected", { message: "pipe closed" }));
  assert.equal(s.phase, "failure");
  assert.deepEqual(s.pending, []);
});
test("concurrent approval resolution preserves remaining requests", () => {
  let s = reduceEvent(initialState(), ev("approval", {}, 1));
  s = reduceEvent(s, ev("approval", {}, 2));
  s = reduceEvent(s, ev("serverRequest/resolved", { requestId: 1 }));
  assert.equal(s.pending.length, 1);
  assert.equal(s.pending[0].id, 2);
});
