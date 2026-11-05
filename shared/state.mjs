export const labels = {
  idle: "在这里，随时开始",
  listening: "我在听",
  thinking: "让我想一想",
  reading: "正在读代码",
  coding: "正在执行任务",
  approval: "需要你的决定",
  speaking: "正在回复",
  success: "本轮已完成",
  failure: "遇到了一点问题",
  interrupted: "已停止",
};
export function initialState() {
  return {
    phase: "idle",
    active: {},
    pending: [],
    turnId: null,
    busy: false,
    diff: "",
    plan: [],
    error: null,
  };
}
export function activity(item) {
  if (item.type === "fileChange") return "coding";
  if (item.type === "commandExecution")
    return item.commandActions?.length &&
      item.commandActions.every((a) =>
        ["read", "listFiles", "search"].includes(a.type),
      )
      ? "reading"
      : "coding";
  if (item.type === "webSearch" || item.type === "mcpToolCall")
    return "reading";
  return "thinking";
}
export function reduceEvent(s, e) {
  const p = e.params || {};
  let n = { ...s, active: { ...s.active }, pending: [...s.pending] };
  if (e.id !== undefined && e.method) {
    n.pending.push(e);
  }
  if (e.method === "serverRequest/resolved") {
    n.pending = n.pending.filter((r) => String(r.id) !== String(p.requestId));
    if (!n.pending.length && n.busy) n.phase = "thinking";
  }
  if (e.method === "turn/started") {
    n.busy = true;
    n.turnId = p.turn.id;
    n.error = null;
    n.phase = "thinking";
    n.diff = "";
    n.plan = [];
  }
  if (e.method === "item/started") n.active[p.item.id] = p.item;
  if (e.method === "item/completed") delete n.active[p.item.id];
  if (e.method === "turn/diff/updated") n.diff = p.diff;
  if (e.method === "turn/plan/updated") n.plan = p.plan;
  if (e.method === "item/agentMessage/delta" && !n.pending.length)
    n.phase = "speaking";
  const active = Object.values(n.active).filter(
    (i) => i.type !== "agentMessage",
  );
  if (n.busy && active.length) n.phase = activity(active.at(-1));
  if (n.pending.length) n.phase = "approval";
  if (e.method === "turn/completed") {
    n.busy = false;
    n.turnId = null;
    n.active = {};
    n.pending = [];
    n.error = p.turn.error || null;
    n.phase =
      p.turn.status === "completed"
        ? "success"
        : p.turn.status === "interrupted"
          ? "interrupted"
          : "failure";
  }
  if (e.method === "client/disconnected") {
    n.busy = false;
    n.pending = [];
    n.active = {};
    n.phase = "failure";
    n.error = { message: p.message };
  }
  return n;
}
