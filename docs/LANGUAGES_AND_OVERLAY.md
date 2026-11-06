# Languages and desktop presence

## Choose a language

Hover over the character, open Settings, then choose **Characters, models and more settings ↗ → Language**. The three choices always appear as **中文 / English / 日本語**. In Chinese the path is `设置 → 角色、模型与更多设置 ↗ → 语言`; in Japanese it is `設定 → キャラクター・モデル・詳しい設定 ↗ → 言語`.

The saved selection applies to companion panels, controls, tutorials, local reactions, task/memory/file labels, character creation, uploaded action-audio controls, app error/status messages, tray/app menus, the retained workbench and games. Open game windows refresh their interface without discarding the current game. Builtin character names use their localized forms. Custom names, uploaded filenames and user-written personality settings stay as entered.

The companion reply, task report, future worker instructions and new character research/profile requests use the selected reply language, while respecting an explicit language request from the user. This changes future generation instructions; it does not translate old messages, stored memories, generated drafts, code, diffs, original tool output or approval request payloads. Original quotes in character research remain in their source language. Prerecorded audio is played as uploaded and is not translated or synthesized. Native system file-picker buttons follow the operating system's language; their app-supplied titles follow the app selection.

## Keep the character visible without blocking other apps

**Keep character on top** is enabled by default and saved across restarts. It uses the native topmost window flag. Focusing another app does not call `focus()` on the character window or move the character. Explicitly opening the app, choosing its tray commands or using the recovery shortcut can focus it as a user action.

**Keep position (dragging is still allowed)** starts enabled. Daily animations continue at the same anchor. Automatic wandering starts disabled; enabling wandering turns off the lock, and enabling the lock stops wandering. Opening settings, chat or other companion panels does not shift the anchor. Menus and panels fit around the character rather than relocating it. Changing display geometry or character size can still clamp the anchor to visible bounds.

**Collapse panels when another window is active** starts enabled. Switching windows temporarily collapses companion panels, compact chat and quick menus, leaving the character in place. Returning focus to the app restores the previous panel/chat view; transient quick menus remain closed. Draft input, messages and running tasks stay in memory. Native file pickers are guarded so choosing an image, recording or project does not immediately collapse the calling panel. Turn the preference off to keep panels visible and close them manually. The game window is independent, allowing the character to remain above it.

The character and visible app controls accept clicks. Transparent artwork margins, transparent desktop areas and quick-menu dismissal backdrops pass clicks to the window beneath. A bounded local alpha mask uses the displayed portrait or current sprite cell. Local cursor polling keeps this working when forwarded mouse movement is unavailable. It does not record cursor positions, keystrokes, window titles or desktop content, and makes no model calls.

The implementation uses Electron's [native window and click-through APIs](https://www.electronjs.org/docs/latest/api/browser-window). Standard desktop windows are the target. Secure desktops, protected system prompts, exclusive fullscreen applications and competing system-level overlays can have their own stacking/input rules. The app does not request administrator privileges or change system security settings to bypass those rules.

## Verification

Unit checks cover complete locale keys and interpolation, new UI literals, preserving unknown/native records, selected reply-language instructions, position-lock/wander interaction, transparent pixels, letterboxing and active atlas-cell hit tests. Source and packaged UI checks switch through all three languages and restart, verify stable character coordinates across panels, inspect actual native topmost/focus flags, observe transparent-area ignore settings and check pin persistence. Cursor coordinates are controlled fixtures; those checks do not claim physical OS mouse injection or a live model's linguistic quality. The full native approval policy and original execution records remain unchanged.
