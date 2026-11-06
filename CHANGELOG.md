# 0.8.1 — Complete animation packs and uploaded action audio

- Same-version refresh: retire exact legacy photo copies even when renamed as Rin Custom; preserve unrelated custom characters, source images and backups.

- Add seven validated sheets and 112 generated frames each for Rin, Nahida, Kaguya, Iroha and Elysia using the original production pipeline; retain Furina unchanged.
- Apply cursor orientation to portrait and sprite appearances on Windows and Mac; restore quiet, wandering and keyboard-rhythm setting behavior.
- Replace synthesized speech with local, user-uploaded prerecorded action clips, per-character storage, preview, volume and silent missing slots. No speech model is bundled.
- Retire the legacy Ke Jie entry once with a recoverable profile backup; allow removal of custom characters while preserving history and artwork.
- Show uploaded custom pictures immediately and protect builtin templates.
- Prevent competing new-version instances from overwriting one data directory.

# 0.8.0 — Windows and macOS

- Release the current companion preview features for Windows x64, Apple Silicon and Intel Mac.
- Preserve project-free chat, native edge recovery, Codex/Claude workers, translation, memory, character creation and activity animations.
- Support aggregate keyboard/mouse rhythm on both desktop platforms, with opt-in controls and no input content collection.
- Run user-authored verification commands with the native platform shell.

## Earlier development preview milestones

# 0.18.6

- 放慢动作过渡，每个关键姿势至少280ms，起点和落稳增加停留。
- 校准芙宁娜各图集帧中心与脚底基线，并匹配睡觉、游戏等跨图集比例；保留源图像像素。

# 0.18.5

- 芙宁娜贴纸补齐吃饭、游戏、办公、跑动、摸头与倾听的进入/退出帧，九种活动共 72 个有向切换都有动作路径。
- 连续点击合并为最新目标，先完成当前过渡；自动制作新增社交过渡图集。

# 0.18.4

- 芙宁娜新增睡醒起身、接住落书并阅读的八帧动作过渡，替换淡入淡出；支持跨行连续动作及直接状态转换。

- 角色制作先检索台词、人设和背景，再整理档案；记录网页访问证据、来源、剧情阶段和未确认内容。
- 资料和创作示例分开标注，角色提示保留研究依据，制作界面可查看来源。

# 0.18.3

- 为芙宁娜贴纸画风加入专门的被拎起四帧动画：提起衣领、悬空垂腿、摆腿和挣扎表情。
- 动画播放器支持每个动作独立的精灵图行列数。

# 0.18.2

- 拖动角色时增加悬空摆动、随拖动方向倾斜和放下落地缓冲；支持专用 drag 动画，旧角色使用 attention 帧兼容。
- 点击、取消拖动和减少动态效果设置保持兼容。

# 0.18.1

- 固定快捷大小调节卡片的位置，连续缩放和松开滑杆时不再跟随角色跳动。

## 0.18.0 — 自动制作、动作过渡与初次引导

- 一键制作角色档案、基准形象、六组动作/过渡图集，结构检查后自动启用；支持取消和从已有进度继续。
- 使用角色大脑配置的 Codex 模型和 effort；保留生成来源、原图、透明图集和校验结果。
- 动作按退出、衔接、进入顺序播放，移动等待过渡完成；内置旧图集使用兼容过渡。
- 日常以持续 45–120 秒的生活活动为主，按角色偏好切换，减少长时间站立。
- 首次使用按聊天、任务、生活、设置逐步引导，完成对应交互后推进，本机保存进度，支持跳过和重播。

## 0.12.0 — 大小与生活动作

- 角色大小支持 40%–140%，默认 70%，本机保存；气泡和文字尺寸独立。
- 新增四向跑步及读书、吃饭、游戏、办公，共32帧新素材。
- 连续移动及四边反弹；闲置生活调度和手动活动入口。
- 82项测试通过；Electron实测缩放持久化、四向动作及撞边后回走。

## 0.11.0 — Q 版桌宠与气泡交互

- 芙宁娜增加 16 帧 Q 版动作包：眨眼、跑步、睡觉、进食，原立绘可切换。
- 默认聊天改为角色旁的紧凑气泡，历史面板单独展开；工具栏空闲隐藏。
- 面板主题跟随角色，动画 manifest 与角色身份分离，生成器 Q 版提示统一。
- 79 项测试通过；Electron 测试覆盖逐帧播放、睡姿、外观切换、气泡与自动隐藏。

# 0.10.0 — Resident companion preview

