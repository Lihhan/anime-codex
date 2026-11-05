import { roster, questionIds } from "./play-catalog.mjs";
export function newGuess() {
  return { candidates: roster.map((c) => c.id), asked: [], history: [] };
}
export function nextQuestion(state) {
  if (state.candidates.length <= 1 || state.asked.length >= 10) return null;
  const available = questionIds.filter((id) => !state.asked.includes(id));
  let best = null,
    score = Infinity;
  for (const id of available) {
    const yes = roster.filter(
      (c) => state.candidates.includes(c.id) && c.traits.includes(id),
    ).length;
    const balance = Math.abs(state.candidates.length / 2 - yes);
    if (yes && yes < state.candidates.length && balance < score) {
      best = id;
      score = balance;
    }
  }
  return best;
}
export function answerGuess(state, id, answer) {
  if (nextQuestion(state) !== id || !["yes", "no", "unknown"].includes(answer))
    return state;
  const candidates =
    answer === "unknown"
      ? state.candidates
      : state.candidates.filter(
          (key) =>
            roster.find((c) => c.id === key).traits.includes(id) ===
            (answer === "yes"),
        );
  return {
    candidates,
    asked: [...state.asked, id],
    history: [...state.history, { id, answer }],
  };
}
export const symbols = ["🌙", "⭐", "🍀", "🎹", "🐾", "📚"];
export function newMemory(random = Math.random) {
  const cards = [...symbols, ...symbols].map((symbol, id) => ({ id, symbol }));
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return { cards, open: [], matched: [], moves: 0 };
}
export function flipCard(state, id) {
  if (
    !state.cards.some((c) => c.id === id) ||
    state.open.length === 2 ||
    state.open.includes(id) ||
    state.matched.includes(id)
  )
    return state;
  if (!state.open.length) return { ...state, open: [id] };
  const first = state.open[0];
  const match =
    state.cards.find((c) => c.id === first).symbol ===
    state.cards.find((c) => c.id === id).symbol;
  return {
    ...state,
    open: match ? [] : [first, id],
    matched: match ? [...state.matched, first, id] : state.matched,
    moves: state.moves + 1,
  };
}
