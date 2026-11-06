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