- New default desktop companion surface, compact bubbles, separate chat/tasks/memory/life/settings panels.
- Text-only character brain, persistent history, confirmed memory and background summaries.
- Independent Codex/Claude worker threads, per-project scheduling, cancellation, resumption, native permission requests and result reporting. Optional user-authored completion checks.
- Wandering/resting/touch, cursor following, optional macOS input rhythm, mini mode, star game, and system voice.
- File feeding through system Trash with local recovery copies and no-overwrite restoration.
- Existing role generation and character library retained. Native global configurations remain untouched.
- See docs/SUPERAGENT.md for implementation boundaries and referenced projects.

## 0.9.2 — Application icon

- Replace the default Electron icon with an original mint anime companion and coding-bracket mark.
- Add macOS ICNS, Windows ICO, runtime Dock/window icon, sidebar branding and favicon.
- Keep the source artwork, generation prompt and reproducible packaging script in the repository.

## 0.9.1 — Automatic connection

- Automatically connect the selected local backend on startup.
- Remember and restore each backend’s last project; explain missing directories.
- Coalesce overlapping connection attempts.

## 0.9.0 — Local agent and character studio

- Codex inherits login-shell exports and can inherit native sandbox/approval settings.
- Dynamic model/effort picker; overrides stay in app preferences and thread parameters.
- Character profiles, voice rules, image-generation candidates, review and local recovery inspired by Mori.
- Redesigned settings navigation, workbench and dialogue surfaces.

## 0.8.0 (local development build)

- Add native Claude Code as a selectable programming backend while retaining Codex.
- Inherit login-shell exports and native Claude configuration without permission-mode, network or timezone overrides.
- Route live tool approvals and user questions through the desktop UI; preserve actual tool records and native session resume.
- Translate/polish inputs into English and replies into Chinese through independent subscription-authenticated Codex calls.
- Preserve original/sent/translated text, protect code fragments, and handle translation failures and cancellation explicitly.
- Add backend/translation settings, local Claude history, focused regression tests and real source/UI verification.
- Record limitations and platform evidence in docs/CLAUDE.md; no remote release or CI pass is claimed.

## 0.7.0

- Add protected Furina, Nahida, Kaguya and Iroha Sakayori presets alongside original Rin and custom uploads.
- Use real-world Kaguya/Iroha appearances, with eight transparent pose images per character.
- Add distinct first-person personality instructions, three-language greetings and character-specific local touch reactions.
- Reset active conversation selection and stale dialogue on character changes; retain saved Codex threads and gate switching during work/approvals.
- Preserve custom copies when editing any bundled preset and retain existing libraries on upgrade.
- Add preset migration, image, switching, persistence and real Codex file-reading checks.
- Document unofficial fan-art provenance and underlying character rights separately from the code license.

## 0.6.0

- Add native macOS backend discovery for Finder/Dock launches, standalone installs, Homebrew paths and common app bundles.
- Validate executable permissions and native Mach-O headers; support symlinks without launching npm or shell wrappers.
- Remove Windows-only executable filtering and translate platform-neutral controls into all three languages.
- Add Apple Silicon and Intel DMG/ZIP packaging with ad-hoc signing and architecture-specific native libraries.
- Isolate a pinned ONNX Runtime 1.23.2 compatibility dependency for Intel Mac; keep 1.31.1 for Windows/Apple Silicon.
- Run Intel Mac background removal in a separate utility process to isolate native cancellation and failure from the desktop UI.
- Add macOS CI for unit tests, native CPU inference, source UI, real unauthenticated Codex handshake, background removal and packaged application checks.
- Document Mac installation, first launch, architecture selection, permissions and troubleshooting.

## 0.5.0

- Default to character-side visual-novel dialogue with a nameplate and progressive text.
- Keep a compact free-text input directly below the dialogue, without preset response choices.
- Keep task status, errors and page navigation outside the speech bubble; preserve session drafts between layouts.
- Separate local page navigation from messages that actually start a Codex task.
- Preserve original streamed text, full history, tools, diffs, explicit approvals and interruption.
- Prevent previous replies from appearing as progress for a newly started task.
- Add persistent bubble/chat layout selection and Chinese, English and Japanese copy.
- Cover exact Unicode pagination, UI behavior and real Codex file reading through the bubble composer.

## 0.4.0

- Add charge-controlled platform hopping with landing preview, center bonuses and perfect streaks.
- Add character running with jump/duck controls, ground/flying obstacles and increasing pace.
- Add pause/replay, local best scores, tab-session preservation and automatic focus/approval pauses.
- Render a dedicated eight-frame pixel-art beagle with pixel scenery, independently of conversation portraits.
- Fix original Rin being overwritten by custom image edits: edit a copy and keep a protected template.
- Preserve legacy Rin modifications in custom copies and add Use original Rin.
- Add three-language controls, gameplay checks, character-restoration regressions and real-window demos.

