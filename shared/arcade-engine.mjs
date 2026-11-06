export const WORLD = { width: 800, height: 420, ground: 326 };
export function beagleFrame(s, reduced = false) {
  if (["over", "falling"].includes(s.status)) return "hurt";
  if (s.kind === "hop") {
    if (s.status === "charging") return "duck";
    if (s.status === "jumping") return "jump";
    if (s.landTime > 0.4) return "land";
    if (s.landTime > 0 && s.flash === "perfect") return "cheer";
  } else {
    if (s.y < WORLD.ground - 0.1) return "jump";
    if (s.duck) return "duck";
    if (s.status === "running")
      return !reduced && Math.floor(s.elapsed * 11) % 2 ? "runB" : "runA";
  }
  return "idle";
}
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
function random(seed) {
  const next = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return [next, next / 4294967296];
}
export const chargeDistance = (seconds) =>
  70 + 260 * Math.pow(clamp(seconds / 1.2, 0, 1), 0.95);
export function newHop(seed = 7127) {
  const current = { x: 120, y: 310, width: 116 },
    target = { x: 310, y: 288, width: 104 };
  return {
    kind: "hop",
    status: "ready",
    paused: false,
    seed,
    current,
    target,
    platforms: [current, target],
    x: current.x,
    y: current.y,
    camera: 0,
    charge: 0,
    elapsed: 0,
    score: 0,
    streak: 0,
    flash: "",
    landTime: 0,
  };
}
export function beginHop(s) {
  return !s.paused && s.status === "ready"
    ? { ...s, status: "charging", charge: 0, flash: "" }
    : s;
}
export function releaseHop(s) {
  if (s.paused || s.status !== "charging") return s;
  const distance = chargeDistance(s.charge);
  return {
    ...s,
    status: "jumping",
    fromX: s.x,
    fromY: s.y,
    toX: s.x + distance,
    toY: s.target.y,
    distance,
    flight: 0,
    duration: 0.65 + distance * 0.0005,
  };
}
export function cancelHop(s) {
  return s.status === "charging" ? { ...s, status: "ready", charge: 0 } : s;
}
export function stepHop(s, dt) {
  if (s.paused || s.status === "over") return s;
  dt = clamp(dt, 0, 1 / 30);
  const n = {
    ...s,
    elapsed: s.elapsed + dt,
    landTime: Math.max(0, s.landTime - dt),
  };
  if (s.status === "charging") n.charge = Math.min(1.2, s.charge + dt);
  if (s.status === "jumping") {
    n.flight = Math.min(s.duration, s.flight + dt);
    const p = n.flight / s.duration;
    n.x = s.fromX + (s.toX - s.fromX) * p;
    n.y =
      s.fromY +
      (s.toY - s.fromY) * p -
      Math.sin(Math.PI * p) * (80 + s.distance * 0.17);
    if (p >= 1) {
      const offset = Math.abs(n.x - s.target.x);
      if (offset <= s.target.width / 2 - 8) {
        const perfect = offset <= 10;
        n.score += perfect ? 2 : 1;
        n.streak = perfect ? s.streak + 1 : 0;
        n.status = "ready";
        n.flash = perfect ? "perfect" : "landed";
        n.landTime = 0.65;
        n.charge = 0;
        // Keep the exact landing position. The next gap is measured from that spot.
        n.current = s.target;
        n.y = s.target.y;
        let a, b;
        [n.seed, a] = random(s.seed);
        [n.seed, b] = random(n.seed);
        n.target = {
          x: n.x + 155 + a * 130,
          y: 282 + (b - 0.5) * 40,
          width: Math.max(72, 104 - n.score * 1.1),
        };
        n.platforms = [...s.platforms, n.target].slice(-7);
      } else {
        n.status = "falling";
        n.fallVelocity = 60;
        n.flash = "miss";
      }
    }
  } else if (s.status === "falling") {
    n.fallVelocity = s.fallVelocity + 1200 * dt;
    n.y += n.fallVelocity * dt;
    if (n.y > WORLD.height + 100) n.status = "over";
  }
  n.camera += (Math.max(0, n.x - 150) - n.camera) * Math.min(1, dt * 6);
  return n;
}
export function newRunner(seed = 3901) {
  return {
    kind: "runner",
    status: "ready",
    paused: false,
    seed,
    x: 125,
    y: WORLD.ground,
    velocity: 0,
    duck: false,
    distance: 0,
    score: 0,
    elapsed: 0,
    speed: 260,
    spawn: 1.9,
    obstacles: [
      {
        id: 0,
        x: 850,
        y: WORLD.ground - 46,
        width: 34,
        height: 46,
        type: "crystal",
      },
    ],
    nextId: 1,
  };
}
export function runnerJump(s) {
  if (s.paused || s.status === "over" || s.y < WORLD.ground - 0.1) return s;
  return { ...s, status: "running", velocity: -640, duck: false };
}
export function runnerDuck(s, duck) {
  return s.status !== "over" && !s.paused ? { ...s, duck: !!duck } : s;
}
export function overlaps(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
export function runnerBounds(s) {
  const h = s.duck && s.y >= WORLD.ground - 0.1 ? 32 : 64;
  return { x: s.x - 12, y: s.y - h + 5, width: 24, height: h - 9 };
}
export function stepRunner(s, dt) {
  if (s.paused || s.status !== "running") return s;
  dt = clamp(dt, 0, 1 / 30);
  const n = {
    ...s,
    elapsed: s.elapsed + dt,
    speed: Math.min(500, 260 + s.distance * 0.012),
  };
  n.distance += n.speed * dt;
  n.score = Math.floor(n.distance / 20);
  n.velocity = s.velocity + 1800 * dt;
  n.y = Math.min(WORLD.ground, s.y + n.velocity * dt);
  if (n.y === WORLD.ground) n.velocity = 0;
  n.obstacles = s.obstacles
    .map((o) => ({ ...o, x: o.x - n.speed * dt }))
    .filter((o) => o.x + o.width > -30);
  n.spawn -= dt;
  if (n.spawn <= 0) {
    let a, b;
    [n.seed, a] = random(s.seed);
    [n.seed, b] = random(n.seed);
    const bird = n.score >= 35 && a > 0.58;
    const height = bird ? 19 : 34 + b * 24;
    n.obstacles.push({
      id: n.nextId++,
      x: WORLD.width + 50,
      y: bird ? WORLD.ground - 67 : WORLD.ground - height,
      width: bird ? 42 : 26 + a * 20,
      height,
      type: bird ? "kite" : "crystal",
    });
    n.spawn = 1.3 + b * 0.65;
  }
  if (n.obstacles.some((o) => overlaps(runnerBounds(n), o))) {
    n.status = "over";
    n.duck = false;
  }
  return n;
}
export function pauseArcade(s, paused = true) {
  const next = s.kind === "hop" ? cancelHop(s) : { ...s, duck: false };
  return { ...next, paused };
}
export function isArcadeMoving(s) {
  return (
    !s.paused &&
    (s.kind === "hop"
      ? ["charging", "jumping", "falling"].includes(s.status) || s.landTime > 0
      : s.status === "running")
  );
}
export function advanceArcade(s, seconds) {
  let left = clamp(seconds, 0, 0.25),
    next = s;
  while (left > 1e-8) {
    const dt = Math.min(left, 1 / 120);
    next = s.kind === "hop" ? stepHop(next, dt) : stepRunner(next, dt);
    left -= dt;
  }
  return next;
}
