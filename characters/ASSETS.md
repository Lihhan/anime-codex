# Asset provenance

## User-supplied action images

The application supports user-imported characters alongside the bundled Rin example. One idle image is sufficient; optional action files belong to the same user-managed character profile. Imports are copied to local application data and are not uploaded to Codex or GitHub. This repository does not grant rights to imported artwork.

## Bundled Rin sample

The original `public/characters/rin/sheet.png` is retained for provenance. Eight per-action PNGs in the same directory are extracted from its 384×512 cells and cleaned with the pinned local Anime Segmentation model, preserving RGB colors, dimensions and alignment. `characters/rin.json` maps those images to the current action-image renderer. Speaking reuses listening; interrupted reuses idle. No new artwork was generated for this update. Run `scripts/prepare-rin.mjs` with `RUN_REAL_BACKGROUND=1` to reproduce the extraction; the model's separate license is in [third-party notices](../THIRD_PARTY_NOTICES.md).

Rin is installed once into the local character library and selected when there is no existing selection. Upgrades preserve a selected custom character. Existing edits to Rin are preserved on restart. The included character uses the same image controls and personality settings as imported characters.

The sample was generated with the built-in ImageGen tool on November 5, 2026 without an external character reference. It is AI-generated original example artwork, not commissioned human artwork. No exclusive copyright claim is made; use remains subject to the generation service's terms and applicable law. The code's MIT license does not override those terms.

The canvas is 1536×1024 with eight 384×512 cells. An initial gray-purple background was removed in a second ImageGen edit, preserving identity and alignment. The saved PNG has an inspected RGBA alpha range of 0–254. Its generation prompt requested an original adult woman with silver-lavender hair, teal eyes, navy cardigan and ivory blouse, consistent waist-up framing, and eight idle/listening/thinking/reading/working/approval/success/failure expressions. No existing franchise character or downloaded Live2D model was used.

The discarded procedural rig, face editor and skin experiments are not part of the current image-only implementation.

## Repository demonstration captures

`docs/images/playroom.png` is a real 0.3.0 game-window capture using bundled Rin, an English disposable profile and an adjusted 22 px font. It is captured before work-status fixtures are injected and shows local offline play, not an executed programming task. Game icons are system emoji; no franchise artwork is included.

`docs/images/rin-desktop.png` and `docs/images/rin-actions.png` are captured from the actual app by `scripts/capture-rin-demo.mjs` using a disposable profile and English UI. The desktop capture shows the disconnected welcome screen. The action strip retains the visible Preview labels and demonstrates appearance only; it is not evidence of executed tools or successful tasks. The captures include no personal uploads, conversations, credentials or desktop content.
