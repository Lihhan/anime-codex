import React, { useEffect, useRef, useState } from "react";
import {
  chooseLifeActivity,
  tourSteps,
  advanceTour,
} from "../shared/pet-life.mjs";
import { sizeValue, stepMotion } from "../shared/pet-motion.mjs";
import { gazeAt } from "../shared/pet-gaze.mjs";
import personalities from "../shared/companion-personality.json";
import { VoiceClipSettings, useVoiceClips } from "./VoiceClips";
import { CompanionIcon } from "./CompanionIcon";
import appearances from "../shared/pet-appearances.json";
import { PetSprite } from "./PetSprite";
import { ImageCharacter } from "./ImageCharacter";
import { CharacterStudio } from "./CharacterStudio";
import "./companion.css";
const api = window.animeCodex;
const labels = {
  queued: "排队中",
  running: "执行中",
  waiting: "等你回答",
  completed: "线程已完成",
  failed: "遇到问题",
  interrupted: "已中断",
};
const activities = {
  idle: "在这里陪你",
  read: "读一会儿书",
  meal: "开饭啦",
  gaming: "玩会儿游戏",
  office: "认真办公",
  walk: "散散步",
  sleep: "小憩一会儿",
  pet: "摸摸头",
  play: "一起玩吧",
  eat: "正在吃文件",
  restore: "把文件还给你",
  working: "替你照看任务",
  attention: "有件事等你决定",
};
const tabs = [
  ["chat", "聊聊"],
  ["tasks", "任务"],
  ["memory", "记忆"],
  ["life", "生活"],
  ["settings", "设置"],
];
export function CompanionApp() {
  const [boot, setBoot] = useState(null),
    [state, setState] = useState(null),
    [panel, setPanel] = useState(null),
    [chatOpen, setChatOpen] = useState(false),
    [quickMenu, setQuickMenu] = useState(null),
    [sizeCardAnchor, setSizeCardAnchor] = useState(null),
    [orbitHint, setOrbitHint] = useState("选择一个互动"),
    [styles, setStyles] = useState(() => {
      try {
        return JSON.parse(localStorage.getItem("companion.styles")) || {};
      } catch {
        return {};
      }
    }),
    [preview, setPreview] = useState(null),
    [facing, setFacing] = useState("right"),
    [petScale, setPetScale] = useState(() =>
      sizeValue(localStorage.getItem("companion.scale")),
    ),
    [text, setText] = useState(""),
    [error, setError] = useState(""),
    [activity, setActivity] = useState("idle"),
    [transitioning, setTransitioning] = useState(false),
    [tourStep, setTourStep] = useState(() => {
      const value = localStorage.getItem("companion.tour.v1");
      return value === null ? 0 : Math.max(0, Math.min(4, Number(value) || 0));
    }),
    [bubble, setBubble] = useState(""),
    [position, setPosition] = useState(() => {
      try {
        return (
          JSON.parse(localStorage.getItem("companion.position")) || {
            x: innerWidth - 245,
            y: innerHeight - 305,
          }
        );
      } catch {
        return { x: innerWidth - 245, y: innerHeight - 305 };
      }
    }),
    [dragging, setDragging] = useState(false),
    [carryMotion, setCarryMotion] = useState("rest"),
    [carryLean, setCarryLean] = useState(0),
    [meal, setMeal] = useState(null),
    [search, setSearch] = useState(""),
    [history, setHistory] = useState(null),
    [game, setGame] = useState(null),
    [models, setModels] = useState([]),
    [loadingModels, setLoadingModels] = useState(false),
    [memoryText, setMemoryText] = useState(""),
    [taskText, setTaskText] = useState(""),
    [checkCommand, setCheckCommand] = useState(""),
    [taskEngine, setTaskEngine] = useState("codex"),
    [resumeText, setResumeText] = useState({}),
    [fileBusy, setFileBusy] = useState(false),
    [settingsBusy, setSettingsBusy] = useState(false),
    [gaze, setGaze] = useState({ x: 0, y: 0 }),
    [pulse, setPulse] = useState(0),
    [mini, setMini] = useState(false);
  const velocity = useRef({ x: 42, y: 0 }),
    positionRef = useRef(position);
  positionRef.current = position;
  const petWidth = 220 * petScale,
    petHeight = 205 * petScale + 70;
  const behaviorRef = useRef(personalities.default),
    previousQuiet = useRef(false),
    nextActivity = useRef(Date.now() + 8000),
    lastTouchLine = useRef(-1);
  const activityRef = useRef(activity),
    tourRef = useRef(tourStep);
  activityRef.current = activity;
  tourRef.current = tourStep;
  const drag = useRef(null),
    stateRef = useRef(null),
    panelRef = useRef(null),
    lastInteraction = useRef(Date.now()),
    lastInvitation = useRef(Date.now()),
    bubbleTimer = useRef(null),
    activityTimer = useRef(null),
    messagesEnd = useRef(null),
    lastReport = useRef(null),
    gameTimer = useRef(null),
    mealRef = useRef(null);
  stateRef.current = state;
  panelRef.current = panel || quickMenu || (chatOpen ? "bubble" : null);
  mealRef.current = meal;
  const renderPosition = {
    x:
      panel && innerWidth > 800
        ? Math.min(position.x, innerWidth - 710)
        : Math.max(
            125 - petWidth / 2,
            Math.min(position.x, innerWidth - 125 - petWidth / 2),
          ),
    y: Math.min(position.y, innerHeight - petHeight - (chatOpen ? 65 : 12)),
  };
  const orbitRadiusX = Math.max(110, 95 * petScale + 38);
  const orbitRadiusY = Math.max(110, 102.5 * petScale + 38);
  const orbitTop = 102.5 * petScale - orbitRadiusY;
  // Reserve the outer orbit at screen edges without covering the pet.
  if (quickMenu === "life") {
    const margin = Math.max(130, orbitRadiusX + 26) - petWidth / 2;
    renderPosition.x = Math.max(
      margin,
      Math.min(renderPosition.x, innerWidth - petWidth - margin),
    );
    renderPosition.y = Math.max(70 - orbitTop, renderPosition.y);
  }
  if (tourStep < tourSteps.length)
    renderPosition.y = Math.max(
      quickMenu === "life" ? 250 - orbitTop : 170,
      renderPosition.y,
    );
  // Keep the native range control in screen coordinates throughout resizing.
  // Relative offsets look stable but Chromium can retain the moving parent origin.
  const quickStyle =
    quickMenu === "settings" && sizeCardAnchor
      ? {
          position: "fixed",
          left: sizeCardAnchor.x,
          top: sizeCardAnchor.y,
        }
      : quickMenu === "life"
        ? undefined
        : {
            left:
              renderPosition.x + petWidth + 272 <= innerWidth
                ? petWidth + 16
                : -256,
            top: Math.max(
              8 - renderPosition.y,
              Math.min(0, innerHeight - renderPosition.y - 290),
            ),
          };
  const character = boot?.character,
    name = character?.localizedNames?.zh || character?.name || "搭档";
  const tasks = state?.tasks || [],
    active = tasks.filter((t) =>
      ["queued", "running", "waiting"].includes(t.status),
    ),
    waiting = tasks.find((t) => t.status === "waiting");
  const settings = state?.settings || {};
  const audio = useVoiceClips({
    api,
    character,
    state,
    activity,
    onError: setError,
  });
  useEffect(() => {
    if (!character?.artworkRevision) return;
    const key = "companion.artworkRevision." + character.id;
    if (localStorage.getItem(key) === character.artworkRevision) return;
    setStyles((previous) => {
      const next = { ...previous, [character.id]: "portrait" };
      localStorage.setItem("companion.styles", JSON.stringify(next));
      return next;
    });
    localStorage.setItem(key, character.artworkRevision);
  }, [character?.id, character?.artworkRevision]);
  behaviorRef.current = {
    ...(personalities[character?.builtin || character?.templateSource] ||
      personalities.default),
    ...(character?.profile?.dailyActivities?.length
      ? { activities: character.profile.dailyActivities }
      : {}),
  };
  useEffect(() => {
    if (panel !== "settings") setPreview(null);
  }, [panel]);
  function tourEvent(event) {
    setTourStep((step) => advanceTour(step, event));
  }
  useEffect(() => {
    localStorage.setItem("companion.tour.v1", String(tourStep));
  }, [tourStep]);
  async function run(fn) {
    setError("");
    try {
      return await fn();
    } catch (e) {
      setError(e.message);
      return null;
    }
  }
  function say(value, duration = 12000) {
    setBubble(value);
    clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubble(""), duration);
  }
  function animate(value, duration = 2500) {
    setActivity(value);
    clearTimeout(activityTimer.current);
    nextActivity.current = Date.now() + duration;
    activityTimer.current = setTimeout(() => {
      setActivity("idle");
      nextActivity.current = Date.now() + 1000;
    }, duration);
  }
  async function refresh() {
    const b = await api.bootstrap();
    setBoot(b);
    setState(await api.companionState());
  }
  useEffect(() => {
    document.documentElement.classList.add("companion-mode");
    void run(refresh);
    bubbleTimer.current = setTimeout(() => setBubble(""), 12000);
    const stop = api.onEvent((e) => {
      if (e.method === "client/inputPulse") {
        if (e.params.error) setError(e.params.error);
        else if (e.params.keys || e.params.clicks) {
          setPulse((p) => p + 1);
          lastInteraction.current = Date.now();
        }
      }
      if (e.method === "client/companion") setState(e.params);
      if (e.method === "client/openCompanion") {
        if (e.params.tab === "chat") setChatOpen(true);
        else setPanel(e.params.tab);
      }
      if (e.method === "client/inputRestored") {
        setBubble("我在。");
      }
    });
    let passthrough = false;
    const move = (e) => {
      const hit =
        !!e.target.closest?.(".companion-interactive") || !!drag.current;
      if (passthrough === !hit) return;
      passthrough = !hit;
      void api
        .windowControl({ action: "passthrough", value: passthrough })
        .catch(() => {});
    };
    const key = (e) => {
      if (e.key === "Escape") {
        setQuickMenu(null);
        setPanel(null);
        setChatOpen(false);
        setMeal(null);
        setGame(null);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("keydown", key);
    return () => {
      stop();
      document.documentElement.classList.remove("companion-mode");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("keydown", key);
      clearTimeout(bubbleTimer.current);
      clearTimeout(activityTimer.current);
      clearTimeout(gameTimer.current);
    };
  }, []);
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    const reports = state?.messages.filter((m) => m.report) || [],
      report = reports.at(-1);
    if (report && lastReport.current && lastReport.current !== report.id) {
      const task = state.tasks.find((t) => t.id === report.taskId);
      say(
        task
          ? `「${task.title.slice(0, 35)}」${task.status !== "completed" ? "遇到问题" : task.verification === "failed" ? "检查没通过" : "有结果了"}。点我看汇报。`
          : report.text.slice(0, 85),
        18000,
      );
      animate("attention", 7000);
    }
    lastReport.current = report?.id || "none";
  }, [state?.messages?.at(-1)?.id, panel]);
  useEffect(() => {
    if (settings.quiet) {
      clearTimeout(activityTimer.current);
      setPreview(null);
      setActivity("sleep");
    } else if (!settings.wander && activityRef.current === "walk") {
      clearTimeout(activityTimer.current);
      setActivity("idle");
    } else if (previousQuiet.current && activityRef.current === "sleep")
      setActivity("idle");
    previousQuiet.current = !!settings.quiet;
  }, [settings.quiet, settings.wander]);
  useEffect(() => {
    const timer = setInterval(async () => {
      const s = stateRef.current;
      if (
        !s ||
        drag.current ||
        panelRef.current ||
        mealRef.current ||
        tourRef.current < tourSteps.length
      )
        return;
      const quiet = s.settings.quiet;
      let idle = 0;
      try {
        idle = await api.companionIdle();
      } catch {}
      if (quiet || idle > behaviorRef.current.sleepAfter) {
        setActivity("sleep");
        return;
      }
      if (s.tasks.some((t) => t.status === "waiting")) {
        setActivity("attention");
        return;
      }
      if (Date.now() - lastInteraction.current < 8000) return;
      if (Date.now() < nextActivity.current) return;
      const behavior = behaviorRef.current;
      if (s.tasks.some((t) => t.status === "running") || s.busy) return;
      const plan = chooseLifeActivity({
        previous: activityRef.current,
        activities: behavior.activities,
        wanderChance: behavior.wanderChance,
        wander:
          s.settings.wander &&
          !matchMedia("(prefers-reduced-motion: reduce)").matches,
      });
      clearTimeout(activityTimer.current);
      if (plan.action === "walk") {
        const directions = [
          { x: 46, y: 0 },
          { x: -46, y: 0 },
          { x: 0, y: -36 },
          { x: 0, y: 36 },
        ];
        velocity.current =
          directions[Math.floor(Math.random() * directions.length)];
        setFacing(
          velocity.current.x < 0
            ? "left"
            : velocity.current.x > 0
              ? "right"
              : velocity.current.y < 0
                ? "up"
                : "down",
        );
      }
      setActivity(plan.action);
      nextActivity.current = Date.now() + plan.duration;
      if (
        s.settings.proactive &&
        Date.now() - lastInvitation.current > 35 * 60 * 1000
      ) {
        lastInvitation.current = Date.now();
        say(behavior.invitation, 10000);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!dragging && activity !== "walk")
      localStorage.setItem("companion.position", JSON.stringify(position));
  }, [position, dragging, activity]);
  useEffect(() => {
    const resize = () =>
      setPosition((p) => ({
        x: Math.max(0, Math.min(innerWidth - petWidth, p.x)),
        y: Math.max(8, Math.min(innerHeight - petHeight, p.y)),
      }));
    window.addEventListener("resize", resize);
    resize();
    return () => window.removeEventListener("resize", resize);
  }, [petScale]);
  useEffect(() => {
    localStorage.setItem("companion.scale", String(petScale));
  }, [petScale]);
  useEffect(() => {
    if (
      activity !== "walk" ||
      transitioning ||
      dragging ||
      panel ||
      chatOpen ||
      state?.busy ||
      active.length ||
      !settings.wander ||
      settings.quiet
    )
      return;
    let previous = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      const next = stepMotion(
        positionRef.current,
        velocity.current,
        (now - previous) / 1000,
        {
          left: 8,
          right: Math.max(8, innerWidth - petWidth - 8),
          top: 8,
          bottom: Math.max(8, innerHeight - petHeight - 8),
        },
      );
      previous = now;
      velocity.current = next.velocity;
      positionRef.current = next.position;
      setPosition(next.position);
      setFacing(next.direction);
    }, 33);
    return () => clearInterval(timer);
  }, [
    activity,
    transitioning,
    dragging,
    panel,
    chatOpen,
    petScale,
    state?.busy,
    active.length,
    settings.wander,
    settings.quiet,
  ]);
  useEffect(() => {
    if (!settings.cursor || settings.quiet || dragging || mini) {
      setGaze({ x: 0, y: 0 });
      return;
    }
    let mounted = true;
    const timer = setInterval(() => {
      api
        .companionCursor()
        .then((p) => {
          if (mounted)
            setGaze(
              gazeAt(p, {
                x: renderPosition.x,
                y: renderPosition.y,
                width: petWidth,
                height: petHeight,
              }),
            );
        })
        .catch(() => {});
    }, 180);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [
    settings.cursor,
    settings.quiet,
    renderPosition.x,
    renderPosition.y,
    petWidth,
    petHeight,
    dragging,
    mini,
  ]);
  function toggleQuick(tab) {
    setSizeCardAnchor(null);
    lastInteraction.current = Date.now();
    setPanel(null);
    if (activity === "walk") setActivity("idle");
    setChatOpen(tab === "chat" ? !chatOpen : false);
    setQuickMenu(tab === "chat" ? null : quickMenu === tab ? null : tab);
  }
  function anchorSizeCard(event) {
    if (sizeCardAnchor) return;
    const card = event.currentTarget.closest(".pet-quick-settings");
    if (!card) return;
    const rect = card.getBoundingClientRect();
    setSizeCardAnchor({ x: rect.x, y: rect.y });
  }
  function open(tab) {
    setQuickMenu(null);
    lastInteraction.current = Date.now();
    if (tab === "chat") {
      setChatOpen(true);
      setPanel(null);
    } else {
      setPanel(tab);
      setChatOpen(false);
    }
    setActivity("idle");
  }
  async function send(e) {
    e.preventDefault();
    if (!text.trim() || state?.busy) return;
    const message = text;
    setText("");
    setHistory(null);
    animate("working", 180000);
    const r = await run(() => api.companionChat({ text: message }));
    setActivity("idle");
    if (r) {
      say(r.reply.replace(/[*`#]/g, ""), 30000);
      tourEvent("message");
    }
  }
  useEffect(() => {
    if (carryMotion !== "landing") return;
    const timer = setTimeout(() => setCarryMotion("rest"), 420);
    return () => clearTimeout(timer);
  }, [carryMotion]);
  function down(e) {
    if (e.button !== 0) return;
    lastInteraction.current = Date.now();
    setCarryMotion("rest");
    setCarryLean(0);
    drag.current = {
      lastX: e.clientX,
      x: e.clientX,
      y: e.clientY,
      start: position,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  }
  function movePet(e) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x,
      dy = e.clientY - d.y;
    if (Math.hypot(dx, dy) > 5) d.moved = true;
    if (d.moved) {
      setCarryMotion("carried");
      setCarryLean(Math.max(-12, Math.min(12, (e.clientX - d.lastX) * -0.6)));
    }
    d.lastX = e.clientX;
    setPosition({
      x: Math.max(0, Math.min(innerWidth - petWidth, d.start.x + dx)),
      y: Math.max(8, Math.min(innerHeight - petHeight, d.start.y + dy)),
    });
  }
  function up(e) {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    setCarryMotion(d?.moved ? "landing" : "rest");
    setCarryLean(0);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    if (d && !d.moved) {
      animate("pet");
      const lines = behaviorRef.current.touch;
      let index = Math.floor(Math.random() * lines.length);
      if (index === lastTouchLine.current) index = (index + 1) % lines.length;
      lastTouchLine.current = index;
      say(lines[index], 7000);
      nextActivity.current = Date.now() + 8000;
      void run(() => api.companionLife());
    }
  }
  async function files(paths) {
    const preview = await run(() => api.companionFiles(paths ? { paths } : {}));
    if (preview) {
      setMeal(preview);
      setPanel("life");
      say("这些可以吃。先看看名单？");
    }
  }
  async function eat() {
    setFileBusy(true);
    animate("eat", 12000);
    const result = await run(() => api.companionEat({ token: meal.token }));
    setFileBusy(false);
    setMeal(null);
    animate(result ? "pet" : "idle");
    if (result)
      say(
        `吃好啦，${result.filter((m) => m.status === "eaten").length} 个文件进入废纸篓。需要的话可以吐回来。`,
      );
  }
  async function dispatch(prompt, engine, title) {
    const result = await run(() =>
      api.companionTask({
        prompt,
        engine,
        title,
        verificationCommand: panel === "tasks" ? checkCommand : "",
      }),
    );
    if (result) {
      setTaskText("");
      setPanel("tasks");
      say(
        `交给 ${engine === "claude" ? "Claude Code" : "Codex"} 了。我们可以继续聊天。`,
      );
    }
  }
  async function saveSettings(patch) {
    if (settingsBusy) return;
    setSettingsBusy(true);
    setState((old) => ({ ...old, settings: { ...old.settings, ...patch } }));
    const result = await run(() => api.companionSettings(patch));
    if (result) setState(result);
    else {
      const actual = await run(() => api.companionState());
      if (actual) setState(actual);
    }
    setSettingsBusy(false);
  }
  function startGame() {
    clearTimeout(gameTimer.current);
    setGame({
      score: 0,
      x: 30 + Math.random() * 65,
      y: 20 + Math.random() * 50,
      finished: false,
    });
    animate("play", 20000);
    gameTimer.current = setTimeout(() => {
      setGame((g) => (g ? { ...g, finished: true } : g));
      void run(() => api.companionLife({ game: true }));
      say("这局结束，伸伸手指也不错。");
      setActivity("idle");
    }, 20000);
  }
  if (!boot || !state)
    return (
      <div className="companion-loading companion-interactive">
        {error || "角色正在醒来…"}
      </div>
    );
  const workingTask = active.find((t) => t.status === "running");
  const workPhase =
    workingTask?.currentActivity === "commandExecution"
      ? "coding"
      : workingTask?.currentActivity === "fileChange"
        ? "coding"
        : workingTask
          ? "reading"
          : null;
  const phase = waiting
    ? "approval"
    : workPhase ||
      (activity === "working"
        ? "thinking"
        : activity === "eat" || activity === "restore" || activity === "pet"
          ? "success"
          : activity === "attention"
            ? "speaking"
            : {
                read: "reading",
                office: "coding",
                gaming: "thinking",
                meal: "success",
              }[activity] || "idle");
  const visibleMessages = history || state.messages;
  const displayMessages = visibleMessages.filter(
    (m) => !visibleMessages.some((n) => n.summaryOf === m.id),
  );
  const appearance =
    character?.petAppearance ||
    appearances[character?.builtin || character?.templateSource];
  const palette = appearance?.themeHue ?? 210;
  const chibiAvailable = !!appearance?.chibi;
  const preferredStyle =
    styles[character.id] ||
    (character.builtin || character.petAppearance ? "chibi" : "portrait");
  const selectedStyle = !chibiAvailable
    ? "portrait"
    : preferredStyle === "portrait"
      ? "portrait"
      : preferredStyle === "sticker" && appearance.sticker
        ? "sticker"
        : "chibi";
  const chibi = selectedStyle !== "portrait";
  const animationPack = appearance?.[selectedStyle];
  return (
    <main
      className="companion-app"
      data-testid="companion-app"
      data-character-id={character.id}
      style={{ "--hue": palette, "--pet-scale": petScale }}
    >
      {(quickMenu || chatOpen) && (
        <div
          className="quick-dismiss companion-interactive"
          data-testid="quick-dismiss"
          onPointerDown={() => {
            setQuickMenu(null);
            setChatOpen(false);
          }}
        />
      )}
      <svg
        width="0"
        height="0"
        aria-hidden="true"
        style={{ position: "absolute" }}
      >
        <defs>
          <filter id="pet-alpha-clean" colorInterpolationFilters="sRGB">
            <feComponentTransfer>
              <feFuncA
                type="discrete"
                tableValues={Array.from({ length: 256 }, (_, a) =>
                  a < 24 ? 0 : a / 255,
                ).join(" ")}
              />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>
      <div
        className={`pet-world ${chatOpen || quickMenu ? "has-quick" : ""} ${dragging ? "is-dragging" : ""} ${mini ? "is-mini" : ""}`}
        style={{
          left: renderPosition.x,
          top: renderPosition.y,
          "--gaze-x": gaze.x,
          "--gaze-y": gaze.y,
          transition: "none",
          width: petWidth,
          height: petHeight,
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
        onDrop={(e) => {
          e.preventDefault();
          void files(api.droppedFiles(Array.from(e.dataTransfer.files)));
        }}
      >
        {tourStep < tourSteps.length && (
          <aside
            className="tour-coach companion-interactive"
            role="status"
            style={{
              bottom:
                quickMenu === "life"
                  ? petHeight - orbitTop + 70
                  : petHeight + 12,
            }}
          >
            <small>
              {name} · 初次见面 {tourStep + 1}/4
            </small>
            <p>{tourSteps[tourStep].text}</p>
            <button onClick={() => setTourStep(tourSteps.length)}>
              稍后再认识
            </button>
          </aside>
        )}
        {chatOpen && (
          <form
            className="bubble-composer compact-input companion-interactive"
            onSubmit={send}
          >
            <textarea
              autoFocus
              aria-label="气泡输入"
              onFocus={() => void audio.event("listening")}
              placeholder="想和我说些什么？"
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setChatOpen(false);
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  void send(e);
                }
              }}
            />
            <button
              className="bubble-send"
              aria-label="发送消息"
              title="发送消息"
              disabled={state.busy || !text.trim()}
            >
              <CompanionIcon name="send" />
            </button>
            {error && <p role="alert">{error}</p>}
          </form>
        )}
        {(bubble || (chatOpen && state.busy)) &&
          tourStep >= tourSteps.length &&
          !settings.quiet &&
          !mini && (
            <button
              className="pet-bubble companion-interactive"
              onClick={() => open(waiting ? "tasks" : "chat")}
            >
              <span>{state.busy ? "正在想怎么回答你…" : bubble}</span>
              <span className="bubble-corner">↗</span>
            </button>
          )}
        <div
          className={`pet-body companion-interactive activity-${activity} ${chibi ? "has-sprite" : ""}`}
          data-testid="pet-body"
          onPointerDown={down}
          onPointerMove={movePet}
          onPointerUp={up}
          onPointerCancel={() => {
            const moved = drag.current?.moved;
            drag.current = null;
            setDragging(false);
            setCarryMotion(moved ? "landing" : "rest");
            setCarryLean(0);
          }}
          onLostPointerCapture={() => {
            if (drag.current) {
              const moved = drag.current.moved;
              drag.current = null;
              setDragging(false);
              setCarryMotion(moved ? "landing" : "rest");
              setCarryLean(0);
            }
          }}
          onDoubleClick={() => open("chat")}
        >
          <div className="pet-aura" />
          <div
            className={`pet-carry motion-${carryMotion}`}
            data-carry={carryMotion}
            style={{ "--carry-lean": `${carryLean}deg` }}
          >
            <div className="pet-carry-swing">
              <div
                className="pet-gaze"
                data-testid="pet-gaze"
                data-gaze-x={gaze.x}
                data-gaze-y={gaze.y}
              >
                {chibi ? (
                  <PetSprite
                    activity={
                      (carryMotion === "carried" ? "drag" : null) ||
                      preview ||
                      (workPhase
                        ? workPhase === "coding"
                          ? "office"
                          : "read"
                        : activity === "working"
                          ? "office"
                          : activity === "play"
                            ? "gaming"
                            : activity)
                    }
                    name={name}
                    pack={animationPack}
                    facing={facing}
                    onTransition={setTransitioning}
                  />
                ) : (
                  <ImageCharacter
                    character={character}
                    phase={phase}
                    name={name}
                    t={(x) => x}
                  />
                )}
              </div>
            </div>
          </div>
          {["eat", "restore"].includes(activity) && (
            <div
              className={
                "file-parcel " + (activity === "restore" ? "parcel-return" : "")
              }
            >
              <span>▤</span>
              <small>{activity === "eat" ? "文件点心" : "还给你"}</small>
            </div>
          )}
          {activity === "sleep" && <span className="pet-emote">z z Z</span>}
          {activity === "pet" && <span className="pet-emote">♡</span>}
          {activity === "eat" && <span className="pet-emote">▤ → ✦</span>}
        </div>
        {settings.keyboard && !settings.quiet && !mini && (
          <div className="pet-keyboard" key={pulse}>
            <span>⌨</span>
            {pulse > 0 && <i>♪</i>}
            <small>一起敲敲</small>
          </div>
        )}
        <div className="pet-caption">
          <span className={"presence-dot " + (active.length ? "busy" : "")} />
          <strong>{name}</strong>
          <span>
            {active.length
              ? `${active.length} 件事进行中`
              : activities[activity]}
          </span>
        </div>
        {quickMenu && (
          <div
            className={`pet-quick pet-quick-${quickMenu} companion-interactive`}
            aria-label="角色快捷选项"
            style={
              quickMenu === "life"
                ? { "--orbit-top": `${orbitTop}px` }
                : quickStyle
            }
            onKeyDown={(e) => {
              if (e.key === "Escape") setQuickMenu(null);
            }}
          >
            <button
              className="quick-close"
              aria-label="收起快捷选项"
              onClick={() => setQuickMenu(null)}
            >
              <CompanionIcon name="close" />
            </button>
            {quickMenu === "life" && (
              <>
                <div className="orbit-hint" aria-live="polite">
                  {orbitHint}
                </div>
                <div className="life-orbit">
                  {[
                    ["pet", "摸摸头", "life"],
                    ["read", "读书", "book"],
                    ["meal", "吃饭", "meal"],
                    ["gaming", "玩游戏", "game"],
                    ["office", "办公", "office"],
                    ["sleep", "睡觉", "moon"],
                    ["walk", "出去跑跑", "walk"],
                    ["idle", "休息一下", "rest"],
                    ["more", "文件投喂与小游戏", "more"],
                  ].map(([id, label, icon], index) => {
                    const angle = ((-210 + index * 30) * Math.PI) / 180;
                    return (
                      <button
                        key={id}
                        aria-label={label}
                        onMouseEnter={() => setOrbitHint(label)}
                        onMouseLeave={() => setOrbitHint("选择一个互动")}
                        onFocus={() => setOrbitHint(label)}
                        onBlur={() => setOrbitHint("选择一个互动")}
                        style={{
                          left: petWidth / 2 + Math.cos(angle) * orbitRadiusX,
                          top:
                            102.5 * petScale + Math.sin(angle) * orbitRadiusY,
                        }}
                        disabled={
                          id === "walk" &&
                          (!settings.wander ||
                            settings.quiet ||
                            !!active.length)
                        }
                        onClick={() => {
                          if (id === "more") {
                            open("life");
                            return;
                          }
                          setQuickMenu(null);
                          setPreview(null);
                          if (id === "walk") {
                            velocity.current = { x: 46, y: 0 };
                            setFacing("right");
                          }
                          animate(id, id === "walk" ? 15000 : 45000);
                          tourEvent("activity");
                        }}
                      >
                        <CompanionIcon name={icon} />
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {quickMenu === "tasks" && (
              <>
                <strong>我在照看的事</strong>
                {tourStep === 1 && (
                  <button
                    onClick={() => {
                      say(
                        "任务会交给你选择的 Codex 或 Claude Code 线程执行，我会收集结果并向你汇报。",
                        18000,
                      );
                      setQuickMenu(null);
                      tourEvent("tasks-understood");
                    }}
                  >
                    了解任务分发
                  </button>
                )}
                {active.length ? (
                  active.slice(0, 3).map((t) => (
                    <button
                      className="quick-task"
                      key={t.id}
                      onClick={() => open("tasks")}
                    >
                      <span>
                        {t.title || t.prompt || t.text || "进行中的任务"}
                      </span>
                      <small>
                        {t.status === "waiting"
                          ? "等你决定"
                          : t.status === "queued"
                            ? "排队中"
                            : "进行中"}
                      </small>
                    </button>
                  ))
                ) : (
                  <p>暂时没有进行中的任务</p>
                )}
                <button onClick={() => open("tasks")}>交给我一件事 ↗</button>
                <button onClick={() => open("chat")}>聊聊任务想法</button>
              </>
            )}
            {quickMenu === "settings" && (
              <>
                <strong>陪伴偏好</strong>
                <button
                  onClick={() => {
                    setQuickMenu(null);
                    setTourStep(0);
                  }}
                >
                  重新认识一下 · 新手引导
                </button>
                <label className="pet-size-control">
                  角色大小 <output>{Math.round(petScale * 100)}%</output>
                  <input
                    aria-label="快捷角色大小"
                    type="range"
                    min="40"
                    max="140"
                    step="5"
                    value={Math.round(petScale * 100)}
                    onPointerDown={anchorSizeCard}
                    onChange={(e) => {
                      anchorSizeCard(e);
                      setPetScale(Number(e.target.value) / 100);
                      tourEvent("preference");
                    }}
                  />
                </label>
                <div className="quick-toggles">
                  <button
                    aria-pressed={!!settings.quiet}
                    onClick={() => {
                      void saveSettings({ quiet: !settings.quiet });
                      tourEvent("preference");
                    }}
                  >
                    {settings.quiet ? "恢复陪伴" : "安静陪伴"}
                  </button>
                  <button
                    aria-pressed={!!settings.wander}
                    onClick={() => saveSettings({ wander: !settings.wander })}
                  >
                    {settings.wander ? "留在身边" : "自由走动"}
                  </button>
                </div>
                <button onClick={() => open("settings")}>
                  角色、模型与更多设置 ↗
                </button>
                <button
                  title="收成小挂件"
                  onClick={() => {
                    setQuickMenu(null);
                    setChatOpen(false);
                    setMini(true);
                  }}
                >
                  收成小挂件
                </button>
                <button
                  onClick={() => {
                    setQuickMenu(null);
                    setPanel("chat");
                  }}
                >
                  对话历史 ↗
                </button>
              </>
            )}
          </div>
        )}
        {!mini && (
          <nav
            className="pet-dock companion-interactive"
            aria-label="角色工具栏"
            data-tour={tourSteps[tourStep]?.id || ""}
          >
            <button
              title="聊天"
              aria-label="聊天"
              onClick={() => toggleQuick("chat")}
            >
              <CompanionIcon name="chat" />
            </button>
            <button
              title="任务"
              aria-label="任务"
              onClick={() => toggleQuick("tasks")}
            >
              <CompanionIcon name="tasks" />
              {active.length > 0 && <b>{active.length}</b>}
            </button>
            <button
              title="生活与文件投喂"
              aria-label="生活与文件投喂"
              onClick={() => toggleQuick("life")}
            >
              <CompanionIcon name="life" />
            </button>
            <button
              title="设置"
              aria-label="设置"
              onClick={() => toggleQuick("settings")}
            >
              <CompanionIcon name="settings" />
            </button>
          </nav>
        )}
        {mini && (
          <button
            className="mini-toggle companion-interactive"
            title={mini ? "展开角色" : "收成小挂件"}
            onClick={() => setMini(!mini)}
          >
            <CompanionIcon name="expand" />
          </button>
        )}
      </div>
      {panel && (
        <section
          className="companion-panel companion-interactive"
          data-testid="companion-panel"
        >
          <header className="companion-header">
            <img src="./app-icon.png" alt="" />
            <div>
              <span className="companion-kicker">YOUR EVERYDAY COMPANION</span>
              <h1>
                {name}
                <span>的陪伴空间</span>
              </h1>
            </div>
            <button
              title="收起面板，角色继续陪伴"
              onClick={() => setPanel(null)}
            >
              ×
            </button>
          </header>
          <nav className="companion-tabs">
            {tabs.map(([id, label]) => (
              <button
                className={panel === id ? "selected" : ""}
                key={id}
                onClick={() => open(id)}
              >
                {label}
                {id === "tasks" && waiting && <i />}
              </button>
            ))}
          </nav>
          {error && (
            <div className="companion-error" role="alert">
              {error}
              <button aria-label="关闭错误" onClick={() => setError("")}>
                ×
              </button>
            </div>
          )}
          {panel === "chat" && (
            <>
              <div className="conversation-tools">
                <input
                  aria-label="搜索对话历史"
                  placeholder="找回我们聊过的话…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button
                  onClick={() =>
                    run(async () =>
                      setHistory(await api.companionHistory({ query: search })),
                    )
                  }
                >
                  搜索
                </button>
                {history && (
                  <button
                    onClick={() => {
                      setHistory(null);
                      setSearch("");
                    }}
                  >
                    返回
                  </button>
                )}
              </div>
              <div className="companion-scroll companion-conversation">
                {!displayMessages.length && (
                  <div className="conversation-welcome">
                    <span>✦</span>
                    <h2>今天，从哪件小事开始？</h2>
                    <p>
                      可以聊聊你的想法，也可以交给我一件事。
                      <br />
                      工作交给执行线程，我留在这里陪你。
                    </p>
                    <button
                      onClick={() =>
                        setText("我们先聊聊吧，你希望怎么陪伴我？")
                      }
                    >
                      认识一下
                    </button>
                    <button onClick={() => setText("我想安排一个 Codex 任务")}>
                      安排任务
                    </button>
                  </div>
                )}
                {displayMessages.length >= 60 && (
                  <button
                    onClick={() =>
                      run(async () =>
                        setHistory([
                          ...(await api.companionHistory({
                            query: search,
                            before: displayMessages[0].id,
                          })),
                          ...visibleMessages,
                        ]),
                      )
                    }
                  >
                    更早的对话
                  </button>
                )}
                {displayMessages.map((m) => (
                  <article
                    key={m.id}
                    className={
                      "conversation-message " +
                      m.role +
                      (m.report ? " is-report" : "")
                    }
                  >
                    <div className="message-byline">
                      {m.role === "user" ? "你" : name}
                      {m.report ? " · 任务汇报" : ""}
                      <time>
                        {new Date(m.time).toLocaleTimeString("zh-CN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                    <div className="message-text">
                      <RichText text={m.text} />
                    </div>
                    {m.proposal && (
                      <div className="task-proposal">
                        <strong>
                          准备交给{" "}
                          {m.proposal.engine === "claude"
                            ? "Claude Code"
                            : "Codex"}
                        </strong>
                        <p>{m.proposal.title}</p>
                        <details>
                          <summary>查看完整任务</summary>
                          <pre>{m.proposal.prompt}</pre>
                        </details>
                        <button
                          disabled={!settings.workspace}
                          onClick={() =>
                            dispatch(
                              m.proposal.prompt,
                              m.proposal.engine,
                              m.proposal.title,
                            )
                          }
                        >
                          发送任务
                        </button>
                        {!settings.workspace && (
                          <button
                            onClick={() => run(() => api.companionWorkspace())}
                          >
                            先选项目
                          </button>
                        )}
                      </div>
                    )}
                    {m.taskId && (
                      <button
                        className="text-link"
                        onClick={() => toggleQuick("tasks")}
                      >
                        查看执行记录 ↗
                      </button>
                    )}
                  </article>
                ))}
                {state.busy && (
                  <div className="thinking-dots">
                    {name} 正在想 <span>● ● ●</span>
                  </div>
                )}
                <div ref={messagesEnd} />
              </div>
              <form className="companion-composer" onSubmit={send}>
                <textarea
                  aria-label="和角色说话"
                  placeholder="跟我说说…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !e.shiftKey &&
                      !e.nativeEvent.isComposing
                    ) {
                      e.preventDefault();
                      void send(e);
                    }
                  }}
                />
                <div>
                  <span>记忆随角色保留 · Shift ↵ 换行</span>
                  {state.busy ? (
                    <button
                      type="button"
                      onClick={() => run(() => api.companionStop())}
                    >
                      停止回复
                    </button>
                  ) : (
                    <button className="accent" disabled={!text.trim()}>
                      发送 ↗
                    </button>
                  )}
                </div>
              </form>
            </>
          )}
          {panel === "tasks" && (
            <div className="companion-scroll">
              <div className="section-heading">
                <span>HAND IT OVER</span>
                <h2>事情交给他们，我陪着你。</h2>
                <p>每个任务拥有独立线程。同一项目顺序执行，避免同时修改。</p>
              </div>
              <div className="companion-card">
                <button
                  className="workspace-button"
                  onClick={() => run(() => api.companionWorkspace())}
                >
                  ▱ {settings.workspace || "选择项目文件夹"}
                </button>
                <div className="inline-fields">
                  <select
                    aria-label="任务执行器"
                    value={taskEngine}
                    onChange={(e) => setTaskEngine(e.target.value)}
                  >
                    <option value="codex">Codex</option>
                    <option value="claude">Claude Code</option>
                  </select>
                  <button onClick={() => toggleQuick("settings")}>
                    模型 / effort ↗
                  </button>
                </div>
                <textarea
                  aria-label="任务内容"
                  placeholder="目标、范围，以及怎样算完成…"
                  value={taskText}
                  onChange={(e) => setTaskText(e.target.value)}
                />
                <input
                  aria-label="完成后复跑的检查命令"
                  placeholder="可选：完成后复跑检查，如 npm test"
                  value={checkCommand}
                  onChange={(e) => setCheckCommand(e.target.value)}
                />
                <button
                  className="accent"
                  disabled={!settings.workspace || !taskText.trim()}
                  onClick={() => dispatch(taskText, taskEngine)}
                >
                  交给 {taskEngine === "codex" ? "Codex" : "Claude"}
                </button>
              </div>
              {!tasks.length && (
                <p className="empty-note">
                  还没有任务。开始后，你可以继续聊天或收起面板。
                </p>
              )}
              {[...tasks].reverse().map((t) => (
                <article className="companion-card task-card" key={t.id}>
                  <div className="task-topline">
                    <span className={"task-status " + t.status}>
                      {labels[t.status]}
                    </span>
                    <small>
                      {t.engine === "codex" ? "Codex" : "Claude Code"}
                    </small>
                  </div>
                  <h3>{t.title}</h3>
                  <small className="path-note">{t.workspace}</small>
                  {t.error && <p className="inline-error">{t.error}</p>}
                  {t.requests?.map((r) => (
                    <Approval key={r.id} request={r} taskId={t.id} run={run} />
                  ))}
                  {t.output && (
                    <details open={t.status === "completed"}>
                      <summary>
                        执行器结果 ·{" "}
                        {t.verification === "passed"
                          ? "复跑检查通过"
                          : t.verification === "failed"
                            ? "复跑检查未通过"
                            : "未独立验收"}
                      </summary>
                      <pre>{t.output}</pre>
                    </details>
                  )}
                  {t.check && (
                    <details open={t.verification === "failed"}>
                      <summary>
                        复跑检查 ·{" "}
                        {t.verification === "passed" ? "通过" : "未通过"}
                      </summary>
                      <pre>
                        {t.check.command +
                          "\nexit: " +
                          t.check.exitCode +
                          "\n" +
                          t.check.output}
                      </pre>
                    </details>
                  )}
                  <details>
                    <summary>线程与执行证据（{t.events.length}）</summary>
                    <small>
                      线程：{t.threadId || "正在创建"}
                      <br />
                      模型：{t.effectiveModel || t.model || "继承本机"} ·
                      effort：{t.effort || "继承本机"}
                    </small>
                    {t.events.map((e, i) => (
                      <pre key={i}>
                        {e.type} · {e.status || ""}
                        {e.exitCode !== undefined
                          ? ` · exit ${e.exitCode}`
                          : ""}
                        {e.command ? "\n" + e.command : ""}
                        {e.output ? "\n" + e.output : ""}
                      </pre>
                    ))}
                  </details>
                  {["running", "queued", "waiting"].includes(t.status) ? (
                    <button
                      onClick={() =>
                        run(() =>
                          api.companionTaskControl({
                            action: "cancel",
                            id: t.id,
                          }),
                        )
                      }
                    >
                      停止任务
                    </button>
                  ) : (
                    t.threadId && (
                      <div className="followup">
                        <input
                          placeholder="补充要求，继续原线程…"
                          value={resumeText[t.id] || ""}
                          onChange={(e) =>
                            setResumeText({
                              ...resumeText,
                              [t.id]: e.target.value,
                            })
                          }
                        />
                        <button
                          onClick={() =>
                            run(() =>
                              api.companionTaskControl({
                                action: "resume",
                                id: t.id,
                                text: resumeText[t.id],
                              }),
                            )
                          }
                        >
                          继续
                        </button>
                      </div>
                    )
                  )}
                </article>
              ))}
            </div>
          )}
          {panel === "memory" && (
            <div className="companion-scroll">
              <div className="section-heading">
                <span>THINGS WE KEEP</span>
                <h2>那些值得记住的小事</h2>
                <p>
                  确认的记忆会带入聊天。模型提出的建议先留在这里，你可以改写或删除。
                </p>
              </div>
              <div className="companion-card">
                <textarea
                  placeholder="希望我一直记得什么？"
                  aria-label="新增记忆"
                  value={memoryText}
                  onChange={(e) => setMemoryText(e.target.value)}
                />
                <button
                  className="accent"
                  disabled={!memoryText.trim()}
                  onClick={() =>
                    run(async () => {
                      await api.companionMemory({ text: memoryText });
                      setMemoryText("");
                    })
                  }
                >
                  记住这件事
                </button>
              </div>
              {state.summaries?.[character.id] && (
                <details className="companion-card">
                  <summary>
                    对话阶段摘要 · {state.summaries[character.id].count} 条历史
                  </summary>
                  <p>{state.summaries[character.id].text}</p>
                  <small>模型整理的摘要可能有误；完整对话仍可搜索。</small>
                </details>
              )}
              {state.memories.map((m) => (
                <Memory key={m.id} item={m} run={run} />
              ))}
              {!state.memories.length && (
                <p className="empty-note">
                  我们可以慢慢积累。对话历史会另行保存。
                </p>
              )}
            </div>
          )}
          {panel === "life" && (
            <div className="companion-scroll">
              <div className="section-heading">
                <span>A LITTLE LIFE ON YOUR DESKTOP</span>
                <h2>工作之外，也一起生活。</h2>
                <p>摸摸头、散散步，或者来一场接星星。</p>
              </div>
              {chibi && (
                <div className="companion-card">
                  <h3>今天想做什么</h3>
                  <p>这些是角色的生活动作；办公动画本身不会执行电脑操作。</p>
                  <div className="animation-preview">
                    {[
                      ["read", "读书"],
                      ["meal", "吃饭"],
                      ["gaming", "玩游戏"],
                      ["office", "办公"],
                      ["sleep", "睡觉"],
                    ].map(([id, label]) => (
                      <button
                        key={id}
                        onClick={() => {
                          setPreview(null);
                          setPanel(null);
                          animate(id, 20000);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                    <button
                      disabled={
                        !settings.wander || settings.quiet || !!active.length
                      }
                      onClick={() => {
                        setPreview(null);
                        setPanel(null);
                        velocity.current = { x: 46, y: 0 };
                        setFacing("right");
                        animate("walk", 15000);
                      }}
                    >
                      出去跑跑
                    </button>
                    <button
                      onClick={() => {
                        setPreview(null);
                        animate("idle");
                      }}
                    >
                      休息一下
                    </button>
                  </div>
                </div>
              )}
              <div className="life-stats">
                <div>
                  <b>{state.life.affection}</b>
                  <span>次互动</span>
                </div>
                <div>
                  <b>{state.life.games}</b>
                  <span>场小游戏</span>
                </div>
                <div>
                  <b>
                    {state.meals.filter((m) => m.status === "eaten").length}
                  </b>
                  <span>份文件点心</span>
                </div>
              </div>
              <div className="companion-card">
                <h3>接星星 ✦</h3>
                <p>20 秒内点击星星。角色陪你一起活动一下。</p>
                {game && (
                  <div className="star-game">
                    {game.finished ? (
                      <div className="game-result">
                        这次接住了 <b>{game.score}</b> 颗星星
                      </div>
                    ) : (
                      <>
                        <span>已接住 {game.score}</span>
                        <button
                          aria-label="接住星星"
                          style={{ left: game.x + "%", top: game.y + "%" }}
                          onClick={() =>
                            setGame((g) => ({
                              ...g,
                              score: g.score + 1,
                              x: 8 + Math.random() * 76,
                              y: 20 + Math.random() * 55,
                            }))
                          }
                        >
                          ✦
                        </button>
                      </>
                    )}
                  </div>
                )}
                <button onClick={startGame}>
                  {game ? "再玩一局" : "一起玩"}
                </button>
                <button onClick={() => run(() => api.openPlay())}>
                  打开街机房 ↗
                </button>
              </div>
              <div className="companion-card food-card">
                <span className="food-icon">▤</span>
                <h3>给我一份文件点心</h3>
                <p>
                  把普通文件拖到角色身上，或在这里选择。吃掉后进入系统废纸篓，本机保留恢复副本。
                </p>
                <button onClick={() => files()}>挑选文件</button>
                <small>
                  每次最多 20 个文件，共 100 MB；单文件不超过 50 MB。
                </small>
              </div>
              {meal && (
                <div className="companion-card meal-preview">
                  <h3>准备吃掉这些文件</h3>
                  {meal.files.map((f) => (
                    <div key={f.path}>
                      <strong>{f.name}</strong>
                      <small>
                        {f.path} · {Math.ceil(f.size / 1024)} KB
                      </small>
                    </div>
                  ))}
                  <div className="inline-fields">
                    <button
                      className="accent"
                      disabled={fileBusy}
                      onClick={eat}
                    >
                      {fileBusy ? "正在处理…" : "吃掉 · 移到废纸篓"}
                    </button>
                    <button disabled={fileBusy} onClick={() => setMeal(null)}>
                      先不吃
                    </button>
                  </div>
                </div>
              )}
              {state.meals.length > 0 && (
                <h3 className="subheading">投喂记录</h3>
              )}
              {[...state.meals].reverse().map((m) => (
                <div className="companion-card meal-record" key={m.id}>
                  <strong>{m.name}</strong>
                  <small>{m.path}</small>
                  <span>
                    {
                      {
                        eaten: "已进入废纸篓",
                        restored: "已恢复到原处",
                        preparing: "操作曾中断，请检查文件",
                        failed: "处理失败",
                      }[m.status]
                    }
                  </span>
                  {m.error && <p className="inline-error">{m.error}</p>}
                  {["eaten", "preparing", "failed"].includes(m.status) && (
                    <button
                      onClick={() =>
                        run(async () => {
                          await api.companionRestore({ id: m.id });
                          animate("restore");
                          say("吐回来啦，文件已恢复到原位置。");
                        })
                      }
                    >
                      吐回来 · 恢复副本
                    </button>
                  )}
                  {m.status === "restored" && (
                    <button
                      onClick={() =>
                        run(() => api.companionReveal({ id: m.id }))
                      }
                    >
                      {boot.platform === "win32"
                        ? "在文件资源管理器中查看"
                        : "在 Finder 中查看"}
                    </button>
                  )}
                </div>
              ))}
              {state.meals.length > 0 && (
                <p className="empty-note">
                  恢复不会覆盖同名文件。废纸篓内的原件仍由系统管理，恢复副本保存在本机。
                </p>
              )}
            </div>
          )}
          {panel === "settings" && (
            <div className="companion-scroll">
              <div className="section-heading">
                <span>MAKE YOURSELF AT HOME</span>
                <h2>角色与工作，各有自己的节奏。</h2>
              </div>
              <div className="companion-card">
                <h3>陪伴方式</h3>
                {[
                  ["autoDispatch", "明确任务自动分发（需先选择项目）"],
                  ["cursor", "视线跟随鼠标"],
                  ["keyboard", "跟随全局键鼠节奏（只读取计数）"],
                  ["wander", "在桌面散步"],
                  ["proactive", "偶尔邀请互动（至少间隔 35 分钟）"],
                  ["quiet", "安静休息，不显示日常气泡"],
                  ["voice", "播放我上传的动作语音"],
                ].map(([key, label]) => (
                  <label className="toggle-row" key={key}>
                    <span>{label}</span>
                    <input
                      type="checkbox"
                      disabled={settingsBusy}
                      checked={!!settings[key]}
                      onChange={(e) =>
                        saveSettings({ [key]: e.target.checked })
                      }
                    />
                  </label>
                ))}
                <small>
                  {settingsBusy
                    ? "正在应用设置并启动键鼠反馈…"
                    : "主动邀请和动作由本地逻辑驱动，不会在后台反复调用模型。"}
                </small>
                <label>
                  动作语音音量{" "}
                  {Math.round((settings.voiceVolume ?? 0.75) * 100)}%
                  <input
                    aria-label="动作语音音量"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    disabled={settingsBusy}
                    value={settings.voiceVolume ?? 0.75}
                    onChange={(e) =>
                      saveSettings({ voiceVolume: Number(e.target.value) })
                    }
                  />
                </label>
              </div>
              <VoiceClipSettings
                api={api}
                character={character}
                state={state}
                run={run}
                refresh={refresh}
                audio={audio}
              />
              <div className="companion-card">
                <div className="inline-fields">
                  <h3>模型与 effort</h3>
                  <button
                    disabled={loadingModels}
                    onClick={() =>
                      run(async () => {
                        setLoadingModels(true);
                        try {
                          setModels(await api.companionModels());
                        } finally {
                          setLoadingModels(false);
                        }
                      })
                    }
                  >
                    {loadingModels ? "读取中…" : "读取可用模型"}
                  </button>
                </div>
                <p>
                  角色聊天使用 Codex
                  订阅的独立文字会话；执行线程继续继承本机环境。
                </p>
                <ModelChoice
                  label="角色大脑"
                  modelKey="brainModel"
                  effortKey="brainEffort"
                  settings={settings}
                  models={models}
                  save={saveSettings}
                />
                <ModelChoice
                  label="Codex 任务执行器"
                  modelKey="taskModel"
                  effortKey="taskEffort"
                  settings={settings}
                  models={models}
                  save={saveSettings}
                />
                <label className="stacked-label">
                  角色建议任务时优先使用
                  <select
                    value={settings.executor}
                    onChange={(e) => saveSettings({ executor: e.target.value })}
                  >
                    <option value="codex">Codex</option>
                    <option value="claude">Claude Code</option>
                  </select>
                </label>
                <small>
                  Claude
                  执行器使用其本机模型配置。这里的选择仅影响本应用后续请求。
                </small>
              </div>
              <div className="companion-card">
                <h3>我的角色</h3>
                <select
                  aria-label="切换角色"
                  value={character?.id}
                  disabled={state.busy}
                  onChange={(e) =>
                    run(async () => {
                      await api.selectCharacter({ id: e.target.value });
                      await refresh();
                      setHistory(null);
                      say("我来啦。");
                    })
                  }
                >
                  {boot.characters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.localizedNames?.zh || c.name}
                    </option>
                  ))}
                </select>
                <p>每个角色保存自己的对话和记忆。任务继续在后台运行。</p>
                {!character.builtin && (
                  <button
                    data-testid="remove-character"
                    disabled={
                      state.busy ||
                      active.some((t) => t.characterId === character.id)
                    }
                    onClick={() =>
                      run(async () => {
                        await api.removeCharacter({ id: character.id });
                        await refresh();
                        setHistory(null);
                        setBubble("");
                      })
                    }
                  >
                    移出角色库（保留历史和备份）
                  </button>
                )}
                <label className="pet-size-control">
                  角色大小 <output>{Math.round(petScale * 100)}%</output>
                  <input
                    aria-label="角色大小"
                    type="range"
                    min="40"
                    max="140"
                    step="5"
                    value={Math.round(petScale * 100)}
                    onChange={(e) => setPetScale(Number(e.target.value) / 100)}
                  />
                </label>
                <small>只调整角色，聊天文字大小不变。默认 70%。</small>
                <label>
                  外观画风
                  <select
                    aria-label="外观画风"
                    value={selectedStyle}
                    onChange={(e) => {
                      const next = {
                        ...styles,
                        [character.id]: e.target.value,
                      };
                      setStyles(next);
                      localStorage.setItem(
                        "companion.styles",
                        JSON.stringify(next),
                      );
                    }}
                  >
                    <option value="portrait">原版立绘</option>
                    {appearance?.sticker && (
                      <option value="sticker">表情包参考 · 清爽平涂</option>
                    )}
                    {chibiAvailable && (
                      <option value="chibi">Q 版桌宠 · 逐帧动画</option>
                    )}
                  </select>
                </label>
                {!chibiAvailable && (
                  <small>该角色尚未制作 Q 版动作素材，继续使用原版立绘。</small>
                )}
                {chibi && (
                  <div className="animation-preview">
                    <small>预览动作</small>
                    {[
                      ["idle", "待机"],
                      ["walk", "跑步"],
                      ["sleep", "睡觉"],
                      ["eat", "吃点心"],
                      ["read", "读书"],
                      ["meal", "吃饭"],
                      ["gaming", "玩游戏"],
                      ["office", "办公"],
                      ["walk_left", "向左跑"],
                      ["walk_right", "向右跑"],
                      ["walk_up", "向上跑"],
                      ["walk_down", "向下跑"],
                      ...(animationPack.clips.pet
                        ? [
                            ["pet", "挥手"],
                            ["attention", "思考"],
                          ]
                        : []),
                    ].map(([id, label]) => (
                      <button
                        key={id}
                        onClick={() => {
                          clearTimeout(activityTimer.current);
                          setPreview(id);
                          activityTimer.current = setTimeout(
                            () => setPreview(null),
                            6000,
                          );
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
                <details>
                  <summary>编辑人设 / 导入形象</summary>
                  <Persona character={character} run={run} refresh={refresh} />
                  <button
                    onClick={() =>
                      run(async () => {
                        await api.importActionImage({ phase: "idle" });
                        await refresh();
                      })
                    }
                  >
                    导入角色图片
                  </button>
                </details>
              </div>
              <details className="companion-card">
                <summary>创建新角色 · 档案与形象</summary>
                <CharacterStudio
                  api={api}
                  busy={false}
                  onApply={async () => {
                    await refresh();
                    say("新的搭档准备好了。");
                  }}
                />
              </details>
              <div className="companion-card">
                <h3>窗口与常驻</h3>
                <p>
                  收起面板后角色继续留在桌面。
                  {boot.platform === "win32" ? "系统托盘" : "菜单栏"}
                  可以随时唤出；快捷键{" "}
                  {boot.platform === "win32" ? "Ctrl+Alt+A" : "⌘⌥A"}。
                </p>
                <button onClick={() => api.windowControl({ action: "close" })}>
                  暂时隐藏角色
                </button>
                <button onClick={() => api.companionQuit()}>退出应用</button>
                <small>
                  版本 {boot.version} · 本机保存对话、记忆和任务记录
                </small>
              </div>
            </div>
          )}
          <footer className="companion-footer">
            <span className="presence-dot" />
            常驻陪伴
            <span>
              {state.busy
                ? "正在回复"
                : active.length
                  ? `${active.length} 个后台任务`
                  : "现在有空"}
            </span>
          </footer>
        </section>
      )}
      {!panel && error && (
        <button
          className="companion-toast companion-interactive"
          onClick={() => toggleQuick("chat")}
        >
          {error}
        </button>
      )}
    </main>
  );
}
function ModelChoice({ label, modelKey, effortKey, settings, models, save }) {
  const selected = models.find((m) => m.model === settings[modelKey]);
  return (
    <div className="model-choice">
      <label>
        {label}
        <select
          aria-label={label + "模型"}
          value={settings[modelKey]}
          onChange={(e) =>
            save({ [modelKey]: e.target.value, [effortKey]: "" })
          }
        >
          <option value="">
            {modelKey === "brainModel" ? "Codex 默认模型" : "继承本机模型"}
          </option>
          {settings[modelKey] && !selected && (
            <option value={settings[modelKey]}>{settings[modelKey]}</option>
          )}
          {models.map((m) => (
            <option key={m.id} value={m.model}>
              {m.displayName || m.model}
            </option>
          ))}
        </select>
      </label>
      <label>
        Effort
        <select
          aria-label={label + "effort"}
          value={settings[effortKey]}
          onChange={(e) => save({ [effortKey]: e.target.value })}
        >
          <option value="">
            {modelKey === "brainModel" ? "默认 low" : "继承本机"}
          </option>
          {(
            selected?.supportedReasoningEfforts?.map(
              (e) => e.reasoningEffort,
            ) || ["low", "medium", "high", "xhigh"]
          ).map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
function Memory({ item, run }) {
  const [value, setValue] = useState(item.text);
  return (
    <div className="companion-card memory-card">
      <span className="memory-tag">
        {item.status === "suggested"
          ? "待确认的记忆建议"
          : item.global
            ? "跨角色共享"
            : "已经记住"}
      </span>
      <textarea value={value} onChange={(e) => setValue(e.target.value)} />
      <div className="inline-fields">
        <button
          onClick={() =>
            run(() =>
              api.companionMemory({
                id: item.id,
                text: value,
                global: item.global,
              }),
            )
          }
        >
          {item.status === "suggested" ? "确认记住" : "保存修改"}
        </button>
        <button
          onClick={() =>
            run(() =>
              api.companionMemory({
                id: item.id,
                text: value,
                global: !item.global,
              }),
            )
          }
        >
          {item.global ? "仅此角色" : "设为共享"}
        </button>
        <button
          onClick={() =>
            run(() => api.companionMemory({ action: "delete", id: item.id }))
          }
        >
          忘记
        </button>
      </div>
    </div>
  );
}
function Persona({ character, run, refresh }) {
  const [name, setName] = useState(character.name),
    [persona, setPersona] = useState(character.persona);
  return (
    <>
      <label className="stacked-label">
        名字
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="stacked-label">
        人设与说话风格
        <textarea
          value={persona}
          onChange={(e) => setPersona(e.target.value)}
          maxLength={11000}
        />
      </label>
      <button
        onClick={() =>
          run(async () => {
            await api.updateCharacter({ name, persona });
            await refresh();
          })
        }
      >
        保存角色
      </button>
    </>
  );
}
function Approval({ request: r, taskId, run }) {
  const [answers, setAnswers] = useState({});
  return (
    <div className="approval-card">
      <strong>执行器需要你决定</strong>
      <pre>{r.params?.command || r.params?.reason || r.method}</pre>
      {r.method === "item/tool/requestUserInput" ? (
        <>
          {r.params.questions.map((q) => (
            <label key={q.id} className="stacked-label">
              {q.question}
              <input
                value={answers[q.id] || ""}
                onChange={(e) =>
                  setAnswers({ ...answers, [q.id]: e.target.value })
                }
              />
            </label>
          ))}
          <button
            onClick={() =>
              run(() => api.companionAnswer({ taskId, id: r.id, answers }))
            }
          >
            提交回答
          </button>
        </>
      ) : (
        <>
          {[
            "item/commandExecution/requestApproval",
            "item/fileChange/requestApproval",
          ].includes(r.method) &&
            (!r.params.availableDecisions ||
              r.params.availableDecisions.includes("accept")) && (
              <button
                onClick={() =>
                  run(() =>
                    api.companionAnswer({
                      taskId,
                      id: r.id,
                      decision: "accept",
                    }),
                  )
                }
              >
                允许这一次
              </button>
            )}
          <button
            onClick={() =>
              run(() =>
                api.companionAnswer({ taskId, id: r.id, decision: "decline" }),
              )
            }
          >
            拒绝 / 不授予权限
          </button>
          <details>
            <summary>完整请求</summary>
            <pre>{JSON.stringify(r.params, null, 2)}</pre>
          </details>
        </>
      )}
    </div>
  );
}

function RichText({ text }) {
  const pieces = String(text).split(/(```[\s\S]*?```)/g);
  return pieces.map((block, i) =>
    block.startsWith("```") ? (
      <pre key={i}>
        <code>{block.replace(/^```[^\n]*\n?/, "").replace(/```$/, "")}</code>
      </pre>
    ) : (
      <span key={i}>
        {block
          .split(/(\*\*[^*]+\*\*|`[^`\n]+`|\[[^\]]+\]\([^)]+\))/g)
          .map((part, j) =>
            part.startsWith("**") ? (
              <strong key={j}>{part.slice(2, -2)}</strong>
            ) : part.startsWith("`") ? (
              <code key={j}>{part.slice(1, -1)}</code>
            ) : part.startsWith("[") && part.includes("](") ? (
              <span key={j} title={part.slice(part.indexOf("](") + 2, -1)}>
                {part.slice(1, part.indexOf("]("))}
              </span>
            ) : (
              part
            ),
          )}
      </span>
    ),
  );
}
