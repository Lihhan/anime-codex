# Validation record

Date: November 5, 2026. Local platform: Windows x64, Node.js 24, Electron 45.2.3 and Codex CLI `0.166.0-alpha.5.1`.

## Automated checks

Latest local results: **15/15 unit tests passed**, production build passed, source and packaged Electron UI checks passed, image customization/restart checks passed, and the real desktop Codex read/history-resume check passed. The dependency audit reported zero vulnerabilities. The Windows portable build completed successfully.

The current unit suite contains 15 tests covering:

- Idle-only fallback for every action; selecting an uploaded action and restoring fallback after removal.
- Import copying, optional action assignment, profile/language persistence and missing original files.
- Rejection of non-images, truncated/oversized headers, unsupported actions and invalid profile selection.
- Desktop geometry, scale limits, negative monitor coordinates, all four docking edges and approval-aware hiding.
- Translation catalog completeness and interpolation across Chinese, English and Japanese.
- Codex event reduction, approval precedence, failure/interruption, permission limits, JSON-lines transport, UTF-8 framing and bidirectional requests.

The Electron UI check covers setup guidance, renderer isolation, input, transparent pixels, approval dialogs and failure display. The customization check exercises native image imports, per-action slots, idle fallback, action preview, real event-to-image mapping using marked fixtures, three languages, pointer dragging, scaling, docking/restoring on all four edges and application restart persistence. Simple colored PNGs are test data, not distributed character artwork.

## Real backend evidence

The real backend smoke check has verified file reads/writes with matching random fixture content, streamed deltas, stored history and resuming the same thread. The real desktop check has verified the UI → preload → main → App Server path: it asks Codex to read a fixture, receives tool records and original replies, and restores the conversation history. Latest raw local reports are in ignored `test-results/` files.

UI-only approval/action fixtures never count as executed commands. A real turn may fail for a backend, authentication, policy or environment reason; the app displays that failure instead of claiming success. GitHub Actions results are not inferred from local checks.

## Packaging and limitations

Windows packages are built under `release/v0.2.0/`, separately from the earlier development build. The application requires a local Codex installation and sign-in; credentials and Codex binaries are not bundled.

Geometry tests cover multiple logical display areas, including negative coordinates. Not every monitor arrangement, DPI transition, GPU, system voice, accessibility tool or managed Codex policy has been physically tested. Image mode does not deform faces or limbs, generate missing artwork, perform Live2D rendering, or provide phoneme-accurate lip sync.

The repository is private at [Lihhan/anime-codex](https://github.com/Lihhan/anime-codex). Personal image imports, app data and raw test output are excluded from Git. Repository documentation is English; application-owned UI supports Chinese, English and Japanese.
