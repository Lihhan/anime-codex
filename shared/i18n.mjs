import messages from "./messages.json" with { type: "json" };
export const languages = { zh: "中文", en: "English", ja: "日本語" };
export function createTranslator(language = "zh") {
  return (key, variables = {}) =>
    String(messages[language]?.[key] ?? messages.en[key] ?? key).replace(
      /\{(\w+)\}/g,
      (all, name) => variables[name] ?? all,
    );
}
export function responseLanguage(language) {
  return (
    {
      zh: "Use natural Simplified Chinese for user-facing replies unless the user asks otherwise.",
      en: "Use natural English for user-facing replies unless the user asks otherwise.",
      ja: "Use natural Japanese for user-facing replies unless the user asks otherwise.",
    }[language] || "Use the language requested by the user."
  );
}