## 0.3.0

- Raise conversation text to 18 px by default, with persistent 14–24 px sizing and stronger contrast.
- Give new/resumed Codex conversations a first-person character voice while preserving execution evidence.
- Add opt-out hair/shoulder/hand reactions, alpha-aware taps, drag separation and reduced-motion support.
- Add an independent, restricted play window with real work/approval status.
- Add a bounded offline character guessing game and six-pair memory game.
- Keep programming turns and approval ownership unchanged while playing or switching windows.
- Translate new controls, reactions and games into Chinese, English and Japanese.
- Validate first-person Rin dialogue with a real Codex file-read/history task.

## 0.2.4

- Add a sticky top-right close button and Escape dismissal to Character and connection settings, preserving unsaved input and returning keyboard focus.
- Prevent empty or almost-erased background-removal results from replacing an image.
- Fall back to a small, locally executed U2NetP model when the anime model fails to retain foreground.
- Restore legacy near-empty processed assignments from their saved originals during startup.
- Add English, Chinese and Japanese controls/messages and document the fallback model's source, checksum and license.
- Validate the previously failing photo locally without committing private artwork.

## 0.2.3

- Fix `spawn codex ENOENT` when Windows desktop launches do not inherit the terminal's PATH.
- Discover native Codex executables in PATH and the desktop app's installation directories.
- Remember successful backend selections and recover when a saved installation path becomes stale.
- Show an actionable missing-backend message in Chinese, English and Japanese.
- Keep native, shell-free launching and ignore events from replaced connections.
- Add discovery tests and a real empty-PATH connection/restart check.

## 0.2.2

- Restore the original Rin sample as a bundled, editable character with eight transparent expressions.
- Install Rin once without replacing existing custom selections, artwork or settings.
- Localize Rin's default display name and preserve user renames and image edits.
- Add real desktop and clearly labeled action-preview screenshots to the English README.
- Fix an approval-state style collision that added a panel behind the character.
- Verify fresh installation, upgrade preservation and restart behavior.

## 0.2.1

- Add optional local automatic background removal for new imports and existing action images.
- Keep original copies and provide one-click restoration.
- Run CPU inference in a cancellable background worker.
- Cache and SHA-256-verify the first-use anime segmentation model.
- Add Chinese, English and Japanese controls/progress/errors for the feature.
- Preserve canvas alignment, existing alpha and RGB colors.

## 0.2.0

- Add user-defined characters with a required idle image and optional per-action images.
- Fall back to idle for every missing action; add clearly labeled, non-executing previews.
- Save image copies, names, personalities, selected character, language and desktop preferences locally.
- Add Chinese, English and Japanese application UI.
- Add character dragging, scaling and four-edge auto-hide with a restore tab and recovery shortcut.
- Keep real Codex streaming, history, tools, diffs and explicit approval boundaries.
- Maintain repository documentation in English.
- Remove the experimental procedural rig, face editor and skin interface in favor of user-supplied images.

## 0.7.0 — in-place update

- Allow ordinary chat without choosing a project; connect automatically on first send and preserve drafts on failure.
- Separate chat and project histories, with an explicit Return to chat control.
- Restrict ordinary chat to read-only, no escalation, disabled shell and disabled inherited integrations.
- Use a dedicated native recovery window alongside the main-window fallback tab.
- Keep a larger, high-contrast recovery tab slightly inside each screen edge.
- Detect dock hover in the native process, so click-through and missing renderer mouse-enter events cannot strand a collapsed character.
- Prevent stale click-through requests from disabling input over the recovery tab; restore input on expansion.
- Restore minimized windows when using the recovery shortcut.
- Add native-hover, inset geometry and four-edge UI regressions.

## 0.7.0 — original character presets

- Add protected Furina, Nahida, Kaguya and Iroha Sakayori presets alongside original Rin and custom uploads.
- Use real-world Kaguya/Iroha appearances, with eight transparent pose images per character.
- Add distinct first-person personality instructions, three-language greetings and character-specific local touch reactions.
- Reset active conversation selection and stale dialogue on character changes; retain saved Codex threads and gate switching during work/approvals.
- Preserve custom copies when editing any bundled preset and retain existing libraries on upgrade.
- Add preset migration, image, switching, persistence and real Codex file-reading checks.
- Document unofficial fan-art provenance and underlying character rights separately from the code license.

## 0.6.0

