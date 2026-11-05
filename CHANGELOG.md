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
