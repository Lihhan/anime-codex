const defaults = ["read", "gaming", "office", "meal"];
export function chooseLifeActivity({
  previous = "idle",
  activities = defaults,
  wander = true,
  wanderChance = 0.16,
  random = Math.random,
} = {}) {
  const choices = activities.filter(
    (x) =>
      ["read", "gaming", "office", "meal", "sleep"].includes(x) &&
      x !== previous,
  );
  const pool = choices.length
    ? choices
    : defaults.filter((x) => x !== previous);
  const action =
    wander && random() < wanderChance
      ? "walk"
      : pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
  return {
    action,
    duration:
      action === "walk" ? 8000 + random() * 6000 : 45000 + random() * 75000,
  };
}
export const tourSteps = [
  {
    id: "chat",
    text: "先认识一下吧。点下面的聊天按钮，给我发一句话，我会认真听。",
    event: "message",
  },
  {
    id: "tasks",
    text: "有事情要交给我时，点任务按钮。先打开看看，再点「了解任务分发」，我告诉你任务会去哪里。",
    event: "tasks-understood",
  },
  {
    id: "life",
    text: "工作之外也陪我做点什么吧。点爱心，在环绕我的图标里选一个动作。",
    event: "activity",
  },
  {
    id: "settings",
    text: "最后，把我调成你喜欢的大小。点设置，拖动大小滑杆；也可以试试安静陪伴。",
    event: "preference",
  },
];
export function advanceTour(step, event) {
  return tourSteps[step]?.event === event ? step + 1 : step;
}
