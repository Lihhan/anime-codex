import React, { useEffect, useRef, useState } from "react";
import { ArcadeGame } from "./ArcadeGame";
import { createTranslator } from "../shared/i18n.mjs";
import { roster } from "../shared/play-catalog.mjs";
import {
  newGuess,
  nextQuestion,
  answerGuess,
  newMemory,
  flipCard,
} from "../shared/play-engine.mjs";
import { ImageCharacter } from "./ImageCharacter";
import "./play.css";
const api = window.animePlay;
export function GameApp() {
  const [data, setData] = useState({
    language: "zh",
    interface: { fontSize: 18 },
    status: {},
  });
  const [mode, setMode] = useState("guess"),
    [guess, setGuess] = useState(newGuess),
    [verdict, setVerdict] = useState(null);
  const [memory, setMemory] = useState(newMemory),
    [error, setError] = useState("");
  const t = createTranslator(data.language);
  const sessions = useRef({});
  const arcade = ["hop", "runner"].includes(mode);
  const name =
    data.character?.builtin === "rin" && data.character.name === "Rin"
      ? data.character.localizedNames?.[data.language] || "Rin"
      : data.character?.name || "Rin";
  useEffect(() => {
    document.body.classList.add("play-surface");
    const refresh = () =>
      api
        .bootstrap()
        .then(setData)
        .catch((e) => setError(e.message));
    refresh();
    const offRefresh = api.onRefresh(refresh),
      offStatus = api.onStatus((status) => setData((p) => ({ ...p, status })));
    return () => {
      offRefresh();
      offStatus();
      document.body.classList.remove("play-surface");
    };
  }, []);
  useEffect(() => {
    document.documentElement.lang = { zh: "zh-CN", en: "en", ja: "ja" }[
      data.language
    ];
    document.title = t("play.title") + " · Anime Codex";
  }, [data.language]);
  useEffect(() => {
    if (memory.open.length !== 2) return;
    const timer = setTimeout(() => setMemory((p) => ({ ...p, open: [] })), 850);
    return () => clearTimeout(timer);
  }, [memory.open]);
  const question = nextQuestion(guess),
    wonMemory = memory.matched.length === memory.cards.length;
  const candidate = roster.find((c) => c.id === guess.candidates[0]);
  const characterName = (c) => c.names[data.language] || c.names.en;
  const line =
    mode === "memory"
      ? t(
          wonMemory
            ? "play.memoryWon"
            : memory.open.length === 2
              ? "play.memoryMiss"
              : memory.matched.length
                ? "play.memoryMatch"
                : "play.memoryIntro",
        )
      : verdict
        ? t(verdict === "right" ? "play.guessWon" : "play.guessLost")
        : question
          ? t("play.q." + question)
          : guess.candidates.length === 1
            ? t("play.myGuess", { name: characterName(candidate) })
            : guess.candidates.length
              ? t("play.uncertain")
              : t("play.noCandidates");
  const emotion =
    verdict === "right" || wonMemory
      ? "success"
      : question
        ? "thinking"
        : "listening";
  function restart() {
    setGuess(newGuess());
    setVerdict(null);
    setMemory(newMemory());
  }
  return (
    <main
      className={"play-app" + (arcade ? " arcade-mode" : "")}
      style={{ "--chat-font-size": `${data.interface?.fontSize || 18}px` }}
    >
      <header className="play-header">
        <div>
          <p className="play-kicker">{t("play.with", { name })}</p>
          <h1>{t("play.title")}</h1>
        </div>
        <button
          data-testid="play-close"
          onClick={() => api.close()}
          aria-label={t("play.close")}
        >
          ×
        </button>
      </header>
      <div
        className={
          "play-work-status " + (data.status.approval ? "needs-approval" : "")
        }
        data-testid="play-work-status"
      >
        <span>
          {t(
            data.status.approval
              ? "play.approval"
              : data.status.working
                ? "play.working"
                : "play.ready",
          )}
        </span>
        <button onClick={() => api.showMain()}>{t("play.showMain")}</button>
      </div>
      {error && <p role="alert">{error}</p>}
      <nav className="play-tabs" aria-label={t("play.choose")}>
        {["hop", "runner"].map((kind) => (
          <button
            key={kind}
            data-testid={kind + "-tab"}
            aria-pressed={mode === kind}
            onClick={() => setMode(kind)}
          >
            {t("arcade." + kind + "Title")}
          </button>
        ))}
        <button
          data-testid="guess-tab"
          aria-pressed={mode === "guess"}
          onClick={() => setMode("guess")}
        >
          {t("play.guessTitle")}
        </button>
        <button
          data-testid="memory-tab"
          aria-pressed={mode === "memory"}
          onClick={() => setMode("memory")}
        >
          {t("play.memoryTitle")}
        </button>
      </nav>
      {arcade ? (
        <ArcadeGame
          key={mode}
          mode={mode}
          name={name}
          t={t}
          sessions={sessions}
          approval={data.status.approval}
        />
      ) : (
        <div className="play-content">
          <aside className="play-companion">
            <div className="play-avatar">
              {data.character && (
                <ImageCharacter
                  character={data.character}
                  phase={emotion}
                  name={name}
                  t={t}
                />
              )}
            </div>
            <strong>{name}</strong>
            <p>{t("play.greeting", { name })}</p>
          </aside>
          <section
            className="play-game"
            aria-label={t(
              mode === "guess" ? "play.guessTitle" : "play.memoryTitle",
            )}
          >
            <div
              className="play-speech"
              aria-live="polite"
              data-testid="play-speech"
              data-question={question || ""}
              key={`${mode}-${guess.asked.length}-${verdict}-${memory.moves}`}
            >
              <span>{name}</span>
              <p>{line}</p>
            </div>
            {mode === "guess" ? (
              <>
                <p className="play-counter">
                  {t("play.guessCounter", {
                    count: guess.asked.length,
                    remaining: guess.candidates.length,
                  })}
                </p>
                {question && !verdict && (
                  <div className="play-answers">
                    {["yes", "no", "unknown"].map((a) => (
                      <button
                        key={a}
                        data-testid={"answer-" + a}
                        onClick={() =>
                          setGuess((p) => answerGuess(p, question, a))
                        }
                      >
                        {t("play." + a)}
                      </button>
                    ))}
                  </div>
                )}
                {!question && !verdict && guess.candidates.length === 1 && (
                  <div className="play-answers">
                    <button
                      data-testid="guess-correct"
                      onClick={() => setVerdict("right")}
                    >
                      {t("play.correct")}
                    </button>
                    <button onClick={() => setVerdict("wrong")}>
                      {t("play.wrong")}
                    </button>
                  </div>
                )}
                {!question && !verdict && guess.candidates.length > 1 && (
                  <div className="play-answers">
                    {guess.candidates.map((id) => (
                      <button key={id} onClick={() => setVerdict("right")}>
                        {characterName(roster.find((c) => c.id === id))}
                      </button>
                    ))}
                    <button onClick={() => setVerdict("wrong")}>
                      {t("play.none")}
                    </button>
                  </div>
                )}
                <details className="play-roster">
                  <summary>
                    {t("play.roster", { count: roster.length })}
                  </summary>
                  <p>{t("play.rosterHint")}</p>
                  <p>{roster.map(characterName).join(" · ")}</p>
                </details>
                {!!guess.history.length && (
                  <details>
                    <summary>{t("play.history")}</summary>
                    <ol>
                      {guess.history.map((h) => (
                        <li key={h.id}>
                          {t("play.q." + h.id)} — {t("play." + h.answer)}
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
              </>
            ) : (
              <>
                <p className="play-counter">
                  {t("play.memoryCounter", {
                    moves: memory.moves,
                    pairs: memory.matched.length / 2,
                  })}
                </p>
                <div className="memory-grid">
                  {memory.cards.map((card, index) => {
                    const visible =
                      memory.open.includes(card.id) ||
                      memory.matched.includes(card.id);
                    return (
                      <button
                        key={card.id}
                        data-testid={"memory-card-" + card.id}
                        className={
                          "memory-card " +
                          (visible ? "flipped " : "") +
                          (memory.matched.includes(card.id) ? "matched" : "")
                        }
                        aria-label={
                          visible
                            ? card.symbol
                            : t("play.card", { number: index + 1 })
                        }
                        disabled={
                          memory.matched.includes(card.id) ||
                          (memory.open.length === 2 && !visible)
                        }
                        onClick={() => setMemory((p) => flipCard(p, card.id))}
                      >
                        {visible ? card.symbol : "✦"}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            <button
              className="play-restart"
              data-testid="play-restart"
              onClick={restart}
            >
              {t("play.restart")}
            </button>
          </section>
        </div>
      )}
      <footer className="play-footer">{t("play.localNote")}</footer>
    </main>
  );
}
