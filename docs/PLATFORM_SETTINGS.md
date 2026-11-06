# Companion settings on Windows and macOS

The 0.8.1 work restores the same companion controls on both platforms. Configuration is local to Anime Codex and does not rewrite Codex/Claude permissions or account settings.

| Control               | Behavior                                                                                                                                                                                                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cursor following      | Native Electron screen coordinates are converted to window-relative DIPs. A bounded horizontal/vertical pose response applies to portraits, chibi and sticker packs. Disabling it, quiet mode, dragging or mini mode resets the pose. Reduced motion suppresses the animated response. |
| Keyboard/mouse rhythm | Optional local count-only helper. Quiet mode stops it; leaving quiet mode restarts it only if the setting is enabled. Disabling the option or quitting stops it.                                                                                                                       |
| Wandering             | The local state machine moves within scaled desktop bounds. Turning wandering off ends an active walk. Menus, chat, tasks, dragging and transitions suspend movement.                                                                                                                  |
| Invitations           | Local invitations require the option and at least 35 minutes between invitations. They do not consume model quota.                                                                                                                                                                     |
| Quiet mode            | Rest pose, no daily bubbles, no gaze response, no rhythm helper or action audio. Existing tasks and original tool/approval records remain available.                                                                                                                                   |
| Action audio          | User-uploaded prerecorded clips, per character/action, with preview, replacement, deletion and volume. Quiet mode and hiding stop playback. Missing slots stay silent.                                                                                                                 |
| Automatic dispatch    | Routes explicit tasks only when enabled and a project is selected. Native permissions and live approval requests still apply.                                                                                                                                                          |

The cursor effect changes the orientation of the supplied artwork. Separate pupil/head deformation requires suitable layered or rigged character assets; the current PNG pipeline supplies finite action frames. Tests substitute cursor positions through the native API and verify both axes, all appearance types and reset behavior. They do not claim a physical mouse-movement test.

## Language and nonintrusive overlay

Chinese, English and Japanese are available throughout the companion and retained workbench. Topmost state is persisted. The default position lock allows dragging while preventing automatic wandering. Panels open beside the same character anchor and can collapse when another window becomes active. [Behavior and validation boundaries](LANGUAGES_AND_OVERLAY.md).

## Prerecorded action audio

Both platforms use local HTML audio playback for user-uploaded recordings. There is no system synthesizer, neural voice model or voice cloning. Clips are independent per character/action, stay local, and are silent when absent. See [upload, preview and playback instructions](ACTION_AUDIO.md).

## Character removal and upgrade

The upgrade performs a one-time retirement of an existing library entry whose exact display name is `柯洁`, `Ke Jie` or `KeJie`. It writes a profile backup under `userData/removed-characters/`, removes the selectable entry and returns an active selection to Rin. Images, conversations, memories and completed task evidence are retained. It does not become a permanent name blacklist. A second one-time repair also recognizes the three exact known legacy photo files when an old copy has been renamed (for example, Rin Custom). It archives that entry without removing genuine custom Rin artwork. Only SHA-256 fingerprints are bundled; the photograph is not included.

Custom entries also have an explicit removal button. Builtin templates are protected. Active conversations/tasks must finish or stop before their character can be removed. Profile backups retain image filenames so recovery is possible without deleting personal history or artwork.

The app uses Electron's single-instance lock per data directory to prevent two new-version processes from independently overwriting the same settings. Quit older versions through the tray/menu-bar before upgrading.
