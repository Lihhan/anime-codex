import messages from "./messages.json" with { type: "json" };
export const languages = { zh: "中文", en: "English", ja: "日本語" };
const aliases = new Map();
for (const locale of ["zh", "en", "ja"])
  for (const [key, value] of Object.entries(messages[locale]))
    if (!aliases.has(value)) aliases.set(value, key);
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const patterns = [];
for (const key of Object.keys(messages.en)) {
  if (!/[\u3400-\u9fff]/u.test(key) || !/\{\w+\}/.test(key)) continue;
  for (const locale of ["zh", "en", "ja"]) {
    const source = messages[locale][key],
      names = [];
    let at = 0,
      regex = "^";
    for (const m of source.matchAll(/\{(\w+)\}/g)) {
      regex += escape(source.slice(at, m.index)) + "([\\s\\S]*?)";
      names.push(m[1]);
      at = m.index + m[0].length;
    }
    patterns.push({
      key,
      names,
      regex: new RegExp(regex + escape(source.slice(at)) + "$"),
    });
  }
}
export function createTranslator(language = "zh") {
  return function translate(value, variables = {}) {
    if (typeof value !== "string") return String(value ?? "");
    let key = Object.hasOwn(messages.en, value)
      ? value
      : aliases.get(value) || value;
    if (!Object.hasOwn(messages.en, key) && value.length < 4000) {
      for (const p of patterns) {
        const match = p.regex.exec(value);
        if (!match) continue;
        key = p.key;
        variables = Object.fromEntries(
          p.names.map((name, i) => [name, match[i + 1]]),
        );
        if (key === "{v0}/{v1} · 制作{v2}动作与过渡帧")
          variables.v2 = translate(variables.v2);
        break;
      }
    }
    const table = messages[language] || messages.en;
    return String(
      Object.hasOwn(table, key)
        ? table[key]
        : Object.hasOwn(messages.en, key)
          ? messages.en[key]
          : value,
    ).replace(/\{(\w+)\}/g, (all, name) => variables[name] ?? all);
  };
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
