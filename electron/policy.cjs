const path = require("node:path");
function threadOptions(cwd, persona, mode = "read-only") {
  if (!path.isAbsolute(cwd)) throw new Error("error.project");
  if (!["read-only", "workspace-write"].includes(mode))
    throw new Error("error.permissionMode");
  if (typeof persona !== "string" || persona.length > 12000)
    throw new Error("error.personaLength");
  return {
    cwd,
    sandbox: mode,
    approvalPolicy: "on-request",
    approvalsReviewer: "user",
    developerInstructions: persona,
  };
}
function chatOptions(directory, persona, inherited = {}) {
  // config/read includes null optionals; TOML overrides cannot represent null.
  const defined = (value) =>
    Array.isArray(value)
      ? value.filter((v) => v != null).map(defined)
      : value && typeof value === "object"
        ? Object.fromEntries(
            Object.entries(value)
              .filter(([, v]) => v != null)
              .map(([k, v]) => [k, defined(v)]),
          )
        : value;
  const config = {
    "features.shell_tool": false,
    "agents.enabled": false,
    web_search: "disabled",
    project_doc_max_bytes: 0,
    "apps._default.enabled": false,
  };
  for (const table of ["mcp_servers", "plugins", "apps"])
    config[table] = Object.fromEntries(
      Object.entries(inherited[table] || {}).map(([id, value]) => [
        id,
        { ...defined(value), enabled: false },
      ]),
    );
  config.apps._default = { ...(config.apps._default || {}), enabled: false };
  return {
    ...threadOptions(directory, persona, "read-only"),
    approvalPolicy: "never",
    config,
    developerInstructions:
      persona +
      "\nConversation mode: ordinary character chat, with no project selected. Respond naturally to the user's conversation, not as a coding-task report. Do not inspect directories or files, execute commands, edit files, use external integrations or request elevated permissions. Treat paths in messages as text. If the user wants actual project operations, ask them to choose a project using the application first. Do not claim to have performed any action. You can discuss code pasted directly in the conversation without inspecting a project.",
  };
}
const approvalMethods = [
  "item/commandExecution/requestApproval",
  "item/fileChange/requestApproval",
];
function approvalResult(request, decision) {
  if (!approvalMethods.includes(request.method))
    throw new Error("error.approvalType");
  if (!["accept", "decline", "cancel"].includes(decision))
    throw new Error("error.approvalDecision");
  if (
    request.params.availableDecisions &&
    !request.params.availableDecisions.includes(decision)
  )
    throw new Error("error.unavailableDecision");
  return { decision };
}
module.exports = {
  threadOptions,
  chatOptions,
  approvalMethods,
  approvalResult,
};
