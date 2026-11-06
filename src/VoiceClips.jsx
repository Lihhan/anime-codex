import React, { useEffect, useRef, useState } from "react";
import actions from "../shared/voice-actions.json";
import { ClipPlayer } from "../shared/clip-player.mjs";
export function useVoiceClips({ api, character, state, activity, onError }) {
  const [playing, setPlaying] = useState(null),
    player = useRef(null),
    context = useRef({}),
    error = useRef(onError);
  error.current = onError;
  if (!player.current)
    player.current = new ClipPlayer({
      source: (args) => api.voiceClipSource(args),
      createAudio: (src) => new Audio(src),
      onError: (message) => error.current(message),
      onStatus: setPlaying,
    });
  const id = state?.characterId,
    settings = state?.settings || {};
  useEffect(() => {
    const same = id && id === character?.id;
    player.current.configure({
      id: same ? id : null,
      enabled: !!settings.voice,
      quiet: !!settings.quiet,
      volume: settings.voiceVolume ?? 0.75,
      clips: state?.audio || {},
    });
    if (same && context.current.id !== id) {
      context.current = {
        id,
        activity,
        reply: state.messages
          .filter((m) => m.role === "assistant" && !m.taskId && !m.summaryOf)
          .at(-1)?.id,
        tasks: new Map((state.tasks || []).map((t) => [t.id, t.status])),
      };
      void player.current.play("greeting", { key: "greeting:" + id });
    }
  }, [
    id,
    character?.id,
    settings.voice,
    settings.quiet,
    settings.voiceVolume,
    state?.audio,
  ]);
  useEffect(() => {
    if (!id || context.current.id !== id || id !== character?.id) return;
    const previous = context.current.activity;
    context.current.activity = activity;
    if (previous === activity) return;
    const local = {
      idle: "idle",
      pet: "touch",
      read: "book",
      office: "office",
      gaming: "gaming",
      play: "gaming",
      meal: "meal",
      eat: "meal",
      sleep: "sleep",
      walk: "walk",
    }[activity];
    if (local) void player.current.play(local);
  }, [activity, id, character?.id]);
  useEffect(() => {
    if (!id || context.current.id !== id || id !== character?.id) return;
    const latest = state.messages
      .filter((m) => m.role === "assistant" && !m.taskId && !m.summaryOf)
      .at(-1);
    if (latest && context.current.reply !== latest.id) {
      context.current.reply = latest.id;
      void player.current.play("reply", { key: "reply:" + latest.id });
    }
    if (state.busy)
      void player.current.play("thinking", {
        key:
          "thinking:" +
          (state.messages.filter((m) => m.role === "user").at(-1)?.id ||
            "current"),
      });
    const ownTasks = (state.tasks || []).filter((t) => t.characterId === id);
    for (const task of ownTasks) {
      const old = context.current.tasks.get(task.id);
      context.current.tasks.set(task.id, task.status);
      if (
        task.status !== old &&
        ["completed", "failed", "interrupted"].includes(task.status)
      ) {
        const action =
          task.status === "completed"
            ? task.verification === "failed"
              ? "failure"
              : "success"
            : task.status === "failed"
              ? "failure"
              : "interrupted";
        void player.current.play(action, {
          key: task.id + ":" + task.status + ":" + task.verification,
        });
      }
    }
    const waiting = ownTasks.find((t) => t.status === "waiting"),
      running = ownTasks.find((t) => t.status === "running");
    if (waiting)
      void player.current.play("approval", {
        key:
          waiting.id +
          ":approval:" +
          JSON.stringify(waiting.requests?.map((r) => r.id) || []),
      });
    else if (running) {
      const action = ["commandExecution", "fileChange"].includes(
        running.currentActivity,
      )
        ? "coding"
        : ["webSearch", "mcpToolCall"].includes(running.currentActivity)
          ? "reading"
          : "thinking";
      void player.current.play(action, { key: running.id + ":" + action });
    }
  }, [
    state?.messages?.at(-1)?.id,
    state?.busy,
    JSON.stringify(
      state?.tasks?.map((t) => [
        t.id,
        t.status,
        t.currentActivity,
        t.verification,
        t.requests?.map((r) => r.id),
      ]),
    ),
    id,
    character?.id,
  ]);
  useEffect(() => {
    const off = api.onEvent((e) => {
      if (e.method === "client/voiceStop") player.current.suspend();
      if (e.method === "client/voiceResume") player.current.resume();
    });
    return () => {
      off();
      player.current.stop();
    };
  }, []);
  return {
    playing,
    stop: () => player.current.stop(),
    preview: (action) => player.current.play(action, { preview: true }),
    event: (action) => player.current.play(action),
  };
}
export function probeAudio(src) {
  return new Promise((resolve, reject) => {
    const audio = new Audio(),
      timer = setTimeout(
        () => finish(Error("音频读取超时，请更换文件。")),
        10000,
      );
    function finish(error) {
      clearTimeout(timer);
      const duration = audio.duration;
      audio.onloadedmetadata = null;
      audio.onerror = null;
      audio.removeAttribute("src");
      audio.load();
      error ? reject(error) : resolve(duration);
    }
    audio.preload = "metadata";
    audio.onloadedmetadata = () =>
      finish(
        !Number.isFinite(audio.duration) ||
          audio.duration <= 0 ||
          audio.duration > 45
          ? Error("请使用 45 秒以内、可正常播放的音频。")
          : null,
      );
    audio.onerror = () =>
      finish(Error("本机无法解码这个音频，请使用 WAV、MP3 或 OGG。"));
    audio.src = src;
  });
}
export function VoiceClipSettings({
  api,
  character,
  state,
  run,
  refresh,
  audio,
}) {
  const [busy, setBusy] = useState(false);
  const upload = (action) =>
    run(async () => {
      setBusy(true);
      audio.stop();
      try {
        const staged = await api.chooseVoiceClip({ id: character.id, action });
        if (!staged) return;
        const duration = await probeAudio(staged.src);
        await api.commitVoiceClip({ token: staged.token, duration });
        await refresh();
      } finally {
        setBusy(false);
      }
    });
  return (
    <section
      className="companion-card voice-clip-settings"
      data-testid="voice-clip-settings"
    >
      <h3>自己的动作语音包</h3>
      <p>
        上传预录音频后，打开“播放我上传的动作语音”，即可在对应动作发生时播放。每个角色独立保存；缺少音频的动作保持安静。文字回复继续显示在气泡里。
      </p>
      <small>
        支持 WAV / MP3 / OGG / FLAC / M4A（以本机解码能力为准），每段最多 45
        秒、8 MB。文件仅保存在本机。
      </small>
      {state.audioWarning && <p role="alert">{state.audioWarning}</p>}
      {Object.entries(actions).map(([action, label]) => {
        const clip = state.audio?.[action];
        return (
          <div
            key={action}
            className="voice-clip-row"
            data-testid={"voice-slot-" + action}
          >
            <div>
              <strong>{label}</strong>
              <small>
                {clip
                  ? `${clip.name} · ${clip.duration.toFixed(1)} 秒`
                  : "尚未上传"}
              </small>
            </div>
            <div className="inline-fields">
              <button disabled={busy} onClick={() => upload(action)}>
                {clip ? "替换" : "上传"}
              </button>
              <button
                disabled={
                  busy ||
                  !clip ||
                  state.settings.quiet ||
                  state.settings.voiceVolume === 0
                }
                onClick={() => audio.preview(action)}
              >
                {audio.playing === action ? "播放中…" : "试听"}
              </button>
              <button
                disabled={busy || !clip}
                onClick={() =>
                  run(async () => {
                    audio.stop();
                    await api.removeVoiceClip({ id: character.id, action });
                    await refresh();
                  })
                }
              >
                删除
              </button>
            </div>
          </div>
        );
      })}
      <button onClick={audio.stop}>停止播放</button>
      <small>
        不会合成新语音，也不会上传到语音服务。自动播放有间隔限制，不会叠加多段声音。
      </small>
    </section>
  );
}
