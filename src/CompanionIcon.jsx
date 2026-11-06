import React from "react";
const paths = {
  book: "M12 5v15M12 5C8 2 4 3 2 4v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-2-1-6-2-10 1Z",
  meal: "M4 3v6m3-6v6m-6-6v6h6M4 9v12M17 3v18m0-18c-5 3-5 9 0 9",
  game: "M7 7h10c4 0 6 12 3 13-2 1-4-4-5-4H9c-1 0-3 5-5 4C1 19 3 7 7 7ZM7 10v5m-2-2h4m6-2h.01m3 3h.01",
  office: "M3 4h18v12H3ZM8 21h8m-4-5v5",
  moon: "M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z",
  walk: "M14 3h.01M12 6l-3 6 4 3-2 6m1-15 4 6h4M9 12H4m9 3 5 6",
  rest: "M5 12V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5M3 11v8h18v-8M3 15h18M5 19v2m14-2v2",
  more: "M5 12h.01M12 12h.01M19 12h.01",

  chat: "M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H3V6a2 2 0 0 1 2-2Z",
  tasks: "M8 5h12M8 12h12M8 19h12M3 5h.01M3 12h.01M3 19h.01",
  life: "M12 20s-8-5-8-11a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 6-8 11-8 11Z",
  settings: "M4 7h16M4 17h16M9 4v6M15 14v6",
  history: "M3 10a9 9 0 1 1 2 8M3 4v6h6M12 7v5l3 2",
  close: "m6 6 12 12M18 6 6 18",
  send: "M12 19V5m-6 6 6-6 6 6",
  collapse: "m6 9 6 6 6-6",
  expand: "M7 17 17 7M7 7h10v10",
};
export function CompanionIcon({ name }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.chat} />
    </svg>
  );
}
