# Validation record

Date: November 5, 2026. Local platform: Windows x64, Node.js 24, Electron 45.2.3 and Codex CLI `0.166.0-alpha.5.1`.

## Automated checks

Latest unit results: **52/52 tests passed**, including native Mac executable discovery/validation, one-shot inference-process retirement, exact Unicode dialogue pagination, turn isolation, layout persistence, pixel-beagle frame/alpha validation, animation selection, action-game physics, original Rin protection, earlier game rules, typography, touch geometry, foreground-loss rejection and upgrade-safe character preservation. The production build passed. Version-specific UI and real Codex checks are described below. The dependency audit reported zero vulnerabilities.

## Version 0.6.0: macOS and Windows

Both architectures passed the complete [macOS 15 workflow](https://github.com/Lihhan/anime-codex/actions/runs/42146775526): Apple Silicon on macos-15 and Intel on macos-15-intel. Each ran all 52 unit tests, a real native ONNX Identity-model inference, the production build, source bubble/full-chat UI checks, and a real Codex App Server handshake/account read with an empty PATH, including saved discovery after restart. The Mac runners had no signed-in Codex account and did not run a model turn or consume model quota.

Both Mac jobs also verified actual local Anime Segmentation inference against Rin composited onto an opaque test background, visible foreground retention, RGB preservation, exact restoration, cancellation and unchanged source files. Each built architecture-matched DMG and ZIP files with ad-hoc signing, launched the packaged application, checked its bubble/input UI and version/architecture, ran native inference from its packaged libraries, then reran the real background-removal/restoration/cancellation check against that packaged executable. Intel uses ONNX Runtime 1.23.2 in a fresh utility process per operation; Windows and Apple Silicon retain 1.31.1. The compatibility dependency's adm-zip is overridden to 0.6.1; npm audit reported zero vulnerabilities.

Local Windows 0.6.0 checks passed all 52 unit tests, source bubble/full-chat/customization UI, real backend discovery/restart with an empty PATH, and native CPU inference. The final packaged Windows application passed startup, version/architecture, bubble/input and actual background removal/restoration/cancellation checks. Its ASAR root allowlist was inspected and contained no workspace files, test results or release directories. Windows CI runs are recorded separately in repository Actions.

Limits: Mac verification was performed on GitHub-hosted macOS 15 machines. The configured minimum is macOS 14, which was not separately exercised. Interactive Gatekeeper approval of a browser-downloaded file, a user's authenticated Mac programming turn, physical multi-monitor arrangements and every game/voice were not covered by these Mac checks. These development packages have no Apple Developer ID notarization. Existing Windows real model-turn evidence remains version-specific below; fixtures are not presented as execution evidence.

## Earlier versions

The 0.5.0 source bubble UI check passed persistent input without preset choices, draft preservation, exact paginated Unicode/whitespace, original history, new-turn isolation, explicit approval/failure fixtures and persisted layout selection. Task status and input are outside the speech bubble. The existing source UI, customization, play and arcade checks also passed. A real Codex task sent through the bubble composer read hello.js, returned a first-person Rin reply and the expected greeting, and preserved tool records and resumable history. These real results are separate from the explicitly marked UI fixtures.

The final 0.5.0 packaged Windows application also passed the bubble and main UI checks, using the unpacked executable with isolated profiles. The real bubble-composer Codex task above used the source application. No real execution is inferred from approval fixtures.

The 0.4.0 source arcade check passed an actual mouse-held hop with a scored landing, runner jump and collision, pause/resume, preserving a previous game tab, best scores after restart, and an approval fixture that blocks resume even after restarting the round. Its character regression replaced default Rin's idle image, verified automatic custom-copy creation, returned to the original and reselected the intact custom image. Legacy-copy preservation and all bundled image restoration are separately covered by unit tests. Source UI, customization and earlier play checks also passed. No real programming turn was rerun for this game/template update; work/approval fixtures are explicitly not execution evidence.

The final Windows 0.4.0 packaged executable passed the arcade, main UI, customization and earlier play checks. The arcade test confirmed the fixed beagle image source, absence of character portrait elements in action mode, a 400×210 canvas, disabled image smoothing and pixelated CSS scaling. Both action-game screenshots were refreshed from that packaged build before work fixtures were injected. Original Rin restoration, custom-image retention and restart/high-score checks passed as well.

The 0.3.0 source play-window smoke check passed font sizing/persistence, touch feedback and opt-out, restricted bridge/data, completing both games, live language refresh and preserving an explicitly marked main-window work fixture. Source UI and customization checks passed. The game fixture is not presented as a real programming task.

The Windows 0.3.0 packaged executable also passed the play-window, main UI and customization checks. This includes minimizing/restoring the game without resetting its matched cards, closing it without clearing the main working fixture, three-language refresh, 22 px preference after restart, and maintaining drag/resize/dock behavior. Real screenshots were refreshed using isolated profiles; the playroom capture precedes all work fixtures.

For 0.2.4, source and packaged UI checks passed the sticky top-right settings close button after scrolling, Escape dismissal, keyboard focus return and unsaved input preservation. The source customization check also passed. Packaged real-inference checks passed for both the anime model and the general fallback on a previously erased photo. Existing real Codex evidence remains version-specific below; this update did not rerun a programming turn.

The 0.2.2 source app and Windows packaged executable both passed the UI/customization checks, including switching from a custom character to Rin and back, preserving that custom selection on restart, and transparent approval-state rendering. The packaged 0.2.2 executable also passed the real local background-removal check with Rin present in the library. Real Codex backend evidence below is from the earlier backend implementation, which this character-library update does not change.

The current unit suite contains 52 tests covering:

- Idle-only fallback for every action; selecting an uploaded action and restoring fallback after removal.
- Charged-hop limits, precise landings/streaks, reachable platform generation, misses, running jump/crouch collisions, bounded deterministic frame stepping, pause behavior and legacy original-Rin copy/restore migration.
- Guessing every roster character within ten answers, bounded unknown answers, memory flip/match/lock rules, touch geometry/drag separation, saved font/interaction settings and multilingual game copy.
- Rejection of empty/near-empty masks, general model preprocessing, and restoration of a legacy blank cutout from its saved original.
- Bundled Rin installed once, transparent aligned action images, preserved profile edits and upgrade-safe custom selection.
- Native executable selection precedence, absolute PATH lookup without shell wrappers, desktop discovery with empty PATH, stale saved paths, and actionable errors when no backend exists.
- Import copying, optional action assignment, profile/language persistence and missing original files.
- Rejection of non-images, truncated/oversized headers, unsupported actions and invalid profile selection.
- Desktop geometry, scale limits, negative monitor coordinates, all four docking edges and approval-aware hiding.
- Translation catalog completeness and interpolation across Chinese, English and Japanese.
- Codex event reduction, approval precedence, failure/interruption, permission limits, JSON-lines transport, UTF-8 framing and bidirectional requests.

The Electron UI check covers setup guidance, renderer isolation, input, transparent pixels, approval dialogs and failure display. The customization check exercises default Rin, native image imports, per-action slots, idle fallback, action preview, real event-to-image mapping using marked fixtures, three languages, switching between Rin and custom characters, pointer dragging, scaling, docking/restoring on all four edges and application restart persistence. It also checks that the approval character state stays transparent. Simple colored PNGs are test data, not distributed character artwork.

## Local background-removal evidence

The real background smoke check completed on November 5, 2026 in both source Electron and the packaged Windows 0.2.1 executable with the pinned ISNet model and Windows CPU runtime. A 1536×1024 fixture was explicitly composited onto an opaque background when its source already contained transparency, avoiding false credit for pre-existing alpha. Inference reduced alpha in 564,225 pixels while retaining 997,093 opaque pixels. RGB values, dimensions and the external source file were unchanged. Original restoration, cancellation preserving the current image, and UI interaction during inference all passed. The local report is `test-results/background-real.json`.

Eight background unit checks cover letterboxing/mask alpha behavior, general preprocessing, near-empty mask refusal, pinned model validation and caching, interrupted downloads, original restoration, option persistence, failure without changing the library, and legacy recovery. No mocked test result is presented as a real AI cutout.

The 0.2.4 packaged photo regression used the local original corresponding to an earlier completely transparent result. The anime model's maximum mask score was only about 0.00494, so the new guard rejected it and invoked U2NetP. The real general-model result on the 957×1278 image reduced alpha in 577,884 pixels and retained 631,986 opaque pixels. Dimensions, RGB colors and the external source file stayed unchanged; restoration, cancellation and UI responsiveness passed. The original anime fixture also passed with its previous counts. Reports are `test-results/background-photo-real.json` and `test-results/background-anime-real.json`; private source/result images are not committed. These pixel counts confirm foreground retention, not perfect boundary quality.

## Real backend evidence

For 0.3.0, a real desktop task produced a first-person introduction identifying the configured character as Rin, read the disposable `hello.js` fixture through actual tools, explained its return value, and resumed the saved conversation. The test asserted the first-person pronoun, character name, expected fixture content, actual tool records and no visible errors. The local report recorded four tool records. This was an actual source Electron → preload → App Server → streamed UI/history test, separate from the game fixtures.

For 0.2.3, the connection smoke check deliberately removes PATH and clears CODEX_PATH. It performs a real App Server initialize/account read, confirms native desktop installation discovery, restarts the client, and verifies that the successful path was saved and reused. This check sends no model turn. An initial source restart attempt encountered an unexpected App Server exit; repeating the source check passed both stages. This is recorded separately from the original missing-executable bug, and does not establish why that transient exit happened.

The Windows packaged 0.2.3 executable passed both empty-PATH connection stages and the UI smoke check. Authentication was available on this machine. The test does not claim that an unsigned package will work under every organization's executable restrictions, or that a successful account read proves a programming task completed.

The real backend smoke check has verified file reads/writes with matching random fixture content, streamed deltas, stored history and resuming the same thread. The real desktop check has verified the UI → preload → main → App Server path: it asks Codex to read a fixture, receives tool records and original replies, and restores the conversation history. Latest raw local reports are in ignored `test-results/` files.

UI-only approval/action fixtures never count as executed commands. A real turn may fail for a backend, authentication, policy or environment reason; the app displays that failure instead of claiming success. GitHub Actions results are not inferred from local checks.

## Packaging and limitations

Windows and Mac 0.6.0 packages are built under `release/v0.6.0/`, separately from earlier builds. The application requires a local Codex installation and sign-in; credentials and Codex binaries are not bundled.

Geometry tests cover multiple logical display areas, including negative coordinates. Not every monitor arrangement, DPI transition, GPU, system voice, accessibility tool or managed Codex policy has been physically tested. Image mode does not deform faces or limbs, generate missing artwork, perform Live2D rendering, or provide phoneme-accurate lip sync.

The repository is private at [Lihhan/anime-codex](https://github.com/Lihhan/anime-codex). Personal image imports, app data and raw test output are excluded from Git. Repository documentation is English; application-owned UI supports Chinese, English and Japanese.
