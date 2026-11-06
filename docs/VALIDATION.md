## 0.8.0 Windows and macOS release integration

Date: November 6, 2026. This integration combines the current companion preview with main's project-free chat and native edge recovery, under the requested 0.8.0 release number.

Local Windows x64 validation passed 103 unit tests, production build, native ONNX inference, the current companion UI, quick interaction menus, keyboard-rhythm enable/disable, memories, role isolation, mini mode and hide/reveal. The retained workbench passed dialogue/full-chat, all six presets with idle fallback, original template protection, settings navigation, dragging/resizing, four-edge native recovery, touch/typography, playroom and pixel-beagle arcade checks.

The actual Windows input helper registered both native hooks, produced four bounded count-only frames, and stopped when requested. Its unattended probe does not claim a physical-keypress test. The real Windows command processor executed the authored check fixture successfully. No execution-policy/security setting was changed. Mac packages build a precompiled, architecture-matched Swift counter; source-only development retains an on-demand compilation fallback.

The optional real companion smoke uses a signed-in Codex account and never grants approvals automatically. It records whether a native task executed or requested approval and was safely cancelled, instead of treating a pending request as successful execution. The native cancellation path now marks cancellation intent before awaiting the interrupt response, preventing an interrupted native turn from being mislabeled as failed.

This Windows machine has no signed-in native Claude Code installation. Windows Claude executable discovery, environment handling and adapter protocol paths are tested, but an authenticated Windows Claude model turn is not claimed. The earlier Apple Silicon Claude evidence below remains version-specific. Fresh architecture-specific CI/package evidence will be recorded after those checks complete.

---

## Local 0.9.0 validation

70 unit tests and the production build passed. Real native Codex verified code writing/testing, read-only SSH and computer-state inspection. Packaged UI validated model/effort overrides without global config changes, actual code execution, and generated character activation with restart persistence. A separate native computer test verified click, type and submit against an isolated window. Browser host was unavailable; browser interaction was not validated. See [LOCAL_AGENT.md](LOCAL_AGENT.md) for exact evidence and scope.

# Validation record

## Local development 0.8.0

