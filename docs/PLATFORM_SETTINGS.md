# Companion settings on Windows and macOS

The 0.8.1 work restores the same companion controls on both platforms. Configuration is local to Anime Codex and does not rewrite Codex/Claude permissions or account settings.

| Control               | Behavior                                                                                                                                                                                                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cursor following      | Native Electron screen coordinates are converted to window-relative DIPs. A bounded horizontal/vertical pose response applies to portraits, chibi and sticker packs. Disabling it, quiet mode, dragging or mini mode resets the pose. Reduced motion suppresses the animated response. |
| Keyboard/mouse rhythm | Optional local count-only helper. Quiet mode stops it; leaving quiet mode restarts it only if the setting is enabled. Disabling the option or quitting stops it.                                                                                                                       |
| Wandering             | The local state machine moves within scaled desktop bounds. Turning wandering off ends an active walk. Menus, chat, tasks, dragging and transitions suspend movement.                                                                                                                  |
| Invitations           | Local invitations require the option and at least 35 minutes between invitations. They do not consume model quota.                                                                                                                                                                     |
| Quiet mode            | Rest pose, no daily bubbles, no gaze response, no rhythm helper or speech. Existing tasks and original tool/approval records remain available.                                                                                                                                         |
| Speech                | Native installed voices, with explicit availability errors, selectable voice, speed/pitch controls and Natural/Soft/Bright presets. Disabling speech or enabling quiet mode stops playback.                                                                                            |
| Automatic dispatch    | Routes explicit tasks only when enabled and a project is selected. Native permissions and live approval requests still apply.                                                                                                                                                          |

The cursor effect changes the orientation of the supplied artwork. Separate pupil/head deformation requires suitable layered or rigged character assets; the current PNG pipeline supplies finite action frames. Tests substitute cursor positions through the native API and verify both axes, all appearance types and reset behavior. They do not claim a physical mouse-movement test.

## Softer system voices

Full Settings provides Natural, Soft and Bright presets, custom speed/pitch sliders, installed voice selection and a preview button. Automatic selection prefers an available female voice for the requested language. Presets modify prosody; they are not original character recordings or neural voice cloning. Quality and pronunciation depend on the installed voice engine.

Windows uses the built-in Windows PowerShell/.NET Framework host with `System.Speech.Synthesis.SpeechSynthesizer`. Text is UTF-8 JSON on stdin and escaped as literal SSML text. Voice names are matched against installed voices; they are never executed. [Microsoft's System.Speech documentation](https://learn.microsoft.com/en-us/dotnet/api/system.speech.synthesis?view=netframework-4.8.1) describes SSML synthesis. Individual engines can interpret prosody differently.

Mac packages include an architecture-matched Swift/AVFoundation helper using `AVSpeechUtterance.pitchMultiplier`, rate and installed `AVSpeechSynthesisVoice` identifiers. [Apple's speech synthesis documentation](https://developer.apple.com/documentation/avfoundation/speech-synthesis) describes these controls. The downloaded application does not require a Swift toolchain. Source development can compile the helper on demand.

Chinese, English and Japanese synthesis require a corresponding OS voice. A missing voice produces an explicit error; install the language voice through normal OS settings and retry/restart. No paid speech API is automatically connected. Speech text is sent only to the local system synthesizer. A successful synthesis result does not establish that a user's physical speakers were audible or that the voice sounds subjectively anime-like.

## Character removal and upgrade

The upgrade performs a one-time retirement of an existing library entry whose exact display name is `柯洁`, `Ke Jie` or `KeJie`. It writes a profile backup under `userData/removed-characters/`, removes the selectable entry and returns an active selection to Rin. Images, conversations, memories and completed task evidence are retained. It does not become a permanent name blacklist.

Custom entries also have an explicit removal button. Builtin templates are protected. Active conversations/tasks must finish or stop before their character can be removed. Profile backups retain image filenames so recovery is possible without deleting personal history or artwork.

The app uses Electron's single-instance lock per data directory to prevent two new-version processes from independently overwriting the same settings. Quit older versions through the tray/menu-bar before upgrading.
