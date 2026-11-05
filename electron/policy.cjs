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
module.exports = { threadOptions, approvalMethods, approvalResult };
