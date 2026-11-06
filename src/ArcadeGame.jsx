import React, { useEffect, useRef, useState } from "react";
import {
  WORLD,
  newHop,
  newRunner,
  beginHop,
  releaseHop,
  cancelHop,
  runnerJump,
  runnerDuck,
  pauseArcade,
  isArcadeMoving,
  advanceArcade,
} from "../shared/arcade-engine.mjs";
import { drawArcade } from "./arcade-draw.mjs";
import sprite from "../shared/arcade-sprite.json";
import "./arcade.css";
const bestKey = (mode) => `anime-codex.arcade.${mode}.best`;
function readBest(mode) {
  try {
    const n = Number(localStorage.getItem(bestKey(mode)));
    return Number.isFinite(n) && n >= 0 && n <= 1e8 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}
export function ArcadeGame({ mode, name, t, sessions, approval }) {
  const [initialBest] = useState(() => readBest(mode));
  const canvas = useRef(null),
    simulation = useRef(
      sessions.current[mode] || (mode === "hop" ? newHop() : newRunner()),
    );
  const images = useRef({}),
    frame = useRef(null),
    last = useRef(0),
    lastHud = useRef(0),
    best = useRef(initialBest),
    savedBest = useRef(best.current),
    active = useRef(true),
    paint = useRef(() => {});
  const [hud, setHud] = useState({ ...simulation.current, best: best.current }),
    [spriteReady, setSpriteReady] = useState(false);
  const reduced = useRef(
    globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
      false,
  );
  function persist() {
    if (best.current <= savedBest.current) return;
    try {
      localStorage.setItem(bestKey(mode), String(best.current));
      savedBest.current = best.current;
    } catch {
      /* Scores are optional local data. */
    }
  }
  function publish() {
    const s = simulation.current;
    best.current = Math.max(best.current, s.score);
    setHud({ ...s, best: best.current });
    if (
      s.status === "over" ||
      (s.kind === "hop" && s.status === "ready" && s.score > 0)
    )
      persist();
  }
  function pause() {
    simulation.current = pauseArcade(simulation.current);
    last.current = 0;
    persist();
    publish();
    paint.current();
  }
  function change(action) {
    simulation.current = action(simulation.current);
    last.current = 0;
    publish();
    paint.current();
  }
  function restart() {
    change(() => {
      const fresh =
        mode === "hop" ? newHop(Date.now() >>> 0) : newRunner(Date.now() >>> 0);
      return approval ? pauseArcade(fresh) : fresh;
    });
    canvas.current?.focus();
  }
  useEffect(() => {
    active.current = true;
    const el = canvas.current;
    el.width = WORLD.width / 2;
    el.height = WORLD.height / 2;
    const ctx = el.getContext("2d");
    ctx.setTransform(0.5, 0, 0, 0.5, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const draw = () =>
      drawArcade(ctx, simulation.current, images.current, {
        reduced: reduced.current,
      });
    const tick = (now) => {
      frame.current = null;
      if (!active.current) return;
      const dt = last.current ? Math.min(0.25, (now - last.current) / 1000) : 0;
      last.current = now;
      if (isArcadeMoving(simulation.current))
        simulation.current = advanceArcade(simulation.current, dt);
      draw();
      if (now - lastHud.current > 80 || !isArcadeMoving(simulation.current)) {
        publish();
        lastHud.current = now;
      }
      if (isArcadeMoving(simulation.current))
        frame.current = requestAnimationFrame(tick);
      else last.current = 0;
    };
    paint.current = () => {
      if (!active.current) return;
      draw();
      if (isArcadeMoving(simulation.current) && frame.current === null)
        frame.current = requestAnimationFrame(tick);
    };
    const hidden = () => {
      if (document.hidden) pause();
    };
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", hidden);
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      reduced.current = motion.matches;
      paint.current();
    };
    motion.addEventListener("change", update);
    paint.current();
    return () => {
      active.current = false;
      cancelAnimationFrame(frame.current);
      frame.current = null;
      simulation.current = pauseArcade(simulation.current);
      sessions.current[mode] = simulation.current;
      best.current = Math.max(best.current, simulation.current.score);
      persist();
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", hidden);
      motion.removeEventListener("change", update);
    };
  }, []);
  useEffect(() => {
    let live = true;
    images.current = {};
    setSpriteReady(false);
    const image = new Image();
    image.onload = () => {
      if (live) {
        images.current = { sheet: image };
        setSpriteReady(true);
        paint.current();
      }
    };
    image.onerror = () => {
      if (live) paint.current();
    };
    image.src = sprite.sheet;
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (approval) pause();
  }, [approval]);
  const begin = () => {
    if (!approval)
      change((s) => (mode === "hop" ? beginHop(s) : runnerJump(s)));
  };
  const release = () => {
    if (mode === "hop") change(releaseHop);
  };
  const cancel = () =>
    change((s) => (mode === "hop" ? cancelHop(s) : runnerDuck(s, false)));
  function pointerDown(event) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus();
    begin();
  }
  function keyDown(event) {
    if (
      ![" ", "Enter", "ArrowUp", "ArrowDown", "p", "P", "r", "R"].includes(
        event.key,
      )
    )
      return;
    event.preventDefault();
    if (event.repeat) return;
    if (approval) return;
    if (["p", "P"].includes(event.key)) {
      change((s) => pauseArcade(s, !s.paused));
      return;
    }
    if (["r", "R"].includes(event.key)) {
      restart();
      return;
    }
    if (event.key === "ArrowDown") {
      if (mode === "runner") change((s) => runnerDuck(s, true));
      return;
    }
    begin();
  }
  function keyUp(event) {
    if ([" ", "Enter", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      release();
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      change((s) => runnerDuck(s, false));
    }
  }
  const bind = {
    onPointerDown: pointerDown,
    onPointerUp: release,
    onPointerCancel: cancel,
    onLostPointerCapture: cancel,
    onKeyDown: keyDown,
    onKeyUp: keyUp,
  };
  const message =
    hud.status === "over"
      ? "arcade.overLine"
      : hud.paused
        ? "arcade.pausedLine"
        : mode === "runner"
          ? "arcade.runnerLine"
          : hud.flash === "perfect"
            ? "arcade.perfectLine"
            : hud.flash === "landed"
              ? "arcade.landedLine"
              : "arcade.hopLine";
  return (
    <section
      className="arcade-game"
      data-testid="arcade-game"
      data-mode={mode}
      data-status={hud.status}
      data-paused={String(hud.paused)}
      data-score={hud.score}
      data-best={hud.best}
      data-airborne={String(
        hud.y < (mode === "runner" ? WORLD.ground : hud.current?.y) - 2,
      )}
      data-sprite-ready={String(spriteReady)}
      data-sprite-source="beagle"
      data-art-style="pixel"
    >
      <div className="arcade-hud">
        <strong>{t("arcade.score", { score: hud.score })}</strong>
        <span>{t("arcade.best", { score: hud.best })}</span>
        {mode === "hop" ? (
          <span>{t("arcade.combo", { count: hud.streak })}</span>
        ) : (
          <span>{t("arcade.speed", { speed: Math.round(hud.speed) })}</span>
        )}
      </div>
      <div className="arcade-board">
        <canvas
          ref={canvas}
          tabIndex={0}
          data-testid="arcade-canvas"
          aria-label={t(
            mode === "hop" ? "arcade.hopControls" : "arcade.runnerControls",
            { name },
          )}
          {...bind}
        >
          {t("arcade.canvasFallback")}
        </canvas>
        {(hud.paused || hud.status === "over") && (
          <div className="arcade-overlay">
            <strong>
              {t(hud.status === "over" ? "arcade.over" : "arcade.paused")}
            </strong>
            {hud.status !== "over" && (
              <button
                data-testid="arcade-resume"
                disabled={approval}
                onClick={() => {
                  change((s) => pauseArcade(s, false));
                  canvas.current?.focus();
                }}
              >
                {t("arcade.resume")}
              </button>
            )}
            {hud.status === "over" && (
              <button data-testid="arcade-retry" onClick={restart}>
                {t("arcade.restart")}
              </button>
            )}
            {approval && <small>{t("arcade.approval")}</small>}
          </div>
        )}
      </div>
      <div className="arcade-controls">
        <button
          data-testid="arcade-action"
          className="arcade-primary"
          disabled={hud.paused || hud.status === "over"}
          {...bind}
        >
          {t(mode === "hop" ? "arcade.hold" : "arcade.jump")}
        </button>
        {mode === "runner" && (
          <button
            data-testid="arcade-duck"
            disabled={hud.paused || hud.status === "over"}
            onPointerDown={(event) => {
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              change((s) => runnerDuck(s, true));
            }}
            onPointerUp={() => change((s) => runnerDuck(s, false))}
            onPointerCancel={() => change((s) => runnerDuck(s, false))}
            onLostPointerCapture={() => change((s) => runnerDuck(s, false))}
            onKeyDown={(event) => {
              if ([" ", "Enter"].includes(event.key)) {
                event.preventDefault();
                change((s) => runnerDuck(s, true));
              }
            }}
            onKeyUp={() => change((s) => runnerDuck(s, false))}
          >
            {t("arcade.duck")}
          </button>
        )}
        <button
          data-testid="arcade-pause"
          disabled={hud.status === "over" || approval}
          onClick={() => {
            change((s) => pauseArcade(s, !s.paused));
            canvas.current?.focus();
          }}
        >
          {t(hud.paused ? "arcade.resume" : "arcade.pause")}
        </button>
        <button data-testid="arcade-restart" onClick={restart}>
          {t("arcade.restart")}
        </button>
      </div>
      <p className="arcade-line" aria-live="polite">
        {name} · {t(message)}
      </p>
      <p className="arcade-hint">
        {t(mode === "hop" ? "arcade.hopHint" : "arcade.runnerHint")}
      </p>
    </section>
  );
}