- Add native macOS backend discovery for Finder/Dock launches, standalone installs, Homebrew paths and common app bundles.
- Validate executable permissions and native Mach-O headers; support symlinks without launching npm or shell wrappers.
- Remove Windows-only executable filtering and translate platform-neutral controls into all three languages.
- Add Apple Silicon and Intel DMG/ZIP packaging with ad-hoc signing and architecture-specific native libraries.
- Isolate a pinned ONNX Runtime 1.23.2 compatibility dependency for Intel Mac; keep 1.31.1 for Windows/Apple Silicon.
- Run Intel Mac background removal in a separate utility process to isolate native cancellation and failure from the desktop UI.
- Add macOS CI for unit tests, native CPU inference, source UI, real unauthenticated Codex handshake, background removal and packaged application checks.
- Document Mac installation, first launch, architecture selection, permissions and troubleshooting.

## 0.5.0

- Default to character-side visual-novel dialogue with a nameplate and progressive text.
- Keep a compact free-text input directly below the dialogue, without preset response choices.
- Keep task status, errors and page navigation outside the speech bubble; preserve session drafts between layouts.
- Separate local page navigation from messages that actually start a Codex task.
- Preserve original streamed text, full history, tools, diffs, explicit approvals and interruption.
- Prevent previous replies from appearing as progress for a newly started task.
- Add persistent bubble/chat layout selection and Chinese, English and Japanese copy.
- Cover exact Unicode pagination, UI behavior and real Codex file reading through the bubble composer.

## 0.4.0

- Add charge-controlled platform hopping with landing preview, center bonuses and perfect streaks.
- Add character running with jump/duck controls, ground/flying obstacles and increasing pace.
- Add pause/replay, local best scores, tab-session preservation and automatic focus/approval pauses.
- Render a dedicated eight-frame pixel-art beagle with pixel scenery, independently of conversation portraits.
- Fix original Rin being overwritten by custom image edits: edit a copy and keep a protected template.
- Preserve legacy Rin modifications in custom copies and add Use original Rin.
- Add three-language controls, gameplay checks, character-restoration regressions and real-window demos.

## 0.3.0

- Raise conversation text to 18 px by default, with persistent 14–24 px sizing and stronger contrast.
- Give new/resumed Codex conversations a first-person character voice while preserving execution evidence.
- Add opt-out hair/shoulder/hand reactions, alpha-aware taps, drag separation and reduced-motion support.
- Add an independent, restricted play window with real work/approval status.
- Add a bounded offline character guessing game and six-pair memory game.
- Keep programming turns and approval ownership unchanged while playing or switching windows.
- Translate new controls, reactions and games into Chinese, English and Japanese.
- Validate first-person Rin dialogue with a real Codex file-read/history task.

## 0.2.4

- Add a sticky top-right close button and Escape dismissal to Character and connection settings, preserving unsaved input and returning keyboard focus.
- Prevent empty or almost-erased background-removal results from replacing an image.
- Fall back to a small, locally executed U2NetP model when the anime model fails to retain foreground.
- Restore legacy near-empty processed assignments from their saved originals during startup.
- Add English, Chinese and Japanese controls/messages and document the fallback model's source, checksum and license.
- Validate the previously failing photo locally without committing private artwork.

## 0.2.3

- Fix `spawn codex ENOENT` when Windows desktop launches do not inherit the terminal's PATH.
- Discover native Codex executables in PATH and the desktop app's installation directories.
- Remember successful backend selections and recover when a saved installation path becomes stale.
- Show an actionable missing-backend message in Chinese, English and Japanese.
- Keep native, shell-free launching and ignore events from replaced connections.
- Add discovery tests and a real empty-PATH connection/restart check.

## 0.2.2

- Restore the original Rin sample as a bundled, editable character with eight transparent expressions.
- Install Rin once without replacing existing custom selections, artwork or settings.
- Localize Rin's default display name and preserve user renames and image edits.
- Add real desktop and clearly labeled action-preview screenshots to the English README.
- Fix an approval-state style collision that added a panel behind the character.
- Verify fresh installation, upgrade preservation and restart behavior.

## 0.2.1

- Add optional local automatic background removal for new imports and existing action images.
- Keep original copies and provide one-click restoration.
- Run CPU inference in a cancellable background worker.
- Cache and SHA-256-verify the first-use anime segmentation model.
- Add Chinese, English and Japanese controls/progress/errors for the feature.
- Preserve canvas alignment, existing alpha and RGB colors.

## 0.2.0

- Add user-defined characters with a required idle image and optional per-action images.
- Fall back to idle for every missing action; add clearly labeled, non-executing previews.
- Save image copies, names, personalities, selected character, language and desktop preferences locally.
- Add Chinese, English and Japanese application UI.
- Add character dragging, scaling and four-edge auto-hide with a restore tab and recovery shortcut.
- Keep real Codex streaming, history, tools, diffs and explicit approval boundaries.
- Maintain repository documentation in English.
- Remove the experimental procedural rig, face editor and skin interface in favor of user-supplied images.
