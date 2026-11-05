// Small, explicit offline roster. No franchise artwork or dialogue is bundled.
const c = (id, zh, en, ja, traits) => ({ id, names: { zh, en, ja }, traits });
export const roster = [
  c("naruto", "漩涡鸣人", "Naruto Uzumaki", "うずまきナルト", [
    "naruto",
    "ninja",
    "blond",
  ]),
  c("sakura", "春野樱", "Sakura Haruno", "春野サクラ", [
    "naruto",
    "ninja",
    "female",
    "pink",
  ]),
  c("kakashi", "旗木卡卡西", "Kakashi Hatake", "はたけカカシ", [
    "naruto",
    "ninja",
    "silver",
  ]),
  c("luffy", "蒙奇·D·路飞", "Monkey D. Luffy", "モンキー・D・ルフィ", [
    "onepiece",
    "pirate",
    "hat",
  ]),
  c("zoro", "罗罗诺亚·索隆", "Roronoa Zoro", "ロロノア・ゾロ", [
    "onepiece",
    "pirate",
    "sword",
    "green",
  ]),
  c("nami", "娜美", "Nami", "ナミ", ["onepiece", "pirate", "female", "orange"]),
  c("conan", "江户川柯南", "Conan Edogawa", "江戸川コナン", [
    "conan",
    "glasses",
    "small",
  ]),
  c("ran", "毛利兰", "Ran Mouri", "毛利蘭", ["conan", "female"]),
  c("haibara", "灰原哀", "Ai Haibara", "灰原哀", ["conan", "female", "small"]),
  c("anya", "阿尼亚·福杰", "Anya Forger", "アーニャ・フォージャー", [
    "spyfamily",
    "female",
    "small",
    "pink",
  ]),
  c("loid", "洛伊德·福杰", "Loid Forger", "ロイド・フォージャー", [
    "spyfamily",
    "blond",
  ]),
  c("yor", "约尔·福杰", "Yor Forger", "ヨル・フォージャー", [
    "spyfamily",
    "female",
  ]),
];
export const questionIds = [
  "female",
  "naruto",
  "onepiece",
  "conan",
  "spyfamily",
  "pink",
  "blond",
  "silver",
  "green",
  "orange",
  "glasses",
  "small",
  "ninja",
  "pirate",
  "hat",
  "sword",
];
