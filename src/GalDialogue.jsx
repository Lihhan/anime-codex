import React, { useEffect, useMemo, useState } from "react";
import { dialoguePages, glyphs } from "../shared/dialogue.mjs";
import "./gal-dialogue.css";
export function GalDialogue({
  t,
  name,
  reply,
  busy,
  phase,
  pending,
  error,
  connected,
  workspace,
  loading,
  text,
  setText,
  onSend,
  onPrepare,
  onStop,
  onHistory,
  onHide,
}) {
  const [page, setPage] = useState(0),
    [visible, setVisible] = useState(0);
  const source =
    reply?.text ||
    (!busy && !pending && !error && phase === "idle"
      ? t("gal.greeting", { name })
      : "");
  const pages = useMemo(() => dialoguePages(source), [source]),
    index = Math.min(page, pages.length - 1),
    line = pages[index];
  const characters = useMemo(() => glyphs(line), [line]);
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const q = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(q.matches);
    q.addEventListener("change", change);
    return () => q.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    setPage(0);
    setVisible(0);
  }, [reply?.id, busy && !reply, pending]);
  useEffect(() => {
    setVisible(0);
  }, [index]);
  useEffect(() => {
    if (reduced) {
      setVisible(characters.length);
      return;
    }
    const timer = setInterval(
      () =>
        setVisible((n) => {
          const next = Math.min(characters.length, n + 3);
          if (next >= characters.length) clearInterval(timer);
          return next;
        }),
      35,
    );
    return () => clearInterval(timer);
  }, [characters.length, line, reduced]);
  const complete = visible >= characters.length,
    ready = connected && workspace && !busy && !pending && !loading;
  function advance() {
    if (!complete) setVisible(characters.length);
    else if (index < pages.length - 1) {
      setPage(index + 1);
      setVisible(0);
    }
  }
  function submit(event) {
    event.preventDefault();
    if (text.trim() && ready) onSend(text);
  }
  return (
    <div
      className="gal-dialogue"
      data-testid="gal-dialogue"
      data-page={index}
      data-pages={pages.length}
      data-reply-id={reply?.id || "local"}
    >
      <div className="gal-nameplate">
        <strong>{name}</strong>
        <span className={busy ? "working" : "gal-mood"}>
          {t("state." + phase)}
        </span>
        <div className="gal-window-actions">
          <button data-testid="gal-history" onClick={onHistory}>
            {t("gal.history")}
          </button>
          <button onClick={onHide} aria-label={t("Hide chat")}>
            ×
          </button>
        </div>
      </div>
      {source && (
        <button
          type="button"
          className="gal-line"
          data-testid="gal-line"
          onClick={advance}
          aria-label={t(complete ? "gal.advance" : "gal.reveal")}
        >
          <span>{characters.slice(0, visible).join("")}</span>
          <span className="gal-cursor" aria-hidden="true">
            {complete ? "▾" : "▌"}
          </span>
        </button>
      )}
      <form className="gal-composer" onSubmit={submit}>
        <label className="sr-only" htmlFor="gal-input">
          {t("Message for {name}", { name })}
        </label>
        <textarea
          id="gal-input"
          data-testid="gal-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("gal.placeholder", { name })}
          disabled={busy || !!pending}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              if (ready && text.trim()) onSend(text);
            }
          }}
        />
        <div>
          <small>{t("Enter to send · Shift + Enter for a new line")}</small>
          <button data-testid="gal-send" disabled={!ready || !text.trim()}>
            {t("gal.send")}
          </button>
        </div>
      </form>
      <div className="gal-reading">
        <small>
          {source
            ? reply
              ? t(busy ? "gal.streaming" : "gal.original")
              : t("gal.localWelcome")
            : t("state." + phase)}
        </small>
        <div>
          <button
            disabled={index === 0}
            onClick={() => {
              setPage(index - 1);
              setVisible(0);
            }}
            aria-label={t("gal.previous")}
          >
            ‹
          </button>
          <span>
            {index + 1} / {pages.length}
          </span>
          <button
            data-testid="gal-next"
            disabled={index >= pages.length - 1 && complete}
            onClick={advance}
          >
            {t(complete ? "gal.next" : "gal.reveal")}
          </button>
        </div>
      </div>
      {(!connected || !workspace) && (
        <div className="gal-setup">
          <span>{t("gal.connectHint")}</span>
          <button
            data-testid="gal-connect"
            disabled={busy || loading}
            onClick={onPrepare}
          >
            {t(loading ? "Getting ready…" : "gal.connect")}
          </button>
        </div>
      )}
      {busy && (
        <div className="gal-task">
          <span>{t(pending ? "gal.waitApproval" : "gal.taskContinues")}</span>
          <button data-testid="gal-stop" onClick={onStop}>
            {t("■ Stop")}
          </button>
        </div>
      )}

      {error && (
        <p className="gal-error" role="alert">
          {error.message || String(error)}
        </p>
      )}
    </div>
  );
}
