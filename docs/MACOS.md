# macOS 0.8.1

Follow the [Mac installation steps in README](../README.md#install-on-a-mac). Download the DMG matching Apple Silicon or Intel, drag the app into Applications, and quit older copies before opening it.

The minimum configured OS is macOS 14. Release validation is performed on macOS 15 runners; this is not a claim that every macOS 14 configuration was physically tested. Builds are ad-hoc signed and not notarized. Follow Apple's [verified-app first-launch instructions](https://support.apple.com/en-us/102445) if Gatekeeper blocks a trusted download; do not disable Gatekeeper.

The app discovers native Codex from the inherited environment, `~/.local/bin`, Homebrew and supported app bundles. Install and sign in to Codex separately; Claude Code is an optional task worker. The default companion's ordinary chat does not require a project. Choose a folder only for worker tasks.

The optional global input rhythm counter is precompiled and included in architecture-matched packages. Using a downloaded app does not require Swift or Xcode. Source packaging does require Xcode Command Line Tools. The helper uses aggregate CoreGraphics event counters, never key identities or typed text, and stops when the app exits or disappears.

Press **Command+Option+A** to recover a hidden character. The tray/menu-bar menu distinguishes temporarily hiding from quitting. Character images, memories and preferences remain in `~/Library/Application Support/anime-codex/` across upgrades.

For architecture-specific tests and remaining limits see [validation](VALIDATION.md).

User-uploaded action recordings use the same local playback and independent character slots as Windows. No speech engine or voice model is required. See [action audio setup](ACTION_AUDIO.md).
