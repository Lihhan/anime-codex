# Windows and macOS 0.8.0 port

The current companion preview from `feature/claude-translation` is integrated with the latest `main` fixes and released as 0.8.0. The former 0.18.x numbers identify development milestones, not a separate published release.

## Windows changes

- Native Claude discovery handles case-insensitive Windows `Path`, quoted directories and the native installer directory. It rejects shell/npm wrappers.
- User-authored task verification uses the native command processor, without interpolating project paths into command text. Mac retains its configured shell.
- Background native CLI/helper processes are hidden on Windows.
- The opt-in Windows input counter installs low-level event callbacks inside a hidden, in-memory .NET helper hosted by Windows PowerShell. Callbacks count message categories and never dereference keyboard/mouse event payloads. The app accepts only bounded numeric counts. Closing the pipe or stopping the helper removes it; Windows also removes its callbacks when the process terminates.
- Mac packages include a precompiled, architecture-matched CoreGraphics counter. No Swift installation is required on an end user's Mac.
- Native edge recovery and project-free Codex chat from main are retained. Companion chat and native workers remain separate.
- Legacy UI checks explicitly select the workbench surface and navigate its current settings tabs. Default-package checks exercise the actual current companion instead.

Privacy, native permissions, live single-use approvals, original tool evidence and configured-check outcomes remain distinct from character animation and local reactions. The input counter is off by default, runs locally, and does not consume model quota.
