import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { threadOptions, approvalResult } = require("../electron/policy.cjs");
test("permissions remain bounded and never silently enable full access", () => {
  const p = threadOptions(process.cwd(), "persona");
  assert.equal(p.sandbox, "read-only");
  assert.equal(p.approvalPolicy, "on-request");
  assert.equal(p.approvalsReviewer, "user");
  assert.equal(p.baseInstructions, undefined);
  assert.throws(() => threadOptions("relative", "x"));
  assert.throws(() => threadOptions(process.cwd(), "x", "danger-full-access"));
  assert.throws(() => threadOptions(process.cwd(), "a".repeat(12001)));
});
test("only a valid one-time decision can answer an existing supported approval", () => {
  const r = {
    method: "item/commandExecution/requestApproval",
    params: { availableDecisions: ["decline", "accept"] },
  };
  assert.deepEqual(approvalResult(r, "accept"), { decision: "accept" });
  assert.throws(() => approvalResult(r, "acceptForSession"));
  assert.throws(() => approvalResult(r, { acceptWithExecpolicyAmendment: {} }));
  assert.throws(() => approvalResult({ method: "unknown" }, "accept"));
  assert.throws(() =>
    approvalResult(
      { ...r, params: { availableDecisions: ["decline"] } },
      "accept",
    ),
  );
});
