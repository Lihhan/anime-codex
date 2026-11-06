import { createRequire } from "node:module";
import fs from "node:fs/promises";
const require = createRequire(import.meta.url),
  { Rpc } = require("../electron/rpc.cjs"),
  { loginEnvironment } = require("../electron/claude-environment.cjs");
const env = { ...process.env };
delete env.CODEX_HOME; // Match Finder launch, not this developer agent's alternate account.
const inherited = await loginEnvironment({ env });
const rpc = new Rpc(
  process.env.HOME + "/.local/bin/codex",
  undefined,
  inherited,
);
try {
  await rpc.start();
  const t = await rpc.request("thread/start", { cwd: process.cwd() });
  console.log(
    JSON.stringify({
      model: t.model,
      effort: t.reasoningEffort,
      sandbox: t.sandbox,
      approval: t.approvalPolicy,
    }),
  );
  const status = await rpc.request("mcpServerStatus/list", {});
  const sanitized = status.data.map((s) => ({
    name: s.name,
    authStatus: s.authStatus,
    tools: Object.keys(s.tools || {}),
  }));
  console.log(JSON.stringify(sanitized));
  await fs.writeFile(
    "test-results/codex-capabilities.json",
    JSON.stringify(
      {
        model: t.model,
        effort: t.reasoningEffort,
        sandbox: t.sandbox,
        approval: t.approvalPolicy,
        mcp: sanitized,
      },
      null,
      2,
    ),
  );
} finally {
  rpc.close();
}
