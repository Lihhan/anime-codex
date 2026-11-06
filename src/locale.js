import { useSyncExternalStore } from "react";
import { createTranslator, languages } from "../shared/i18n.mjs";
let language = "zh";
try {
  const saved = localStorage.getItem("anime-codex.uiLanguage");
  if (Object.hasOwn(languages, saved)) language = saved;
} catch {}
document.documentElement.lang = { zh: "zh-CN", en: "en", ja: "ja" }[language];
const listeners = new Set();
let translate = createTranslator(language);
export function setLocale(next) {
  if (!Object.hasOwn(languages, next)) return;
  try {
    localStorage.setItem("anime-codex.uiLanguage", next);
  } catch {}
  if (language === next) return;
  language = next;
  translate = createTranslator(language);
  document.documentElement.lang = { zh: "zh-CN", en: "en", ja: "ja" }[language];
  for (const notify of listeners) notify();
}
export function tr(key, variables) {
  return translate(key, variables);
}
export function useLocale() {
  return useSyncExternalStore(
    (notify) => {
      listeners.add(notify);
      return () => listeners.delete(notify);
    },
    () => language,
  );
}
