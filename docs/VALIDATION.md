# Validation record

Date: November 5, 2026. Local platform: Windows x64, Node.js 24, Electron 45.2.3 and Codex CLI `0.166.0-alpha.5.1`.

## Automated checks

Latest unit results: **34/34 tests passed**, including game rules, typography persistence, touch geometry, Windows executable discovery, foreground-loss rejection, legacy cutout recovery, fresh Rin installation and upgrade-safe custom selection. The production build passed. Version-specific UI and real Codex checks are described below. The dependency audit reported zero vulnerabilities.

The 0.3.0 source play-window smoke check passed font sizing/persistence, touch feedback and opt-out, restricted bridge/data, completing both games, live language refresh and preserving an explicitly marked main-window work fixture. Source UI and customization checks passed. The game fixture is not presented as a real programming task.

The Windows 0.3.0 packaged executable also passed the play-window, main UI and customization checks. This includes minimizing/restoring the game without resetting its matched cards, closing it without clearing the main working fixture, three-language refresh, 22 px preference after restart, and maintaining drag/resize/dock behavior. Real screenshots were refreshed using isolated profiles; the playroom capture precedes all work fixtures.

For 0.2.4, source and packaged UI checks passed the sticky top-right settings close button after scrolling, Escape dismissal, keyboard focus return and unsaved input preservation. The source customization check also passed. Packaged real-inference checks passed for both the anime model and the general fallback on a previously erased photo. Existing real Codex evidence remains version-specific below; this update did not rerun a programming turn.

The 0.2.2 source app and Windows packaged executable both passed the UI/customization checks, including switching from a custom character to Rin and back, preserving that custom selection on restart, and transparent approval-state rendering. The packaged 0.2.2 executable also passed the real local background-removal check with Rin present in the library. Real Codex backend evidence below is from the earlier backend implementation, which this character-library update does not change.

The current unit suite contains 34 tests covering:

- Idle-only fallback for every action; selecting an uploaded action and restoring fallback after removal.
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

Windows 0.3.0 packages are built under `release/v0.3.0/`, separately from earlier builds. The application requires a local Codex installation and sign-in; credentials and Codex binaries are not bundled.

Geometry tests cover multiple logical display areas, including negative coordinates. Not every monitor arrangement, DPI transition, GPU, system voice, accessibility tool or managed Codex policy has been physically tested. Image mode does not deform faces or limbs, generate missing artwork, perform Live2D rendering, or provide phoneme-accurate lip sync.

The repository is private at [Lihhan/anime-codex](https://github.com/Lihhan/anime-codex). Personal image imports, app data and raw test output are excluded from Git. Repository documentation is English; application-owned UI supports Chinese, English and Japanese.