See [Claude integration validation](CLAUDE.md#verification) for the local Apple Silicon checks: 66 passing unit tests, source and packaged real Claude file reads with independent Codex subscription translation, native session resume, and packaged startup/inference. No remote CI or published 0.8.0 release is claimed. The records below refer to 0.7.0 and earlier versions.

Date: November 5, 2026. Local platform: Windows x64, Node.js 24, Electron 45.2.3 and Codex CLI `0.166.0-alpha.5.1`.

## Automated checks

Latest unit results: **58/58 tests passed**, including native Mac executable discovery/validation, one-shot inference-process retirement, exact Unicode dialogue pagination, turn isolation, layout persistence, pixel-beagle frame/alpha validation, animation selection, action-game physics, original Rin protection, earlier game rules, typography, touch geometry, foreground-loss rejection and upgrade-safe character preservation. The production build passed. Version-specific UI and real Codex checks are described below. The dependency audit reported zero vulnerabilities.

## Version 0.7.0: in-place chat and dock update

The updated Windows executable passed version/architecture, native inference, sending enabled before project connection, draft preservation on failed automatic connection, and a separate visible/restricted native recovery window with four-edge click/hover restoration. The ASAR includes all native-tab assets and only intended application roots. Both architectures passed the updated [Mac workflow](https://github.com/Lihhan/anime-codex/actions/runs/42159758764), with 58 unit tests, source bubble/preset/full-chat/native-dock checks, native inference, an unauthenticated Codex handshake, real local background removal/restoration/cancellation, DMG/ZIP creation and packaged inference/background/native-dock checks. The [Windows workflow](https://github.com/Lihhan/anime-codex/actions/runs/42159758827) also passed. Mac runners were not signed in and sent no model turns; the real chat/programming evidence below is from Windows.

This update keeps version 0.7.0 and its existing Git tag unchanged at the user's request. The release describes the updated source commit and supplies an explicit current source ZIP alongside replacement binaries and checksums. GitHub's automatically generated source archives still reflect the original tag. Older published release pages are removed after the updated assets have been verified; Git history and tags are retained.

All 58 unit tests passed locally. Added tests verify inset tabs on every edge and tiny/negative-coordinate work areas, native hover recovery without renderer events, timer reset on leaving the tab, and refusal of stale click-through requests over the recovery target. The source Electron regression verifies visible, hit-testable tabs on all four edges, then substitutes native cursor positions without dispatching renderer hover events: each tab expands and restores input. This reproduces the missing-event recovery path, not a claim that every user disappearance has the same cause. The first isolated UI launch closed before rendering; a fresh run passed all four edges.

The dock check also verifies a separate visible native recovery window on every edge, a real click through its restricted reveal-only preload, and native hover recovery without renderer mouse-enter events. This prevents main-overlay clipping or painting from removing the only recovery target. The original main-window tab remains as a fallback.

Three real desktop Codex turns verified automatic connection without selecting a project, first-person Rin dialogue, remembering a unique word across turns, no folder picker during chat, refusing a requested file read in chat without tool execution, then actually reading a uniquely marked project file after selecting its folder. Returning to chat restored the chat-only thread listing and saved history; the fixture file was unchanged. The local report is test-results/chat-real.json. Chat uses an application-owned working directory, read-only sandbox and no escalation; command execution, configured external integrations and project-document discovery are disabled for that thread. This is a restricted Codex session, not an additional OS security boundary.

The App Server configuration round-trip required removing null optional fields and retaining MCP transport fields when disabling inherited servers. An initial override attempt failed before any model turn; the corrected configuration passed the real workflow above. Source full-chat and bubble checks also passed with sending enabled before connection and drafts preserved after a simulated connection failure. No programming execution is inferred from UI fixtures.

## Version 0.7.0: original character-preset release

All 55 unit tests passed locally, including five-template installation, transparent aligned images, editing/copy protection, original restoration and upgrade preservation. The preset UI check passed four identities and thinking poses, clearing stale replies on switch, disabled switching during a work fixture, custom-copy editing, original Rin restoration and selection persistence after restart. Customization, play and arcade source checks also passed. Work/approval fixtures are UI tests, not executed programming tasks.

Four real read-only Codex turns ran through the desktop bubble composer, one per fan character. Each introduced itself in first person, read a uniquely marked file through an actual tool, returned its exact content and responded to the same hypothetical frustrated-user scenario in its configured voice. The four stored threads were independent, no error was shown, and the source file remained unchanged. The local report is test-results/presets-real-codex.json. These checks demonstrate persona instructions and real file reads; subjective resemblance is a fan interpretation, not a guarantee of canonical behavior on every turn.

The Windows 0.7.0 packaged executable passed startup/version/architecture, native CPU inference, all four preset switches, template protection, Rin restoration and selection persistence. Actual background removal, foreground retention, original restoration and cancellation also passed. The ASAR root allowlist contained only intended application files. Source bubble and full-chat UI checks passed separately.

Both Mac architectures passed the complete [0.7.0 macOS workflow](https://github.com/Lihhan/anime-codex/actions/runs/42153467192), including all 55 unit tests, source preset/bubble/full-chat checks, native CPU inference, a real unauthenticated Codex handshake, actual local background removal/restoration/cancellation, DMG/ZIP packaging and packaged startup/inference/background checks. Apple Silicon and Intel packages were exercised on GitHub-hosted macOS 15; macOS 14 and a signed-in Mac model turn were not exercised. The [Windows workflow](https://github.com/Lihhan/anime-codex/actions/runs/42153467159) also passed. Raw CI reports are retained in workflow artifacts; local four-character real model-turn results are described above.

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

The current unit suite contains 58 tests covering:

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

Windows and Mac 0.7.0 packages are built under `release/v0.7.0/`, separately from earlier builds. The application requires a local Codex installation and sign-in; credentials and Codex binaries are not bundled.

Geometry tests cover multiple logical display areas, including negative coordinates. Not every monitor arrangement, DPI transition, GPU, system voice, accessibility tool or managed Codex policy has been physically tested. Image mode does not deform faces or limbs, generate missing artwork, perform Live2D rendering, or provide phoneme-accurate lip sync.

The repository is private at [Lihhan/anime-codex](https://github.com/Lihhan/anime-codex). Personal image imports, app data and raw test output are excluded from Git. Repository documentation is English; application-owned UI supports Chinese, English and Japanese.

## 0.10.0 companion preview — 2026-11-05 local

- 79 Node tests passed (`test-results/companion-tests.txt`). New coverage includes character isolation, older-history recall, torn JSONL recovery, summary provenance, per-project serialization, cross-project concurrency, single-use approvals, cancellation, native thread continuation, failed completion checks, automatic task routing, and byte-identical non-overwriting file restoration.
- Vite production build and macOS arm64 Electron packaging passed. Installed bundle passes `codesign --verify --deep --strict`.
- Real local end-to-end (`test-results/companion-real.json`, directory `companion-real-YWdJ54`): Codex and Claude each wrote and executed `proof.mjs` in separate disposable directories. The application independently reran the supplied `node proof.mjs` check; both returned exit 0. A separate character chat completed while workers were active. Restart retained conversations, tasks and confirmed memory. Hashes of existing native Codex/Claude configuration files were unchanged.
- System Trash + recovery: the test's own snack file was actually removed via Electron's Trash API and restored byte-for-byte from the app's recovery copy. This validates file content restoration, not original ACLs/extended attributes or Finder Put Back.
- Packaged UI (`test-results/companion-ui.json`): chat, memory editing, character isolation, star game, compact mode, hide-without-exit, and optional Swift event-counter helper startup/shutdown passed with zero renderer errors. Aggregate global input visual timing has not been separately tested using physical keyboard input.
- Installed app (`test-results/companion-installed.json`): version 0.10.0, original active character ID preserved, model/effort controls visible, zero renderer errors. Screenshots: `companion-installed.png`, `companion-panel.png`.
- Initial live smoke exposed a UI navigation/layout issue after result delivery; the subsequent real run passed after separating old conversation CSS and preventing header/tab/composer shrink. The first keyboard checkbox smoke also needed the UI to expose asynchronous helper preparation; the packaged retest passed.
- This is a functional companion preview. Full Live2D/frame animation, semantic vector memory, arbitrary external-app thread takeover and Finder-icon pathfinding remain outside the implemented scope; see SUPERAGENT.md.

## 0.18.0 — 自动制作与生活引导（2026-11-06）

- `npm test`：91 项通过。新增制作检查点/失败续作、取消、原图打包、资产独立安装/重启、活动调度、引导推进条件测试。
- `scripts/smoke-pet-upgrade.mjs`：Electron 四步引导及持久化、兼容与专用过渡、过渡完成前暂停移动、日常活动切换通过。引导中的聊天回复使用受控测试替身，不代表此处重新验证了真实聊天模型。
- `scripts/smoke-quick.mjs`：快捷菜单、关闭方式、缩放边界和避让布局回归通过。
- 真实 Codex 模型制作：`test-results/production-real.json` 对应原创角色“小苔”，模型 `gpt-6.1-sol`，本机角色大脑配置；基准图与六组 96 帧产物状态 `ready`。测试中在前三组完成后切换到新版打包实现，验证从检查点继续；前三组没有重做。
- `scripts/smoke-generated-pet.mjs`：用上述真实成品通过 `studioProduce({id})` 自动安装到隔离角色库；验证 `exit_read`、`enter_walk` 播放和重启后加载。记录 `test-results/generated-pet.json`。
- 图片结构检查不代表所有画面已经达到美术终稿：实测早期睡姿偏站立打盹、个别道具颜色跨组有变化。后续生成提示已加强躺卧姿态及参考已有动作中的道具；仍需按角色查看实际成品。
- 现有内置图集使用短暂收势/中立姿态/淡入的兼容过渡，新制作完整包具备专用进入退出帧。

## 0.18.1 大小滑杆

`node scripts/smoke-size-slider.mjs` 使用真实指针持续往返拖动 40–140%，覆盖三个角色位置（含右下边缘），验证滑杆坐标不变、松开不跳动和最终值。

## 0.18.2 拖动动画

`node scripts/smoke-drag.mjs` 检查真实拖动的抬起、即时 drag 帧切换、落地恢复和取消拖动恢复；现有角色复用 attention 帧，并未新增绘制悬空精灵图。
