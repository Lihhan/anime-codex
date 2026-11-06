import React, { useEffect, useRef, useState } from "react";
import { transitionPlan, transitionDurations } from "../shared/pet-transitions.mjs";
export function PetSprite({
  activity: requestedActivity,
  name,
  pack,
  facing = "right",
  onTransition,
}) {
  const [activity, setActivity] = useState(requestedActivity);
  const requested = useRef(requestedActivity), inTransition = useRef(false);
  requested.current = requestedActivity;
  useEffect(() => {
    // Finish the current physical movement, then route to the latest request.
    // Picking up the pet must remain immediate and interrupts any activity.
    if (!inTransition.current || requestedActivity === "drag" || activity === "drag")
      setActivity(requestedActivity);
  }, [requestedActivity, activity]);
  const keyFor = (action) => (action === "walk" ? `walk_${facing}` : action);
  const resolve = (key) => pack.clips[key] || (key === "drag" ? pack.clips.attention : null) || pack.clips.idle;
  useEffect(() => {
    // Decode sheets before the first activity switch, avoiding an empty frame.
    for (const src of new Set(
      Object.values(pack.clips).map((clip) => clip.src || pack.src),
    )) {
      if (src) {
        const image = new Image();
        image.src = src;
        void image.decode().catch(() => {});
      }
    }
  }, [pack]);
  const [view, setView] = useState({
    key: keyFor(activity),
    frame: 0,
    stage: "loop",
  });
  const previous = useRef({ activity, pack }),
    shown = useRef(view),
    callback = useRef(onTransition);
  shown.current = view;
  callback.current = onTransition;
  useEffect(() => {
    let timer,
      cancelled = false;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const old = previous.current;
    previous.current = { activity, pack };
    const target = keyFor(activity);
    const stages = [];
    if (old.pack === pack && old.activity !== activity && old.activity !== "drag" && activity !== "drag" && !reduced) {
      for (const step of transitionPlan(pack.clips, old.activity, activity))
        stages.push({...step,durations:transitionDurations(resolve(step.key).durations)});
    }
    inTransition.current = stages.length > 0;
    callback.current?.(stages.length > 0);
    function loop(index = 0, cycles = 0) {
      if (cancelled) return;
      setView({ key: target, frame: index, stage: "loop" });
      if (reduced) return;
      const clip = resolve(target),
        next = (index + 1) % clip.durations.length;
      timer = setTimeout(() => {
        if (
          next === 0 &&
          ["pet", "attention"].includes(activity) &&
          cycles >= 0
        )
          return;
        loop(next, cycles + (next === 0 ? 1 : 0));
      }, clip.durations[index]);
    }
    function stage(n = 0, index = 0) {
      if (cancelled) return;
      const step = stages[n];
      if (!step) {
        inTransition.current = false;
        if (requested.current !== activity) {
          setActivity(requested.current);
          return;
        }
        callback.current?.(false);
        loop();
        return;
      }
      setView({ key: step.key, frame: step.frame ?? index, stage: step.stage });
      timer = setTimeout(
        () =>
          index + 1 < step.durations.length
            ? stage(n, index + 1)
            : stage(n + 1),
        step.durations[index],
      );
    }
    stage();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      inTransition.current = false;
    };
  }, [activity, facing, pack]);
  useEffect(() => () => callback.current?.(false), []);
  const clip = resolve(view.key),
    frame = Math.min(view.frame, clip.durations.length - 1);
  const cell = clip.frames?.[frame] ?? frame,
    aspect = clip.aspect || pack.aspect || 1,
    crop = clip.cropY,
    columns = clip.columns || pack.columns,
    rows = clip.rows || pack.rows;
  const backgroundHeight = crop
    ? (crop.sheetHeight / crop.height) * 100
    : rows * 100;
  const backgroundY = crop
    ? (crop.top / (crop.sheetHeight - crop.height)) * 100
    : rows === 1 ? 0 : ((clip.row + Math.floor(cell / columns)) * 100) / (rows - 1);
  return (
    <div
      role="img"
      aria-label={`${name} · ${activity}`}
      className={`pet-sprite transition-${view.stage}`}
      data-row={clip.row}
      data-activity={activity}
      data-clip={view.key}
      data-transition={view.stage}
      data-direction={facing}
      data-frame={cell}
      style={{
        width: `${Math.min(1, aspect) * 100}%`,
        left: `${(1 - Math.min(1, aspect)) * 50}%`,
        aspectRatio: aspect,
        transformOrigin: "50% 100%",
        transform: `translate(${clip.offsetX?.[cell] || 0}%, ${clip.offsetY?.[cell] || 0}%) scale(${clip.renderScale || 1})`,
        backgroundImage: `url(${clip.src || pack.src})`,
        backgroundSize: `${columns * 100}% ${backgroundHeight}%`,
        backgroundPosition: `${columns === 1 ? 0 : ((cell % columns) * 100) / (columns - 1)}% ${backgroundY}%`,
      }}
    />
  );
}
