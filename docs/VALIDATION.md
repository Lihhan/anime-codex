# Validation record

Date: November 5, 2026. Local platform: Windows x64, Node.js 24, Electron 45.2.3 and Codex CLI `0.166.0-alpha.5.1`.

## Automated checks

Latest unit results: **22/22 tests passed**, including fresh Rin installation, transparent action assets, restart preservation and adding Rin without replacing an existing custom selection. The production build passed. Source and packaged UI/customization checks and a real Codex read/history-resume check are described below. The dependency audit reported zero vulnerabilities.

The 0.2.2 source app and Windows packaged executable both passed the UI/customization checks, including switching from a custom character to Rin and back, preserving that custom selection on restart, and transparent approval-state rendering. The packaged 0.2.2 executable also passed the real local background-removal check with Rin present in the library. Real Codex backend evidence below is from the earlier backend implementation, which this character-library update does not change.

The current unit suite contains 22 tests covering:

- Idle-only fallback for every action; selecting an uploaded action and restoring fallback after removal.
- Bundled Rin installed once, transparent aligned action images, preserved profile edits and upgrade-safe custom selection.
- Import copying, optional action assignment, profile/language persistence and missing original files.
- Rejection of non-images, truncated/oversized headers, unsupported actions and invalid profile selection.
- Desktop geometry, scale limits, negative monitor coordinates, all four docking edges and approval-aware hiding.
- Translation catalog completeness and interpolation across Chinese, English and Japanese.
- Codex event reduction, approval precedence, failure/interruption, permission limits, JSON-lines transport, UTF-8 framing and bidirectional requests.

The Electron UI check covers setup guidance, renderer isolation, input, transparent pixels, approval dialogs and failure display. The customization check exercises default Rin, native image imports, per-action slots, idle fallback, action preview, real event-to-image mapping using marked fixtures, three languages, switching between Rin and custom characters, pointer dragging, scaling, docking/restoring on all four edges and application restart persistence. It also checks that the approval character state stays transparent. Simple colored PNGs are test data, not distributed character artwork.

## Local background-removal evidence

The real background smoke check completed on November 5, 2026 in both source Electron and the packaged Windows 0.2.1 executable with the pinned ISNet model and Windows CPU runtime. A 1536×1024 fixture was explicitly composited onto an opaque background when its source already contained transparency, avoiding false credit for pre-existing alpha. Inference reduced alpha in 564,225 pixels while retaining 997,093 opaque pixels. RGB values, dimensions and the external source file were unchanged. Original restoration, cancellation preserving the current image, and UI interaction during inference all passed. The local report is `test-results/background-real.json`.

Five additional unit checks cover letterboxing/mask alpha behavior, pinned model validation and caching, interrupted downloads, original restoration, option persistence, and failure without changing the library. No mocked test result is presented as a real AI cutout.

## Real backend evidence

The real backend smoke check has verified file reads/writes with matching random fixture content, streamed deltas, stored history and resuming the same thread. The real desktop check has verified the UI → preload → main → App Server path: it asks Codex to read a fixture, receives tool records and original replies, and restores the conversation history. Latest raw local reports are in ignored `test-results/` files.

UI-only approval/action fixtures never count as executed commands. A real turn may fail for a backend, authentication, policy or environment reason; the app displays that failure instead of claiming success. GitHub Actions results are not inferred from local checks.

## Packaging and limitations

Windows 0.2.2 packages are built under `release/v0.2.2/`, separately from earlier builds. The application requires a local Codex installation and sign-in; credentials and Codex binaries are not bundled.

Geometry tests cover multiple logical display areas, including negative coordinates. Not every monitor arrangement, DPI transition, GPU, system voice, accessibility tool or managed Codex policy has been physically tested. Image mode does not deform faces or limbs, generate missing artwork, perform Live2D rendering, or provide phoneme-accurate lip sync.

The repository is private at [Lihhan/anime-codex](https://github.com/Lihhan/anime-codex). Personal image imports, app data and raw test output are excluded from Git. Repository documentation is English; application-owned UI supports Chinese, English and Japanese.
