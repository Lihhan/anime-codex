import React, { useEffect, useState } from "react";
export function ModelSettings({ api, value, connected, busy, onSave }) {
  const [models, setModels] = useState([]),
    [draft, setDraft] = useState(value),
    [error, setError] = useState("");
  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    let live = true;
    if (connected)
      api
        .listModels()
        .then((x) => {
          if (live) setModels(x);
        })
        .catch((e) => {
          if (live) setError(e.message);
        });
    return () => {
      live = false;
    };
  }, [connected]);
  const selected = models.find((m) => m.model === draft.model);
  return (
    <section className="model-settings">
      <div className="section-kicker">LOCAL AGENT</div>
      <h2>模型与思考强度</h2>
      <p>仅用于此应用的新建或恢复会话。终端与其他客户端的配置保持不变。</p>
      <div className="field-pair">
        <label>
          编程模型
          <select
            data-testid="codex-model"
            disabled={busy || !connected}
            value={draft.model}
            onChange={(e) => setDraft({ model: e.target.value, effort: "" })}
          >
            <option value="">继承本机配置</option>
            {models.map((m) => (
              <option key={m.id} value={m.model}>
                {m.displayName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Reasoning effort
          <select
            data-testid="codex-effort"
            disabled={busy || !selected}
            value={draft.effort}
            onChange={(e) => setDraft({ ...draft, effort: e.target.value })}
          >
            <option value="">继承本机配置</option>
            {selected?.supportedReasoningEfforts.map((e) => (
              <option key={e.reasoningEffort} value={e.reasoningEffort}>
                {e.reasoningEffort}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!connected && <p>连接 Codex 后加载当前账号可用的模型。</p>}
      {selected && <small>{selected.description}</small>}
      <button
        data-testid="save-codex-model"
        disabled={busy || !connected}
        onClick={async () => {
          setError("");
          try {
            await onSave(draft);
            setError("已保存，下一条消息使用新会话。");
          } catch (e) {
            setError(e.message);
          }
        }}
      >
        保存模型设置
      </button>
      <p role="status">{error}</p>
    </section>
  );
}
