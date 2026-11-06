import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { initialState, reduceEvent } from "../shared/state.mjs";
import { createTranslator, languages } from "../shared/i18n.mjs";
import { SystemVoice } from "./voice";
import "./style.css";

import { ImageCharacter } from "./ImageCharacter";
import { CharacterSettings } from "./CharacterSettings";
import { GameApp } from "./GameApp";
import { resolveAction } from "../shared/character-images.mjs";
import { touchPoint, isDrag } from "../shared/interactions.mjs";

const api = window.animeCodex;
const pretty = (v) => JSON.stringify(v, null, 2);
function App() {
  const [appearance, setAppearance] = useState({
    fontSize: 18,
    interactions: true,
  });
  const builtinId = useRef(null);
  const [reaction, setReaction] = useState(null);
  const pointerSession = useRef(null),
    hitMask = useRef(null),
    reactionTimer = useRef(null),
    lastReaction = useRef(0);
  const [backgroundOptions, setBackgroundOptions] = useState({
      automatic: false,
    }),
    [backgroundStatus, setBackgroundStatus] = useState({
      stage: "idle",
      percent: 0,
    });
  const [previewPhase, setPreviewPhase] = useState(null);
  const [language, setLanguage] = useState("zh"),
    [library, setLibrary] = useState([]),
    [desktop, setDesktop] = useState(null),
    [profileName, setProfileName] = useState("");
  const t = createTranslator(language);
  const [workbench, setWorkbench] = useState(false),
    [dialogue, setDialogue] = useState(true),
    [pinned, setPinned] = useState(true),
    [clickthrough, setClickthrough] = useState(true);
  const [character, setCharacter] = useState(null),
    [persona, setPersona] = useState(""),
    [connected, setConnected] = useState(false),
    [account, setAccount] = useState(""),
    [workspace, setWorkspace] = useState(""),
    [mode, setMode] = useState("read-only"),
    [thread, setThread] = useState(null),
    [threads, setThreads] = useState([]),
    [threadCursor, setThreadCursor] = useState(null),
    [historyCursor, setHistoryCursor] = useState(null);
  const [state, setState] = useState(initialState),
    [items, setItems] = useState({}),
    [logs, setLogs] = useState([]),
    [text, setText] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [tab, setTab] = useState("activity"),
    [settings, setSettings] = useState(false),
    [voiceOn, setVoiceOn] = useState(false),
    [mouth, setMouth] = useState(0),
    [answers, setAnswers] = useState({});
  const displayName =
    character?.builtin === "rin" && character.name === "Rin"
      ? character.localizedNames?.[language] || character.name
      : character?.name || t("Your character");
  const settingsToggle = useRef(null);
  function closeSettings() {
    setSettings(false);
    settingsToggle.current?.focus();
  }
  useEffect(() => {
    if (!settings) return;
    const dismiss = (event) => {
      if (
        event.key !== "Escape" ||
        event.defaultPrevented ||
        state.pending.length ||
        ["checking", "downloading", "processing"].includes(
          backgroundStatus.stage,
        )
      )
        return;
      event.preventDefault();
      closeSettings();
    };
    window.addEventListener("keydown", dismiss);
    return () => window.removeEventListener("keydown", dismiss);
  }, [settings, state.pending.length, backgroundStatus.stage]);
  const labels = Object.fromEntries(
    [
      "idle",
      "listening",
      "thinking",
      "reading",
      "coding",
      "approval",
      "speaking",
      "success",
      "failure",
      "interrupted",
    ].map((p) => [p, t("state." + p)]),
  );
  const voice = useRef(new SystemVoice()),
    voiceEnabled = useRef(false),
    charRef = useRef(null),
    currentThread = useRef(null),
    bottom = useRef(null),
    inflight = useRef(false);
  const dragging = useRef(false),
    dockTimer = useRef(null);
  function applyPreferences(result, preserveEdits = false) {
    if (!result) return;
    if (result.builtinCharacterId)
      builtinId.current = result.builtinCharacterId;
    if (result.interface) setAppearance(result.interface);
    if (result.backgroundRemoval)
      setBackgroundOptions(result.backgroundRemoval);
    if (result.background) setBackgroundStatus(result.background);
    setLanguage(result.language);
    setLibrary(result.characters);
    setCharacter(result.character);
    if (!preserveEdits) setPersona(result.character?.persona || "");
    charRef.current = {
      ...result.character,
      voice: {
        rate: 1,
        pitch: 1,
        ...result.character?.voice,
        lang: { zh: "zh-CN", en: "en-US", ja: "ja-JP" }[result.language],
      },
    };
    if (Number.isFinite(result.desktop?.width)) setDesktop(result.desktop);
  }
  useEffect(() => {
    setProfileName(character?.name || "");
    setPreviewPhase(null);
  }, [character?.id]);
  useEffect(() => {
    if (state.busy || state.pending.length || state.error)
      setPreviewPhase(null);
  }, [state.busy, state.pending.length, state.error]);
  useEffect(() => () => clearTimeout(dockTimer.current), [desktop?.edge]);
  useEffect(() => {
    document.documentElement.lang = { zh: "zh-CN", en: "en", ja: "ja" }[
      language
    ];
    document.title = "Anime Codex · " + displayName;
    if (charRef.current)
      charRef.current.voice = {
        ...charRef.current.voice,
        lang: { zh: "zh-CN", en: "en-US", ja: "ja-JP" }[language],
      };
  }, [language, displayName]);
  function dragStart(e) {
    if (e.button !== 0 || e.target.closest("button,input,select,textarea"))
      return;
    pointerSession.current = {
      x: e.clientX,
      y: e.clientY,
      character: e.currentTarget.dataset.testid === "character",
      dragged: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function dragMove(e) {
    const session = pointerSession.current;
    if (
      session &&
      !session.dragged &&
      isDrag(session, { x: e.clientX, y: e.clientY })
    ) {
      session.dragged = true;
      dragging.current = true;
      api
        .desktopControl({ action: "beginDrag", x: session.x, y: session.y })
        .catch((error) => setError(error.message));
    }
    if (dragging.current)
      api
        .desktopControl({ action: "dragMove", x: e.clientX, y: e.clientY })
        .catch(() => {});
  }
  function dragEnd(e) {
    const session = pointerSession.current;
    pointerSession.current = null;
    if (!dragging.current) {
      if (session?.character && e.type !== "pointercancel") {
        const entry = hitMask.current;
        if (!entry) return;
        const point = touchPoint(
          e.currentTarget.getBoundingClientRect(),
          entry.width,
          entry.height,
          e.clientX,
          e.clientY,
        );
        if (
          !point ||
          entry.alpha[
            (Math.floor(point.y * 128) * 128 + Math.floor(point.x * 128)) * 4 +
              3
          ] < 32
        )
          return;
        reactToTouch(point.region);
      }
      return;
    }
    dragging.current = false;
    api
      .desktopControl({ action: "endDrag" })
      .catch((error) => setError(error.message));
  }
  const dragEvents = {
    onPointerDown: dragStart,
    onPointerMove: dragMove,
    onPointerUp: dragEnd,
    onPointerCancel: dragEnd,
  };
  function updateAppearance(patch) {
    setAppearance((p) => ({ ...p, ...patch }));
    api.setInterface(patch).catch((error) => setError(error.message));
  }
  function reactToTouch(region) {
    if (
      !appearance.interactions ||
      state.pending.length ||
      performance.now() - lastReaction.current < 850
    )
      return;
    lastReaction.current = performance.now();
    clearTimeout(reactionTimer.current);
    setReaction({
      region,
      index: Math.floor(Math.random() * 3),
      id: performance.now(),
    });
    reactionTimer.current = setTimeout(() => setReaction(null), 3000);
  }
  useEffect(() => {
    setReaction(null);
    clearTimeout(reactionTimer.current);
  }, [character?.id, appearance.interactions]);
  useEffect(() => () => clearTimeout(reactionTimer.current), []);
  async function run(fn) {
    if (inflight.current) return;
    inflight.current = true;
    setLoading(true);
    setError("");
    try {
      return await fn();
    } catch (e) {
      setError(
        String(e.message).replace(
          /^Error invoking remote method '[^']+': (?:Error: )?/,
          "",
        ),
      );
    } finally {
      inflight.current = false;
      setLoading(false);
    }
  }
  useEffect(() => {
    if (!api) {
      setError(t("Start the Electron desktop app to connect to Codex."));
      return;
    }
    api
      .bootstrap()
      .then(applyPreferences)
      .catch((e) => setError(e.message));
    return api.onEvent((e) => {
      if (e.method === "client/background") {
        setBackgroundStatus(e.params);
        return;
      }
      if (e.method === "client/desktop") {
        setDesktop(e.params);
        return;
      }
      if (e.method === "client/inputRestored") {
        setClickthrough(false);
        return;
      }
      if (
        e.params?.threadId &&
        currentThread.current &&
        e.params.threadId !== currentThread.current
      )
        return;
      setLogs((old) => [
        ...old.slice(-499),
        { ...e, receivedAt: new Date().toLocaleTimeString() },
      ]);
      setState((s) => reduceEvent(s, e));
      const p = e.params || {};
      if (e.method === "client/disconnected") {
        setConnected(false);
        setError(p.message);
        voice.current.stop();
      }
      if (["item/started", "item/completed"].includes(e.method)) {
        setItems((old) => ({
          ...old,
          [p.item.id]: { ...old[p.item.id], ...p.item },
        }));
        if (
          e.method === "item/completed" &&
          p.item.type === "agentMessage" &&
          voiceEnabled.current
        ) {
          voice.current.speak(
            p.item.text,
            charRef.current.voice,
            setMouth,
            () => setMouth(0),
          );
        }
      }
      if (e.method === "item/agentMessage/delta")
        setItems((old) => ({
          ...old,
          [p.itemId]: {
            ...old[p.itemId],
            id: p.itemId,
            type: "agentMessage",
            text: (old[p.itemId]?.text || "") + p.delta,
          },
        }));
      if (e.method === "item/commandExecution/outputDelta")
        setItems((old) => ({
          ...old,
          [p.itemId]: {
            ...old[p.itemId],
            id: p.itemId,
            type: "commandExecution",
            aggregatedOutput: (old[p.itemId]?.aggregatedOutput || "") + p.delta,
          },
        }));
    });
  }, []);
  useEffect(() => {
    if (Object.keys(items).length)
      bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [items]);
  useEffect(() => {
    voiceEnabled.current = voiceOn;
    if (!voiceOn) {
      voice.current.stop();
      setMouth(0);
    }
  }, [voiceOn]);
  useEffect(() => () => voice.current.stop(), []);
  useEffect(() => {
    if (!api) return;
    let ignored = false;
    const move = (e) => {
      if (dragging.current) return;
      const target =
        document.elementFromPoint(e.clientX, e.clientY) || e.target;
      const interactive =
        target instanceof Element &&
        target.closest(
          "button,input,textarea,select,.sidebar,.conversation,.evidence,.settings,.approval-shade,.overlay-controls,.character,.dock-tab,.background-progress",
        );
      const next = clickthrough && !interactive;
      if (next !== ignored) {
        ignored = next;
        api
          .windowControl({ action: "passthrough", value: next })
          .catch(() => {});
      }
      const x = (e.clientX / window.innerWidth - 0.5) * 2,
        y = (e.clientY / window.innerHeight - 0.5) * 2;
      document.documentElement.style.setProperty("--look-x", `${x * 2}px`);
      document.documentElement.style.setProperty("--look-y", `${y * 1.5}px`);
    };
    window.addEventListener("mousemove", move);
    if (!clickthrough)
      api.windowControl({ action: "passthrough", value: false });
    return () => {
      window.removeEventListener("mousemove", move);
      api
        .windowControl({ action: "passthrough", value: false })
        .catch(() => {});
    };
  }, [clickthrough]);
  async function refresh(cursor = null) {
    const r = await api.listThreads({ cursor });
    setThreads((old) => (cursor ? [...old, ...r.data] : r.data));
    setThreadCursor(r.nextCursor);
  }
  async function connectBackend(executable) {
    const r = await api.connect(executable ? { executable } : {});
    setAccount(r.account?.type || t("Not signed in"));
    if (!r.account && r.requiresOpenaiAuth) {
      setConnected(false);
      throw new Error(
        t("Codex is not signed in. Run codex login, then connect again."),
      );
    }
    setConnected(true);
  }
  async function prepareConversation() {
    if (!connected) await connectBackend();
    const directory = await api.chooseWorkspace();
    if (!directory) return;
    setWorkspace(directory);
    reset(null);
    await refresh();
  }
  async function saveCurrentCharacter() {
    if (!character) return;
    applyPreferences(
      await api.updateCharacter({
        id: character.id,
        name: profileName,
        persona,
      }),
    );
  }
  async function importAction(phase, id) {
    const result = await api.importActionImage({ phase, id });
    if (result) {
      applyPreferences(result, !!character && id === character.id);
      if (!state.busy) setPreviewPhase(phase);
    }
  }
  function reset(id) {
    currentThread.current = id;
    setThread(id);
    setItems({});
    setLogs([]);
    setState(initialState());
    setHistoryCursor(null);
    voice.current.stop();
  }
  async function history(id, cursor = null) {
    const r = await api.history({ id, cursor });
    const older = {};
    for (const t of [...r.data].reverse())
      for (const i of t.items || []) older[i.id] = i;
    setItems((old) => ({ ...older, ...old }));
    setHistoryCursor(r.nextCursor);
  }
  async function send(e) {
    e.preventDefault();
    if (!text.trim() || state.busy || loading) return;
    if (!connected || !workspace) {
      setError(
        !connected
          ? t("Connect to Codex using the setup button before sending.")
          : t("Choose a project folder before sending."),
      );
      return;
    }
    const value = text;
    await run(async () => {
      let id = thread;
      if (!id) {
        const r = await api.newThread({ persona, mode });
        id = r.thread.id;
        reset(id);
      }
      setState((s) => ({ ...s, busy: true, phase: "thinking" }));
      try {
        await api.send({ id, text: value });
        setText("");
        await refresh();
      } catch (e) {
        setState((s) => ({ ...s, busy: false, phase: "failure" }));
        throw e;
      }
    });
  }
  const phase =
    previewPhase ||
    (state.pending.length
      ? "approval"
      : mouth > 0
        ? "speaking"
        : !state.busy && text
          ? "listening"
          : state.phase);
  const visualPhase =
    reaction && !state.busy && !state.pending.length ? "success" : phase;
  const imageAction = resolveAction(character?.images, visualPhase);
  const imageSrc = character?.images?.[imageAction]?.src;
  useEffect(() => {
    hitMask.current = null;
    if (!imageSrc) return;
    let active = true;
    const image = new Image();
    image.onload = () => {
      if (!active) return;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 128;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0, 128, 128);
      hitMask.current = {
        width: image.naturalWidth,
        height: image.naturalHeight,
        alpha: context.getImageData(0, 0, 128, 128).data,
      };
    };
    image.src = imageSrc;
    return () => {
      active = false;
    };
  }, [imageSrc]);
  const transcript = Object.values(items).filter((i) =>
    ["userMessage", "agentMessage"].includes(i.type),
  );
  const tools = Object.values(items).filter(
    (i) => !["userMessage", "agentMessage", "reasoning"].includes(i.type),
  );
  const avatarWidth = desktop?.width || 320,
    avatarHeight = desktop?.height || 426,
    avatarX = desktop?.x ?? window.innerWidth - 360,
    avatarY = desktop?.y ?? window.innerHeight - 540;
  const panelWidth = Math.min(490, window.innerWidth - 32),
    panelX =
      avatarX >= panelWidth + 32
        ? avatarX - panelWidth - 24
        : Math.min(
            window.innerWidth - panelWidth - 16,
            avatarX + avatarWidth + 20,
          ),
    panelY = Math.max(16, Math.min(avatarY, window.innerHeight - 730));
  return (
    <div
      style={{
        "--chat-font-size": `${appearance.fontSize}px`,
        "--panel-x": `${Math.max(16, panelX)}px`,
        "--panel-y": `${panelY}px`,
        "--settings-x": `${avatarX >= 744 ? avatarX - 744 : Math.max(16, Math.min(window.innerWidth - 736, avatarX + avatarWidth + 24))}px`,
      }}
      className={
        "app desktop-overlay " +
        (workbench ? "workbench-open " : "") +
        (dialogue ? "dialogue-open" : "dialogue-closed") +
        (desktop?.edge ? " is-docked" : "")
      }
    >
      {["checking", "downloading", "processing"].includes(
        backgroundStatus.stage,
      ) && (
        <section
          className="background-progress"
          role="status"
          aria-live="polite"
        >
          <strong>
            {t("bg." + backgroundStatus.stage)}
            {backgroundStatus.stage === "downloading"
              ? " · " + backgroundStatus.percent + "%"
              : ""}
          </strong>
          <progress
            max="100"
            value={
              backgroundStatus.stage === "downloading"
                ? backgroundStatus.percent
                : undefined
            }
          />
          <small>
            {t("Images stay on this computer. The original is kept.")}
          </small>
          <button
            data-testid="cancel-background"
            onClick={() => api.cancelBackgroundRemoval()}
          >
            {t("Cancel background removal")}
          </button>
        </section>
      )}
      {desktop?.edge && (
        <button
          className={"dock-tab edge-" + desktop.edge}
          data-testid="dock-tab"
          style={{
            left: desktop.tab.x,
            top: desktop.tab.y,
            width: desktop.tab.width,
            height: desktop.tab.height,
          }}
          onClick={() => api.desktopControl({ action: "expand" })}
          onMouseEnter={() => {
            dockTimer.current = setTimeout(
              () => api.desktopControl({ action: "expand" }),
              350,
            );
          }}
          onMouseLeave={() => clearTimeout(dockTimer.current)}
          aria-label={t("Show character")}
        >
          {displayName} ◂
        </button>
      )}
      <div className="overlay-controls">
        <span
          className="drag-handle"
          {...dragEvents}
          title={t("Drag to move the character")}
        >
          {t("⠿ {name}", { name: displayName })}
        </span>
        <button
          data-testid="toggle-chat"
          onClick={() => setDialogue(!dialogue)}
        >
          {dialogue
            ? t("Hide chat")
            : t("Chat with {name}", { name: displayName })}
        </button>
        <button onClick={() => setWorkbench(!workbench)}>
          {workbench ? t("Hide workspace") : t("Show workspace")}
        </button>
        <button
          disabled={!connected || state.busy || loading}
          onClick={() =>
            run(async () => {
              const d = await api.chooseWorkspace();
              if (d) {
                setWorkspace(d);
                reset(null);
                await refresh();
              }
            })
          }
          title={workspace}
        >
          {workspace ? workspace.split(/[\\/]/).at(-1) : t("Choose project")}
        </button>
        <button
          data-testid="settings-toggle"
          ref={settingsToggle}
          aria-expanded={settings}
          aria-controls="character-connection-settings"
          onClick={() => setSettings(!settings)}
        >
          {t("Settings")}
        </button>
        <button
          data-testid="open-play"
          onClick={() =>
            api.openPlay().catch((error) => setError(error.message))
          }
        >
          {t("Open playroom")}
        </button>
        <button
          aria-label={t("Smaller")}
          onClick={() =>
            api.desktopControl({
              action: "scale",
              value: (desktop?.scale || 1) - 0.1,
            })
          }
        >
          −
        </button>
        <span className="scale-indicator">
          {Math.round((desktop?.scale || 1) * 100)}%
        </span>
        <button
          aria-label={t("Larger")}
          onClick={() =>
            api.desktopControl({
              action: "scale",
              value: (desktop?.scale || 1) + 0.1,
            })
          }
        >
          ＋
        </button>
        <select
          data-testid="language-select"
          aria-label={t("Language")}
          value={language}
          onChange={(e) =>
            run(async () => {
              const result = await api.setLanguage({
                language: e.target.value,
              });
              setLanguage(result.language);
            })
          }
        >
          {Object.entries(languages).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            setPinned(!pinned);
            api.windowControl({ action: "alwaysOnTop", value: !pinned });
          }}
        >
          {pinned ? t("Pinned") : t("Pin")}
        </button>
        <button
          title={t("Pass clicks through transparent areas")}
          onClick={() => setClickthrough(!clickthrough)}
        >
          {clickthrough ? t("Click-through on") : t("Click-through off")}
        </button>
        <button
          aria-label={t("Minimize")}
          onClick={() => api.windowControl({ action: "minimize" })}
        >
          —
        </button>
        <button
          aria-label={t("Close app")}
          onClick={() => api.windowControl({ action: "close" })}
        >
          ×
        </button>
      </div>
      <aside className="sidebar">
        <a className="brand" href="#">
          <span className="brand-icon">✧</span>
          <div>
            {t("ANIME CODEX")}
            <small>{t("YOUR IDEAS, OUR NEXT CHAPTER")}</small>
          </div>
        </a>
        <div className="side-section">
          <span className="eyebrow">{t("WORKSPACE")}</span>
          <button
            className="project"
            disabled={!connected || state.busy || loading}
            onClick={() =>
              run(async () => {
                const d = await api.chooseWorkspace();
                if (d) {
                  setWorkspace(d);
                  reset(null);
                  await refresh();
                }
              })
            }
          >
            <span>▧</span>
            <span>
              {workspace
                ? workspace.split(/[\\/]/).at(-1)
                : t("Choose a project")}
              <small title={workspace}>
                {workspace || t("Where your project begins")}
              </small>
            </span>
            <span>⌄</span>
          </button>
        </div>
        <button
          className="new-chat"
          disabled={!workspace || state.busy || loading}
          onClick={() =>
            run(async () => {
              const r = await api.newThread({ persona, mode });
              reset(r.thread.id);
              await refresh();
            })
          }
        >
          {t("＋ New conversation")}
        </button>
        <div className="thread-head">
          <span className="eyebrow">{t("CONVERSATIONS")}</span>
          <button
            aria-label={t("Refresh conversations")}
            disabled={!workspace || loading}
            onClick={() => run(() => refresh())}
          >
            ↻
          </button>
        </div>
        <nav className="thread-list">
          {threads.map((threadEntry) => (
            <button
              className={thread === threadEntry.id ? "selected" : ""}
              key={threadEntry.id}
              disabled={state.busy || loading}
              title={threadEntry.id}
              onClick={() =>
                run(async () => {
                  await api.resume({ id: threadEntry.id, persona, mode });
                  reset(threadEntry.id);
                  await history(threadEntry.id);
                })
              }
            >
              <span>◇</span>
              {threadEntry.name || threadEntry.preview || t("New conversation")}
            </button>
          ))}
          {threadCursor && (
            <button onClick={() => run(() => refresh(threadCursor))}>
              {t("Load more conversations")}
            </button>
          )}
          {!threads.length && (
            <p className="muted">
              {t("Keep a record of what")}
              <br />
              {t("we build together.")}
            </p>
          )}
        </nav>
        <div className="side-bottom">
          <span className={"connection " + (connected ? "online" : "")}>
            ● {connected ? t("Codex connected") : t("Codex disconnected")}
          </span>
          <small>{account}</small>
          <button onClick={() => setSettings(!settings)}>
            {t("⚙ Character and connection settings")}
          </button>
          <p>{t("Your character speaks. Codex executes.")}</p>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <span className="eyebrow">
              {t("A LITTLE PRESENCE. REAL PROGRESS.")}
            </span>
            <h1>
              {t("Take the next step with {name}", { name: displayName })}
              <span className="header-star">✧</span>
            </h1>
          </div>
          <div className="header-actions">
            <span className="pill">
              {mode === "read-only"
                ? t("Read-only mode")
                : t("Project write access")}
            </span>
            <button
              className={voiceOn ? "active" : ""}
              onClick={() => setVoiceOn(!voiceOn)}
            >
              {" "}
              {voiceOn ? t("◖ Voice on") : t("◖ Voice off")}
            </button>
          </div>
        </header>
        {error && (
          <div role="alert" className="error">
            {error}
            <button onClick={() => setError("")}>×</button>
          </div>
        )}
        {settings && (
          <section
            className="settings"
            id="character-connection-settings"
            role="dialog"
            aria-labelledby="settings-title"
          >
            <div className="settings-header">
              <h2 id="settings-title">{t("Character and connection")}</h2>
              <button
                type="button"
                className="settings-close"
                data-testid="settings-close"
                onClick={closeSettings}
                aria-label={t("Close settings")}
                title={t("Close settings")}
              >
                ×
              </button>
            </div>
            <CharacterSettings
              onOriginalRin={() =>
                run(async () => {
                  if (builtinId.current) {
                    const restored = await api.selectCharacter({
                      id: builtinId.current,
                    });
                    applyPreferences(restored);
                    setProfileName(restored.character?.name || "");
                    setPreviewPhase(null);
                  }
                })
              }
              backgroundAutomatic={backgroundOptions.automatic}
              onBackgroundAutomatic={(automatic) =>
                run(async () => {
                  const result = await api.setBackgroundOptions({ automatic });
                  setBackgroundOptions(result.backgroundRemoval);
                })
              }
              onRemoveBackground={(phase) =>
                run(async () =>
                  applyPreferences(
                    await api.removeBackground({ id: character.id, phase }),
                    true,
                  ),
                )
              }
              onRestoreOriginal={(phase) =>
                run(async () =>
                  applyPreferences(
                    await api.restoreOriginal({ id: character.id, phase }),
                    true,
                  ),
                )
              }
              t={t}
              character={character}
              library={library}
              language={language}
              profileName={profileName}
              setProfileName={setProfileName}
              loading={loading}
              busy={state.busy}
              preview={previewPhase}
              setPreview={setPreviewPhase}
              onSelect={(id) =>
                run(async () =>
                  applyPreferences(await api.selectCharacter({ id })),
                )
              }
              onImport={(phase, id) => run(() => importAction(phase, id))}
              onRemove={(phase) =>
                run(async () =>
                  applyPreferences(
                    await api.removeActionImage({ id: character.id, phase }),
                    true,
                  ),
                )
              }
              onSave={() => run(saveCurrentCharacter)}
            />
            <section className="appearance-settings">
              <h2>{t("Reading and interaction")}</h2>
              <label>
                {t("Conversation font size")} ·{" "}
                <output>{appearance.fontSize}px</output>
                <input
                  data-testid="font-size"
                  type="range"
                  min="14"
                  max="24"
                  step="1"
                  value={appearance.fontSize}
                  onChange={(e) =>
                    updateAppearance({ fontSize: Number(e.target.value) })
                  }
                />
              </label>
              <label className="checkbox-label">
                <input
                  data-testid="touch-enabled"
                  type="checkbox"
                  checked={appearance.interactions}
                  onChange={(e) =>
                    updateAppearance({ interactions: e.target.checked })
                  }
                />
                {t("Enable playful character reactions")}
              </label>
              <p>
                {t(
                  "Touch hair, shoulders or hands. Drag to move. Play in a separate window while I work.",
                )}
              </p>
              <button
                onClick={() =>
                  api.openPlay().catch((error) => setError(error.message))
                }
              >
                {t("Open playroom")}
              </button>
            </section>
            <section className="desktop-settings">
              <h2>{t("Character size")}</h2>
              <label>
                {t("Character size")} ·{" "}
                {Math.round((desktop?.scale || 1) * 100)}%
                <input
                  data-testid="character-scale"
                  type="range"
                  min="50"
                  max="180"
                  step="5"
                  value={Math.round((desktop?.scale || 1) * 100)}
                  onChange={(e) =>
                    api.desktopControl({
                      action: "scale",
                      value: Number(e.target.value) / 100,
                    })
                  }
                />
              </label>
              <label className="checkbox-label">
                <input
                  data-testid="auto-hide"
                  type="checkbox"
                  checked={desktop?.autoHide ?? true}
                  onChange={(e) =>
                    api.desktopControl({
                      action: "autoHide",
                      value: e.target.checked,
                    })
                  }
                />
                {t("Auto-hide at screen edges")}
              </label>
              <button onClick={() => api.desktopControl({ action: "reset" })}>
                {t("Reset position and size")}
              </button>
              <p>
                {t(
                  "Drag the character to move it. Alt + wheel resizes it. Click the edge tab to restore.",
                )}
              </p>
            </section>
            <div>
              <h2>{t("Settings")}</h2>
              <p>
                {t("Run codex login first. Official Codex manages sign-in.")}
              </p>
              <button
                disabled={connected || loading}
                onClick={() => run(() => connectBackend())}
              >
                {t("Connect to Codex on PATH")}
              </button>
              <button
                disabled={connected || loading}
                onClick={() =>
                  run(async () => {
                    const executable = await api.chooseExecutable();
                    if (executable) await connectBackend(executable);
                  })
                }
              >
                {t("Choose codex.exe and connect")}
              </button>
            </div>
            <label>
              {t("Permissions for new or resumed conversations")}
              <select
                disabled={state.busy || !!thread}
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="read-only">{t("Read-only (default)")}</option>
                <option value="workspace-write">
                  {t("Project write (can modify the selected folder)")}
                </option>
              </select>
              <small>
                {t(
                  "Choose a project and start a new conversation to change permissions. Project writes are not approved file by file; Codex handles boundary approvals.",
                )}
              </small>
            </label>
            <label className="persona">
              {t("Personality for new or resumed conversations")}
              <textarea
                value={persona}
                maxLength={12000}
                onChange={(e) => setPersona(e.target.value)}
              />
            </label>
            <p>
              {t(
                "Voice uses system TTS. Available voices depend on Windows. Accurate lip sync is not implemented.",
              )}
            </p>
          </section>
        )}
        <div className="workspace-grid">
          <section
            className="scene"
            style={{
              left: avatarX,
              top: avatarY,
              right: "auto",
              bottom: "auto",
              width: avatarWidth,
              height: avatarHeight + 28,
            }}
          >
            <div className="scene-top">
              <span className="eyebrow">
                {t("{name}", { name: displayName })}
              </span>
              <span className="scene-chip">
                {previewPhase ? t("Preview") + " · " : ""}
                {labels[phase] || phase}
              </span>
            </div>
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <span className="decor decor-one">✧</span>
            <span className="decor decor-two">＋</span>
            <div
              className={"character " + phase}
              data-testid="character"
              {...dragEvents}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (
                  event.target === event.currentTarget &&
                  ["Enter", " "].includes(event.key)
                ) {
                  event.preventDefault();
                  reactToTouch("hair");
                }
              }}
              onWheel={(e) => {
                if (e.altKey || e.ctrlKey)
                  api.desktopControl({
                    action: "scale",
                    value:
                      (desktop?.scale || 1) + (e.deltaY < 0 ? 0.05 : -0.05),
                  });
              }}
              style={{ "--mouth": mouth }}
              aria-label={
                t("{name}: ", { name: displayName }) + (labels[phase] || phase)
              }
              onDoubleClick={() => {
                if (!appearance.interactions) setDialogue(!dialogue);
              }}
              title={t(
                appearance.interactions
                  ? "Tap to interact. Drag to move. Alt + wheel to resize."
                  : "Drag to move. Double-click to toggle chat. Alt + wheel to resize.",
              )}
            >
              {character ? (
                <div
                  key={reaction?.id || "rest"}
                  className={
                    "interaction-motion " +
                    (reaction ? "react-" + reaction.region : "")
                  }
                >
                  <ImageCharacter
                    character={character}
                    phase={visualPhase}
                    name={displayName}
                    t={t}
                  />
                </div>
              ) : (
                <div className="empty-character">
                  <button
                    data-testid="import-first-idle"
                    onClick={() => run(() => importAction("idle", null))}
                  >
                    {t("Upload idle image")}
                  </button>
                  <p>
                    {t("One idle image is enough. Other actions are optional.")}
                  </p>
                </div>
              )}
            </div>
            {reaction && !state.pending.length && (
              <div
                className="touch-bubble"
                role="status"
                data-testid="touch-bubble"
                style={avatarY < 170 ? { top: 10, bottom: "auto" } : undefined}
              >
                <strong>{displayName}</strong>
                <p>{t(`touch.${reaction.region}.${reaction.index}`)}</p>
                <small>
                  {t(
                    state.busy
                      ? "Local reaction · programming continues"
                      : "Local character interaction",
                  )}
                </small>
              </div>
            )}
            <div className="scene-caption">
              <span className="tiny-line" />
              <h2>
                {t("{name} #2", { name: displayName })}
                <small>{t("CHARACTER")}</small>
              </h2>
              <p>
                {character?.subtitle || t("Turn ideas into reality together.")}
              </p>
              <div className="status-dots">
                <i />
                <i />
                <i />
              </div>
            </div>
            <div className="scene-foot">
              <span>
                ✦{" "}
                {state.busy
                  ? t("Working on this with you")
                  : t("Ready for your next idea")}
              </span>
              <span>01 — ∞</span>
            </div>
          </section>
          <section className="conversation">
            <div className="conversation-title">
              <span>{t("Our conversation")}</span>
              <span className="muted">
                {thread
                  ? t("Thread ") + thread.slice(0, 8)
                  : t("A new chapter")}
              </span>
            </div>
            <div className="messages" aria-live="polite">
              {historyCursor && (
                <button
                  disabled={loading}
                  onClick={() => run(() => history(thread, historyCursor))}
                >
                  {t("Load earlier history")}
                </button>
              )}
              {!transcript.length && (
                <div className="welcome">
                  <span className="eyebrow">{t("LET’S MAKE SOMETHING.")}</span>
                  <h2>{t("What would you like to build?")}</h2>
                  <p>
                    {t("I am {name}. Tell me what you have in mind.", {
                      name: displayName,
                    })}
                    <br />
                    {t("Tell me your idea. We can explore a project")}
                    <br />
                    {t("or make something new together.")}
                  </p>
                  <div className="suggestions">
                    {[
                      t("Help me understand this project"),
                      t("Review my changes for potential issues"),
                      t("Help me build a new feature"),
                    ].map((s) => (
                      <button key={s} onClick={() => setText(s)}>
                        {s}
                        <span>↗</span>
                      </button>
                    ))}
                  </div>
                  <p className="hint">
                    {t(
                      "This is a welcome message. Connected replies and execution events come from real Codex.",
                    )}
                  </p>
                </div>
              )}
              {transcript.map((i) => (
                <article className={"message " + i.type} key={i.id}>
                  <div className="message-author">
                    {i.type === "userMessage" ? t("You") : displayName}
                    <small>
                      {i.type === "agentMessage"
                        ? t("CODEX · ORIGINAL RESPONSE")
                        : ""}
                    </small>
                  </div>
                  <div className="message-body">
                    {i.type === "userMessage"
                      ? i.content?.map((c) => c.text || "").join("\n")
                      : i.text}
                  </div>
                </article>
              ))}
              {state.busy && (
                <div className="working">
                  <span className="pulse" /> {labels[state.phase]}
                </div>
              )}
              {state.error && (
                <div className="error">
                  {state.error.message || pretty(state.error)}
                </div>
              )}
              <div ref={bottom} />
            </div>
            {(!connected || !workspace) && (
              <div className="setup-guide" role="status">
                <strong>
                  {!connected
                    ? t("Not connected to Codex")
                    : t("Codex connected; choose a project")}
                </strong>
                <p>
                  {t(
                    "Choose a project folder to send messages. The default mode is read-only.",
                  )}
                </p>
                <button
                  disabled={loading || state.busy}
                  onClick={() => run(prepareConversation)}
                >
                  {loading
                    ? t("Getting ready…")
                    : !connected
                      ? t("Connect to Codex and choose project")
                      : t("Choose project and start chatting")}
                </button>
              </div>
            )}
            <form className="composer" onSubmit={send}>
              <textarea
                data-testid="message-input"
                aria-label={t("Message for {name}", { name: displayName })}
                placeholder={
                  !connected
                    ? t("Write your idea, then connect using the button above…")
                    : !workspace
                      ? t("Choose a project using the button above…")
                      : t("Tell {name} your idea…", { name: displayName })
                }
                value={text}
                disabled={state.busy}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !e.nativeEvent.isComposing
                  ) {
                    e.preventDefault();
                    send(e);
                  }
                }}
              />
              <div className="composer-bottom">
                <span>
                  {state.busy
                    ? t("Task running; you can stop at any time")
                    : t("Enter to send · Shift + Enter for a new line")}
                </span>
                {state.busy ? (
                  <button
                    type="button"
                    className="stop"
                    onClick={() => run(() => api.interrupt())}
                  >
                    {t("■ Stop")}
                  </button>
                ) : (
                  <button
                    className="send"
                    disabled={
                      !connected || !workspace || !text.trim() || loading
                    }
                  >
                    {t("Send ↗")}
                  </button>
                )}
              </div>
            </form>
            <div className="privacy">
              {t(
                "Check execution records · Permissions are never automatically approved",
              )}
            </div>
          </section>
          <aside className="evidence">
            <div className="evidence-title">
              <span>{t("Execution records")}</span>
              <span className="live">{t("● LIVE")}</span>
            </div>
            <div className="tabs">
              {[
                ["activity", t("Progress")],
                ["diff", "Diff"],
                ["events", t("Events")],
              ].map(([k, v]) => (
                <button
                  key={k}
                  className={tab === k ? "active" : ""}
                  onClick={() => setTab(k)}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="evidence-content">
              {tab === "activity" && (
                <>
                  <div className="evidence-status">
                    <span className="pulse" />
                    <div>
                      {labels[state.phase]}
                      <small>
                        {state.busy
                          ? t("From Codex events")
                          : t("Waiting for the next step")}
                      </small>
                    </div>
                  </div>
                  {state.plan?.map((p, i) => (
                    <p className="plan" key={i}>
                      {p.status === "completed" ? "✓" : "○"} {p.step}
                    </p>
                  ))}
                  {!tools.length && (
                    <div className="empty-evidence">
                      <span>⌘</span>
                      <p>{t("Every step has a record")}</p>
                      <small>
                        {t("Tool calls, command output and changes")}
                        <br />
                        {t("appear here as they happen.")}
                      </small>
                    </div>
                  )}
                  {tools.map((i) => (
                    <details
                      className="tool"
                      key={i.id}
                      open={i.status === "inProgress"}
                    >
                      <summary>
                        <span>{i.type === "fileChange" ? "✎" : "⌘"}</span>
                        <div>
                          {i.command || i.tool || i.type}
                          <small>
                            {i.status ? t("status." + i.status) : t("Recorded")}
                            {i.exitCode !== null && i.exitCode !== undefined
                              ? ` · exit ${i.exitCode}`
                              : ""}
                          </small>
                        </div>
                      </summary>
                      <pre>{i.aggregatedOutput || pretty(i)}</pre>
                    </details>
                  ))}
                </>
              )}
              {tab === "diff" && (
                <pre className="diff">
                  {state.diff ||
                    t(
                      "No diff received for this turn. Open fileChange records to inspect earlier edits.",
                    )}
                </pre>
              )}
              {tab === "events" && (
                <>
                  <p className="muted">
                    {t(
                      "The latest 500 raw events. Codex stores additional thread history.",
                    )}
                  </p>
                  {logs.map((e, i) => (
                    <details key={i} className="event">
                      <summary>
                        {e.receivedAt} · {e.method}
                      </summary>
                      <pre>{pretty(e)}</pre>
                    </details>
                  ))}
                </>
              )}
            </div>
            <div className="boundary">
              <span>{t("◇ Execution boundaries")}</span>
              <p>
                {mode === "read-only"
                  ? t("Read-only access.")
                  : t("Codex may modify the selected project.")}
                <br />
                {t("You decide approvals. Failures are shown honestly.")}
              </p>
            </div>
          </aside>
        </div>
      </main>
      {state.pending.length > 0 && (
        <div className="approval-shade">
          <section
            className="approval"
            role="dialog"
            aria-modal="true"
            aria-label={t("Codex request")}
          >
            <span className="eyebrow">{t("YOUR DECISION MATTERS")}</span>
            <h2>{t("This step needs your decision")}</h2>
            <p>
              {t("{name} will wait. This is the original request from Codex.", {
                name: displayName,
              })}
            </p>
            <h3>{state.pending[0].method}</h3>
            <pre>{pretty(state.pending[0].params)}</pre>
            {state.pending[0].method === "item/tool/requestUserInput" &&
              state.pending[0].params.questions.map((q) => (
                <label key={q.id}>
                  {q.header} · {q.question}
                  <input
                    list={"q-" + q.id}
                    value={answers[q.id] || ""}
                    onChange={(e) =>
                      setAnswers({ ...answers, [q.id]: e.target.value })
                    }
                  />
                  <datalist id={"q-" + q.id}>
                    {q.options?.map((o) => (
                      <option key={o.label} value={o.label}>
                        {o.description}
                      </option>
                    ))}
                  </datalist>
                </label>
              ))}
            <div className="approval-actions">
              {[
                "item/commandExecution/requestApproval",
                "item/fileChange/requestApproval",
              ].includes(state.pending[0].method) ? (
                ["decline", "accept"]
                  .filter(
                    (d) =>
                      !state.pending[0].params.availableDecisions ||
                      state.pending[0].params.availableDecisions.includes(d),
                  )
                  .map((d) => (
                    <button
                      key={d}
                      className={d === "accept" ? "send" : ""}
                      disabled={loading}
                      onClick={() =>
                        run(() =>
                          api.answer({ id: state.pending[0].id, decision: d }),
                        )
                      }
                    >
                      {d === "accept" ? t("Approve once") : t("Decline")}
                    </button>
                  ))
              ) : (
                <button
                  disabled={loading}
                  onClick={() =>
                    run(() => api.answer({ id: state.pending[0].id, answers }))
                  }
                >
                  {state.pending[0].method === "item/tool/requestUserInput"
                    ? t("Submit answers")
                    : t("Decline / grant no permissions")}
                </button>
              )}
              <button onClick={() => run(() => api.interrupt())}>
                {t("Stop task")}
              </button>
            </div>
            <small>
              {t(
                "Unknown requests can only be declined. No permanent or automatic approvals.",
              )}
            </small>
            {error && <p className="error">{error}</p>}
          </section>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")).render(
  new URLSearchParams(location.search).get("surface") === "play" ? (
    <GameApp />
  ) : (
    <App />
  ),
);
