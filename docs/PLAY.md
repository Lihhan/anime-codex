# Conversation, touch and games

The playroom also includes **Charge & hop** and **Starlight runner**. See [action-game controls, pause behavior and original Rin protection](ARCADE.md).

## Character voice

New/resumed coding conversations receive a first-person instruction and the configured character's display name. Rin's default name is localized. User-edited personalities remain saved, while truthful execution reporting and permission rules keep priority. The app does not rewrite responses through another model. Old replies remain unchanged.

Welcome copy, touch lines and game dialogue are local first-person text in Chinese, English and Japanese. They are not represented as model reasoning, tool execution or real physical sensation. The main transcript contains the user's coding messages and actual Codex replies; playful lines appear in a temporary bubble.

## Touch behavior

A six-pixel movement threshold distinguishes a tap from a drag. The pointer is converted to the displayed image's normalized content coordinates and checked against a downsampled alpha mask. Transparent padding is ignored. Upper, middle and lower regions correspond to hair, shoulders and hands. These are coarse portrait hotspots, not anatomical tracking. Custom portraits should use consistent framing.

Reactions last three seconds, are rate-limited, and use the supplied success expression with idle fallback. Their sway/bounce respects reduced-motion preferences. Real task poses remain visible during work; active approvals suppress the playful bubble. Disable reactions under Reading and interaction. With reactions disabled, the previous double-click chat toggle remains available.

The app still uses replaceable PNG images. Reactions do not create missing facial artwork or a deformable avatar rig.

## Independent play window

Play with me creates one native Electron window, or restores the existing one. A dedicated sandboxed preload exposes only bootstrap, close, show-main and status/refresh subscriptions. Main-process handlers validate the sender and main frame; the programming bridge accepts only the main renderer. Bootstrap provides display images, language, text size and a small work-status snapshot, omitting personality, account details, thread content and tool records.

The game bridge does not call the Codex transport. Opening, switching, winning, restarting or closing games does not start, cancel or resume a programming turn or answer an approval. The status badge comes from real main-process turn/request state. Show main window minimizes the game and focuses the coding client so the user can inspect approvals there. Round state stays in memory until the game window closes.

## Ten-question guessing

`shared/play-catalog.mjs` defines 12 characters from Naruto, One Piece, Detective Conan and Spy × Family, localized names and explicit traits. This is an offline roster, not open-ended anime knowledge. Users privately pick a supported character from the displayed list. Typical appearance is used rather than every disguise, time skip or alternate outfit.

`shared/play-engine.mjs` selects an unanswered trait that splits candidates most evenly. Yes/no filters them; not sure consumes a question without excluding anyone. At ten questions, or when no useful split remains, Rin requests confirmation or offers the remaining candidates without pretending certainty. Wrong guesses can be acknowledged and replayed. No franchise artwork, extracted dialogue or voice assets are bundled.

Character references used while assembling the roster:

- [Naruto official broadcaster character index](https://www.tv-tokyo.co.jp/anime/naruto/sp/chara/).
- [One Piece official character search](https://one-piece.com/character/).
- [Detective Conan official broadcaster character index](https://www.ytv.co.jp/conan/character/).
- [Spy × Family official TV site](https://spy-family.net/tvseries/).

These references are not endorsements. Franchise rights remain with their owners. New entries need localized names, verified traits, matching question translations and a passing all-characters-solvable test.

## Memory pairs

Six pairs use system-rendered emoji rather than downloaded art. Cards are shuffled locally; duplicate flips are ignored and two mismatched cards lock briefly before turning back. Pair matches, move counts, completion and replay follow game rules. State and clues are not uploaded or written into Codex history.

## Verification

Run `npm test`, `npm run build`, `npm run smoke:ui`, `npm run smoke:customization` and `npm run smoke:play`. The play check uses a disposable profile and explicitly marked work-status fixtures. It verifies typography/persistence, touch opt-out, restricted window data, solving both games, language refresh, window restoration and preserving the main renderer's working state. Fixtures are not evidence of an executed coding task.

`RUN_REAL_CODEX=1 npm run smoke:desktop` separately uses a real read-only task, checks first-person Rin replies, actual tools and resumed history. It consumes Codex quota. See the [validation record](VALIDATION.md).
