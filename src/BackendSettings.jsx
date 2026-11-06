import React, { useEffect, useState } from "react";
import "./backend-settings.css";
const copy = {
  zh: {
    backend: "编程后端",
    inherited:
      "Claude Code 继承本机用户与项目配置。应用不覆盖权限模式、代理、网络端点或时区；需要决定的操作仍由你批准。新会话不继承其他终端会话的临时授权。",
    translation: "独立翻译 · Codex 订阅",
    enable: "输入润色为英文；回复译为当前界面语言",
    description:
      "使用本机已登录的 Codex，消耗 Codex 额度。Claude Code 只接收处理后的提示词，不负责翻译。原文、发送文本和译文保存在本机会话记录中。",
    model: "翻译模型（留空使用 Codex 默认模型）",
    save: "保存翻译设置",
    test: "测试双向翻译",
    saved: "已保存；下一条消息将创建新会话。",
    pending: "正在测试…",
    caption:
      "只翻译自然语言回复；工具输出与权限请求保留原文。输入翻译失败时不发送任务，回复翻译失败时显示原文并标明错误。",
  },
  en: {
    backend: "Programming backend",
    inherited:
      "Claude Code inherits local user and project configuration. This app does not override permission mode, proxies, endpoints or timezone. You still answer approval requests. A new session does not inherit another terminal session's temporary grants.",
    translation: "Independent translation · Codex subscription",
    enable:
      "Polish prompts into English; translate replies into the interface language",
    description:
      "Uses your locally signed-in Codex and its usage allowance. Claude Code receives the processed prompt and does not translate. Original text, sent prompts and translations are saved in local conversation history.",
    model: "Translation model (blank uses the Codex default)",
    save: "Save translation settings",
    test: "Test both directions",
    saved: "Saved; the next message will start a new conversation.",
    pending: "Testing…",
    caption:
      "Only natural-language replies are translated. Tool output and permission requests stay verbatim. Input translation failure prevents sending; reply translation failure preserves the original with an error label.",
  },
  ja: {
    backend: "コーディングバックエンド",
    inherited:
      "Claude Code のローカル設定とプロジェクト設定を継承します。権限モード、プロキシ、接続先、タイムゾーンは上書きしません。必要な承認には引き続き回答します。別のターミナルセッションの一時的な許可は引き継ぎません。",
    translation: "独立した翻訳 · Codex サブスクリプション",
    enable: "入力を英語に翻訳・推敲し、返信を選択中の表示言語に翻訳",
    description:
      "ローカルでログイン済みの Codex とその利用枠を使います。Claude Code は翻訳しません。原文、送信文と訳文はローカルの会話履歴に保存されます。",
    model: "翻訳モデル（空欄は Codex の既定値）",
    save: "翻訳設定を保存",
    test: "双方向翻訳をテスト",
    saved: "保存しました。次のメッセージで新しい会話を開始します。",
    pending: "テスト中…",
    caption:
      "自然言語の返信のみ翻訳します。ツール出力と権限要求は原文を維持します。入力翻訳が失敗した場合は送信せず、返信翻訳の失敗時は原文とエラーを表示します。",
  },
};
export function BackendSettings({
  language,
  provider,
  translation,
  busy,
  onProvider,
  onSave,
  onTest,
}) {
  const c = copy[language] || copy.en;
  const [draft, setDraft] = useState(translation),
    [message, setMessage] = useState(""),
    [testing, setTesting] = useState(false);
  useEffect(() => setDraft(translation), [translation]);
  return (
    <section className="backend-settings" data-testid="backend-settings">
      <label>
        {c.backend}
        <select
          data-testid="backend-select"
          value={provider}
          disabled={busy || testing}
          onChange={(e) => {
            setMessage("");
            onProvider(e.target.value);
          }}
        >
          <option value="codex">Codex</option>
          <option value="claude">Claude Code</option>
        </select>
      </label>
      {provider === "claude" && (
        <>
          <p>{c.inherited}</p>
          <h2>{c.translation}</h2>
          <label className="checkbox-label">
            <input
              type="checkbox"
              data-testid="translation-enabled"
              checked={draft.enabled}
              disabled={busy || testing}
              onChange={(e) =>
                setDraft({ ...draft, enabled: e.target.checked })
              }
            />
            {c.enable}
          </label>
          <p>{c.description}</p>
          <label>
            {c.model}
            <input
              data-testid="translation-model"
              value={draft.model || ""}
              disabled={busy || testing}
              onChange={(e) => setDraft({ ...draft, model: e.target.value })}
            />
          </label>
          <div className="backend-buttons">
            <button
              data-testid="translation-save"
              disabled={busy || testing}
              onClick={async () => {
                const saved = await onSave(draft);
                if (saved) setMessage(c.saved);
              }}
            >
              {c.save}
            </button>
            <button
              data-testid="translation-test"
              disabled={busy || testing || !translation.enabled}
              onClick={async () => {
                setTesting(true);
                setMessage(c.pending);
                try {
                  const result = await onTest();
                  setMessage(
                    result ? `${result.english}\n\n${result.chinese}` : "",
                  );
                } finally {
                  setTesting(false);
                }
              }}
            >
              {c.test}
            </button>
          </div>
          <p>{c.caption}</p>
          {message && <pre role="status">{message}</pre>}
        </>
      )}
    </section>
  );
}
