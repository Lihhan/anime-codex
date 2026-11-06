# Unofficial fan-character samples

Version 0.7.0 adds four optional character presets alongside the original Rin. The code's MIT license does **not** grant rights to the underlying franchise characters, names or designs. These presets are unofficial fan interpretations, with no claim of endorsement, canonical accuracy or official voice reproduction.

| Preset | Work | Included appearance | Visual reference |
|---|---|---|---|
| Furina | Genshin Impact | White/blue hair, Fontaine-inspired navy outfit and hat | [Official Genshin Impact site](https://genshin.hoyoverse.com/) |
| Nahida | Genshin Impact | White/green hair and leaf-inspired outfit | [Official Genshin Impact site](https://genshin.hoyoverse.com/) |
| Kaguya | Cosmic Princess Kaguya! | Real-world blonde hair, pink/black casual clothing and headphones | User-provided reference; [official work/character information](https://www.cho-kaguyahime.com/) |
| Iroha Sakayori | Cosmic Princess Kaguya! | Real-world dark-purple hair, low bun and white sailor uniform | User-provided reference; [official work/character information](https://www.cho-kaguyahime.com/) |

Genshin Impact character rights belong to their respective miHoYo/HoYoverse rights holders. Cosmic Princess Kaguya! character rights belong to the respective production/rightsholders. Consult the official sites for original work information. These samples are not official game or film asset extractions. No downloaded official reference image or user screenshot is included in the repository or application.

## Generated artwork

The four `public/characters/<slug>/sheet.png` atlases were generated with the built-in ImageGen tool for this application. Each atlas contains eight new fan-art poses on transparent alpha. The runtime PNGs are losslessly extracted, without replacing RGB values or removing alpha, into 384×512 cells in a 4×2 grid:

| Row | Left to right |
|---|---|
| First | Idle, listening, thinking, reading |
| Second | Working, awaiting approval, success, apology/failure |

Speaking reuses listening; interrupted reuses idle. This is an expression/pose image system, not skeletal animation. The existing desktop transitions add presentation motion. Settings previews remain labeled, and actual work poses follow backend events.

The Kaguya and Iroha assets deliberately use their **real-world appearances** requested by the user. Earlier virtual-avatar concepts were discarded and are not shipped.

Generation references: Furina `324a3e70-efbc-4355-8fd4-697638f07701`; Nahida `8bee7eef-6e04-4cc1-b322-f0c5e2ff53df`; real-world Kaguya `3f0d4766-088f-423d-ba29-d218979d3438`; real-world Iroha `d66dd8e6-36ef-4033-87e8-b807c11e7f95`. These identifiers record the selected generated outputs, not a guarantee that another generation will reproduce the pixels.

Common prompt specification: one landscape 1536×1024 atlas with exactly four columns and two rows; one consistent front-facing head-to-waist character per cell; unchanged face, hair and costume across poses; clean anime linework, soft cel shading, true transparent background, no UI or text; fully clothed, wholesome, age-appropriate presentation. The eight pose instructions correspond to the table above. Character-specific directions used the appearances in the first table. Kaguya and Iroha used the user's image solely as a visual reference and explicitly excluded desktop icons, screens, other characters and background.

Personality configurations are newly written fan interpretations, not copied scripts. They prioritize truthful programming results and preserve explicit approvals. The sample voice settings only adjust ordinary system TTS rate/pitch; they do not clone performers or provide official voice recordings.

## Personal customization

Each preset is a protected template. Editing its name, personality or images creates a separate custom copy, leaving the preset available. Uploaded images stay in local application data; they are not uploaded to Codex or GitHub. This repository does not relicense user-uploaded artwork. See [character configuration](../docs/CHARACTERS.md) and the original [Rin provenance](ASSETS.md).
