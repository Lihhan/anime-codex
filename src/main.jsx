import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { initialState, reduceEvent, labels } from "../shared/state.mjs";
import { SystemVoice } from "./voice";
import "./style.css";
const api = window.animeCodex;
const pretty = (v) => JSON.stringify(v, null, 2);
function App() {
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
  const voice = useRef(new SystemVoice()),
    voiceEnabled = useRef(false),
    charRef = useRef(null),
    currentThread = useRef(null),
    bottom = useRef(null),
    inflight = useRef(false);
  async function run(fn) {
    if (inflight.current) return;
    inflight.current = true;
    setLoading(true);
    setError("");
    try {
      return await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      inflight.current = false;
      setLoading(false);
    }
  }
  useEffect(() => {
    if (!api) {
      setError("请通过 Electron 桌面应用启动；普通浏览器不能连接编程后端。");
      return;
    }
    api
      .bootstrap()
      .then(({ character: c }) => {
        setCharacter(c);
        charRef.current = c;
        setPersona(c.persona);
      })
      .catch((e) => setError(e.message));
    return api.onEvent((e) => {
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
      const target = e.target;
      const interactive =
        target instanceof Element &&
        target.closest(
          "button,input,textarea,select,.sidebar,.conversation,.evidence,.settings,.approval,.overlay-controls,.character",
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
    setAccount(r.account?.type || "未登录");
    if (!r.account && r.requiresOpenaiAuth) {
      setConnected(false);
      throw new Error(
        "Codex 尚未登录。请先在终端运行 codex login，再点击连接。",
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
          ? "还未连接 Codex，请点击对话框下方的连接按钮。"
          : "请先选择项目目录，再发送消息。",
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
  const phase = !state.busy && text ? "listening" : state.phase;
  const transcript = Object.values(items).filter((i) =>
    ["userMessage", "agentMessage"].includes(i.type),
  );
  const tools = Object.values(items).filter(
    (i) => !["userMessage", "agentMessage", "reasoning"].includes(i.type),
  );
  return (
    <div
      className={
        "app desktop-overlay " +
        (workbench ? "workbench-open " : "") +
        (dialogue ? "dialogue-open" : "dialogue-closed")
      }
    >
      <svg
        width="0"
        height="0"
        aria-hidden="true"
        style={{ position: "absolute" }}
      >
        <defs>
          <filter id="clean-alpha" colorInterpolationFilters="sRGB">
            <feComponentTransfer>
              <feFuncA type="table" tableValues="0 0 0 0 0.15 1 1 1 1" />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>
      <div className="overlay-controls">
        <span className="drag-handle" title="拖动整个角色窗口">
          ⠿ 凛
        </span>
        <button onClick={() => setDialogue(!dialogue)}>
          {dialogue ? "收起对话" : "和凛说话"}
        </button>
        <button onClick={() => setWorkbench(!workbench)}>
          {workbench ? "收起工作台" : "展开工作台"}
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
          {workspace ? workspace.split(/[\\/]/).at(-1) : "选择项目"}
        </button>
        <button onClick={() => setSettings(!settings)}>连接与角色</button>
        <button
          onClick={() => {
            setPinned(!pinned);
            api.windowControl({ action: "alwaysOnTop", value: !pinned });
          }}
        >
          {pinned ? "已置顶" : "置顶"}
        </button>
        <button
          title="透明区域可直接操作桌面"
          onClick={() => setClickthrough(!clickthrough)}
        >
          {clickthrough ? "穿透开" : "穿透关"}
        </button>
        <button
          aria-label="最小化"
          onClick={() => api.windowControl({ action: "minimize" })}
        >
          —
        </button>
        <button
          aria-label="关闭应用"
          onClick={() => api.windowControl({ action: "close" })}
        >
          ×
        </button>
      </div>
      <aside className="sidebar">
        <a className="brand" href="#">
          <span className="brand-icon">✧</span>
          <div>
            ANIME CODEX<small>YOUR IDEAS, OUR NEXT CHAPTER</small>
          </div>
        </a>
        <div className="side-section">
          <span className="eyebrow">WORKSPACE</span>
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
              {workspace ? workspace.split(/[\\/]/).at(-1) : "选择一个项目"}
              <small title={workspace}>
                {workspace || "代码与故事开始的地方"}
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
          ＋ 开启新对话
        </button>
        <div className="thread-head">
          <span className="eyebrow">CONVERSATIONS</span>
          <button
            aria-label="刷新会话"
            disabled={!workspace || loading}
            onClick={() => run(() => refresh())}
          >
            ↻
          </button>
        </div>
        <nav className="thread-list">
          {threads.map((t) => (
            <button
              className={thread === t.id ? "selected" : ""}
              key={t.id}
              disabled={state.busy || loading}
              title={t.id}
              onClick={() =>
                run(async () => {
                  await api.resume({ id: t.id, persona, mode });
                  reset(t.id);
                  await history(t.id);
                })
              }
            >
              <span>◇</span>
              {t.name || t.preview || "新对话"}
            </button>
          ))}
          {threadCursor && (
            <button onClick={() => run(() => refresh(threadCursor))}>
              加载更多会话
            </button>
          )}
          {!threads.length && (
            <p className="muted">
              这里会留下我们一起
              <br />
              解决问题的记录。
            </p>
          )}
        </nav>
        <div className="side-bottom">
          <span className={"connection " + (connected ? "online" : "")}>
            ● {connected ? "Codex 已连接" : "Codex 未连接"}
          </span>
          <small>{account}</small>
          <button onClick={() => setSettings(!settings)}>
            ⚙ 角色与连接设置
          </button>
          <p>角色陪你交流 · 执行由 Codex 完成</p>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <span className="eyebrow">A LITTLE PRESENCE. REAL PROGRESS.</span>
            <h1>
              和凛一起，写下下一步<span className="header-star">✧</span>
            </h1>
          </div>
          <div className="header-actions">
            <span className="pill">
              {mode === "read-only" ? "只读模式" : "项目内写入"}
            </span>
            <button
              className={voiceOn ? "active" : ""}
              onClick={() => setVoiceOn(!voiceOn)}
            >
              {" "}
              {voiceOn ? "◖ 语音开启" : "◖ 语音关闭"}
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
          <section className="settings">
            <div>
              <h2>连接与角色</h2>
              <p>先在终端运行 codex login。登录信息由官方 Codex 管理。</p>
              <button
                disabled={connected || loading}
                onClick={() => run(() => connectBackend())}
              >
                连接 PATH 中的 Codex
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
                选择 codex.exe 并连接
              </button>
            </div>
            <label>
              新建 / 恢复会话的权限
              <select
                disabled={state.busy || !!thread}
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="read-only">只读（默认）</option>
                <option value="workspace-write">
                  项目内写入（可修改选中目录）
                </option>
              </select>
              <small>
                切换权限前请先选择项目，开始新会话。项目写入不会逐文件询问，越界操作仍由
                Codex 审批。
              </small>
            </label>
            <label className="persona">
              凛的性格 · 应用于新建 / 恢复会话
              <textarea
                value={persona}
                maxLength={12000}
                onChange={(e) => setPersona(e.target.value)}
              />
            </label>
            <p>
              语音使用系统 TTS；可用中文声音取决于
              Windows。示例口型为近似节奏动画，不是音素同步。
            </p>
          </section>
        )}
        <div className="workspace-grid">
          <section className="scene">
            <div className="scene-top">
              <span className="eyebrow">RIN / 凛</span>
              <span className="scene-chip">{labels[phase] || phase}</span>
            </div>
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <span className="decor decor-one">✧</span>
            <span className="decor decor-two">＋</span>
            <div
              className={"character " + phase}
              style={{ "--mouth": mouth }}
              aria-label={"凛：" + (labels[phase] || phase)}
              onDoubleClick={() => setDialogue(!dialogue)}
              title="双击显示或收起对话；使用上方 ⠿ 拖动窗口"
            >
              {character &&
                Array.from({ length: 8 }, (_, index) => (
                  <div
                    key={index}
                    className={
                      "sprite " +
                      (character.states[phase] === index ? "visible" : "")
                    }
                    style={{
                      backgroundImage: `url(${character.sheet})`,
                      backgroundPosition: `${((index % 4) * 100) / 3}% ${Math.floor(index / 4) * 100}%`,
                    }}
                  />
                ))}
            </div>
            <div className="scene-caption">
              <span className="tiny-line" />
              <h2>
                凛 <small>RIN</small>
              </h2>
              <p>{character?.subtitle || "把想法，一起变成现实。"}</p>
              <div className="status-dots">
                <i />
                <i />
                <i />
              </div>
            </div>
            <div className="scene-foot">
              <span>
                ✦ {state.busy ? "正在陪你处理这件事" : "准备好迎接下一个想法"}
              </span>
              <span>01 — ∞</span>
            </div>
          </section>
          <section className="conversation">
            <div className="conversation-title">
              <span>我们的对话</span>
              <span className="muted">
                {thread ? "线程 " + thread.slice(0, 8) : "新的篇章"}
              </span>
            </div>
            <div className="messages" aria-live="polite">
              {historyCursor && (
                <button
                  disabled={loading}
                  onClick={() => run(() => history(thread, historyCursor))}
                >
                  加载更早的记录
                </button>
              )}
              {!transcript.length && (
                <div className="welcome">
                  <span className="eyebrow">LET’S MAKE SOMETHING.</span>
                  <h2>今天想做点什么？</h2>
                  <p>
                    把想法告诉我吧。我们可以从读懂一个项目开始，
                    <br />
                    也可以一起做出一个小小的新东西。
                  </p>
                  <div className="suggestions">
                    {[
                      "先帮我了解这个项目的结构",
                      "检查当前修改，找出潜在问题",
                      "帮我实现一个新功能",
                    ].map((s) => (
                      <button key={s} onClick={() => setText(s)}>
                        {s}
                        <span>↗</span>
                      </button>
                    ))}
                  </div>
                  <p className="hint">
                    这是一段欢迎语。连接后，回复和执行事件均来自真实 Codex。
                  </p>
                </div>
              )}
              {transcript.map((i) => (
                <article className={"message " + i.type} key={i.id}>
                  <div className="message-author">
                    {i.type === "userMessage" ? "你" : character?.name}
                    <small>
                      {i.type === "agentMessage" ? "CODEX · 原始回复" : ""}
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
                  {!connected ? "尚未连接 Codex" : "Codex 已连接，尚未选择项目"}
                </strong>
                <p>
                  选择项目目录后即可发送消息。当前默认只读，不会自动修改文件。
                </p>
                <button
                  disabled={loading || state.busy}
                  onClick={() => run(prepareConversation)}
                >
                  {loading
                    ? "正在准备……"
                    : !connected
                      ? "连接 Codex 并选择项目"
                      : "选择项目并开始对话"}
                </button>
              </div>
            )}
            <form className="composer" onSubmit={send}>
              <textarea
                aria-label="给凛的消息"
                placeholder={
                  !connected
                    ? "可以先输入想法，再点击上方连接按钮……"
                    : !workspace
                      ? "请先点击上方按钮选择项目目录……"
                      : "和凛说说你的想法……"
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
                    ? "任务执行中，可随时停止"
                    : "Enter 发送 · Shift + Enter 换行"}
                </span>
                {state.busy ? (
                  <button
                    type="button"
                    className="stop"
                    onClick={() => run(() => api.interrupt())}
                  >
                    ■ 停止
                  </button>
                ) : (
                  <button
                    className="send"
                    disabled={
                      !connected || !workspace || !text.trim() || loading
                    }
                  >
                    发送 ↗
                  </button>
                )}
              </div>
            </form>
            <div className="privacy">
              执行结果以右侧记录为准 · 不会自动批准权限请求
            </div>
          </section>
          <aside className="evidence">
            <div className="evidence-title">
              <span>工作记录</span>
              <span className="live">● LIVE</span>
            </div>
            <div className="tabs">
              {[
                ["activity", "进度"],
                ["diff", "Diff"],
                ["events", "事件"],
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
                        {state.busy ? "来自 Codex 事件" : "等待下一步"}
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
                      <p>让每一步都有迹可循</p>
                      <small>
                        工具调用、命令输出与代码改动
                        <br />
                        会在这里实时显示。
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
                            {i.status || "记录"}
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
                    "本轮尚未收到 diff。历史文件修改可在进度中的 fileChange 记录查看。"}
                </pre>
              )}
              {tab === "events" && (
                <>
                  <p className="muted">
                    最近 500 条原始协议事件；更多记录由 Codex 线程保存。
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
              <span>◇ 执行边界</span>
              <p>
                {mode === "read-only"
                  ? "当前为只读。"
                  : "Codex 可以修改选中的项目。"}
                <br />
                审批决定由你作出。失败会如实显示。
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
            aria-label="Codex 请求"
          >
            <span className="eyebrow">YOUR DECISION MATTERS</span>
            <h2>这一步，需要你的决定</h2>
            <p>凛会等你。以下是 Codex 发来的原始请求。</p>
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
                      {d === "accept" ? "仅批准这一次" : "拒绝"}
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
                    ? "提交回答"
                    : "拒绝 / 不授予权限"}
                </button>
              )}
              <button onClick={() => run(() => api.interrupt())}>
                停止任务
              </button>
            </div>
            <small>未知请求只会拒绝；本 MVP 不提供永久授权或自动批准。</small>
            {error && <p className="error">{error}</p>}
          </section>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
