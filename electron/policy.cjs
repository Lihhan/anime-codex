const path = require("node:path");
function threadOptions(cwd, persona, mode = "read-only") {
  if (!path.isAbsolute(cwd)) throw new Error("请选择绝对路径的项目目录");
  if (!["read-only", "workspace-write"].includes(mode))
    throw new Error("不支持的权限模式");
  if (typeof persona !== "string" || persona.length > 12000)
    throw new Error("角色设定过长");
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
    throw new Error("此请求需要专用回复");
  if (!["accept", "decline", "cancel"].includes(decision))
    throw new Error("只支持单次批准、拒绝或取消");
  if (
    request.params.availableDecisions &&
    !request.params.availableDecisions.includes(decision)
  )
    throw new Error("服务器未提供此决定");
  return { decision };
}
module.exports = { threadOptions, approvalMethods, approvalResult };
