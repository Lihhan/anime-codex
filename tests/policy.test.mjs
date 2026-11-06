import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const {
  threadOptions,
  chatOptions,
  approvalResult,
} = require("../electron/policy.cjs");
test("chat always uses read-only with no shell, escalations or inherited integrations", () => {
  const p = chatOptions(process.cwd(), "persona", {
    mcp_servers: {
      "local.files": { command: "fixture", tool_timeout_sec: null },
    },
    plugins: { "example@market": {} },
    apps: { github: {} },
  });
  assert.equal(p.sandbox, "read-only");
  assert.equal(p.approvalPolicy, "never");
  assert.equal(p.config["features.shell_tool"], false);
  assert.equal(p.config.mcp_servers["local.files"].enabled, false);
  assert.equal(p.config.mcp_servers["local.files"].command, "fixture");
  assert.equal(p.config.mcp_servers["local.files"].tool_timeout_sec, undefined);
  assert.equal(p.config.plugins["example@market"].enabled, false);
  assert.equal(p.config.apps.github.enabled, false);
  assert.equal(p.config.project_doc_max_bytes, 0);
  assert.ok(p.developerInstructions.includes("no project selected"));
  assert.throws(() => chatOptions("relative", "persona"));
});
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
