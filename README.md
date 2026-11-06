# Anime Codex 0.8.1

A transparent desktop character companion for **Windows x64 and macOS 14+**. Chat with a consistent character, keep local memories, and delegate actual programming tasks to your installed **Codex or Claude Code**.

The refreshed **0.8.1** download also removes renamed copies of the retired legacy photo while preserving genuine custom characters. Quit older running copies before opening the refreshed EXE.

Version **0.8.1** adds complete animated sprite packs for Rin, Nahida, Kaguya, Iroha and Elysia, restores companion settings on Windows, and lets you upload prerecorded action audio. Furina retains her existing pack. Project-free chat and native permissions remain available on both platforms.

## Download

Sign in to GitHub with access to this repository, then open **[0.8.1 downloads](https://github.com/Lihhan/anime-codex/releases/tag/v0.8.1)**.

| Your computer                           | File                                                                                                                          |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Windows 10/11, Intel or AMD x64         | [Anime-Codex-0.8.1-win-x64.exe](https://github.com/Lihhan/anime-codex/releases/download/v0.8.1/Anime-Codex-0.8.1-win-x64.exe) |
| Apple Silicon Mac (M-series), macOS 14+ | [Apple Silicon DMG](https://github.com/Lihhan/anime-codex/releases/download/v0.8.1/Anime-Codex-0.8.1-mac-arm64.dmg)           |
| Intel Mac, macOS 14+                    | [Intel DMG](https://github.com/Lihhan/anime-codex/releases/download/v0.8.1/Anime-Codex-0.8.1-mac-x64.dmg)                     |

Mac ZIP alternatives and `SHA256SUMS.txt` are on the same page. **The application downloads do not require Node.js, npm, Git, Swift or a .NET SDK.** Choose the application file for your computer; source ZIPs are for developers.

A GitHub 404 usually means you are signed out or your account lacks repository access.

## Install on Windows

1. **Prepare Codex once.** If you already use the signed-in official Codex desktop app on this Windows computer, keep that installation. Otherwise install and sign in using the [official Windows guide](https://developers.openai.com/codex/app/windows/) or [Codex CLI guide](https://developers.openai.com/codex/cli/). A backend installed only inside WSL is not a native Windows backend for this app.
2. **Close an older Anime Codex instance.** Use its tray menu to quit, rather than only closing a panel.
3. **Download `Anime-Codex-0.8.1-win-x64.exe`** from the release page. Save it in a permanent folder such as `Documents\Anime Codex`.
4. **Double-click the file.** It is portable: there is no installation wizard. Wait for the character and first-run guide to appear.
5. **Hover over the character and click Chat (`聊天`).** Type below the bubble. Ordinary conversation does not require choosing a project.

This development executable is unsigned. If Windows displays an unknown-publisher warning, verify the repository and checksum before using the launch options offered by Windows; follow your organization's software policy.

To start again later, open the same EXE. Your characters, memories and settings are stored separately, so replacing the EXE does not erase them.

## Install on a Mac

1. Install and sign in to native Codex using the [official CLI guide](https://developers.openai.com/codex/cli/). Confirm that a normal Terminal session can use your account.
2. Open **Apple menu → About This Mac** and choose the matching Apple Silicon or Intel DMG above.
3. Open the DMG, drag **Anime Codex.app** into **Applications**, then eject the disk image.
4. Quit an older Anime Codex instance and open the new app from Applications.
5. Hover over the character, click Chat (`聊天`) and type below the bubble.

These development packages are **ad-hoc signed and not Apple-notarized**. If macOS blocks a verified download, follow Apple's [first-launch instructions](https://support.apple.com/en-us/102445). Do not disable Gatekeeper. The optional key/mouse counter is precompiled for the matching architecture; an installed Swift toolchain is not required to use the downloaded app.

## Use the companion

- **Chat:** hover over the character and click `聊天`. The character's conversational brain uses your local Codex login. It can keep talking while a worker task runs.
- **Tasks:** click `任务` → `交给我一件事 ↗`, choose the intended project folder, select Codex or Claude Code, then enter the task. Workers keep actual native sessions, tool records, output, progress and live approval requests.
- **Programming workbench:** right-click the tray/menu-bar icon and choose `编程工作台`. Choose `桌面伙伴` to return. Finish or stop any active workbench task before switching.
- **Settings:** click `设置` → `角色、模型与更多设置 ↗`. Select characters, appearance, personality, models/effort and companion behavior here.
- **Memory:** use the full panel's `记忆` tab. Suggested memories require confirmation; confirmed memories can be edited or forgotten. Original conversation history remains available separately from summaries.
- **Keep the character visible:** full Settings includes **Keep character on top** and **Keep position (dragging is still allowed)**. Both start enabled. Panels open beside the character; transparent image areas pass clicks through. By default, switching to another window collapses app panels while leaving the character visible. You can disable that preference.
- **Move and resize:** drag the character and use the quick size slider. Settings includes idle motion, wandering, quiet mode and uploaded action audio.
- **Mini mode:** quick Settings → `收成小挂件`; click the mini character's expand control to return.
- **Hide versus quit:** closing a panel leaves the companion running. Use the system tray/menu-bar icon to show, temporarily hide or quit it.
- **Recover a hidden character:** press **Ctrl+Alt+A** on Windows or **Command+Option+A** on Mac. The retained workbench also has a separate native edge-recovery tab.

The companion, workbench and games support **中文 / English / 日本語**. Open full Settings → **Language** to switch; the choice is saved and shared across app windows. Controls, tutorials, local reactions, progress/error labels, action-audio settings and native app menus follow the selection. New replies and generated profiles use that language; original chat history, user content, code, native output, diffs and approval payloads keep their original text. [Language and overlay details](docs/LANGUAGES_AND_OVERLAY.md).

### Global keyboard and mouse rhythm — Windows and Mac

Open full Settings and enable **`跟随全局键鼠节奏（只读取计数）`**. The character reacts to overall typing/click rhythm across the ordinary desktop. This is **off by default** and runs locally without model calls.

Both implementations send only aggregate `keys` and `clicks` counts to the app. They do not inspect or save key identities, typed text, clipboard data, cursor coordinates or window titles. Windows uses an in-memory .NET helper hosted by the built-in Windows PowerShell; Mac uses a bundled CoreGraphics counter. No administrator rights, keyboard-remapping driver, startup service or separate SDK is installed. Turning the option off or quitting stops the helper. The helpers also stop when their owning process disappears.

Protected desktops and organization restrictions may limit native input monitoring. Startup failures are reported; the app does not change Windows security or execution-policy settings.

### Your own action audio

Open full Settings, select a character, then find `自己的动作语音包`. Upload a recording beside an action, click Preview (`试听`), and enable `播放我上传的动作语音`. Each character saves its own recordings; missing actions stay silent. Files stay on this computer. No voice model or synthesized voice is used. [Step-by-step audio instructions](docs/ACTION_AUDIO.md).

### Codex and Claude Code

Codex is required for the companion brain, memory consolidation, character research/generation and optional independent translation. Claude Code is an **optional programming worker**; it does not replace the companion brain's Codex login.

For Claude tasks, install and sign in to **native Claude Code on the same OS** using its [official setup guide](https://code.claude.com/docs/en/setup). On Windows, use native `claude.exe`, not an npm `claude.cmd` wrapper or a WSL-only installation. The app checks PATH and `%USERPROFILE%\.local\bin\claude.exe`; an explicit executable can be chosen in workbench settings. Restart the app after changing exported environment variables.

Worker tasks inherit the selected native CLI's configuration and permissions. The app does not silently replace those rules with full access. Review live approvals before accepting. A worker's completion is distinct from verification: a separately configured check command must actually pass before it is marked checked. Windows checks run with the native command processor; Mac checks use the user's shell.

In the retained Claude workbench, independent translation can polish input into English and translate Claude's reply into the selected interface language using separate Codex subscription calls. Original/sent/translated text remains inspectable, and fenced/inline code is preserved byte-for-byte. Translation uses additional Codex quota and latency; it can be disabled. No CLI credentials are bundled or copied into the app. [Claude integration details](docs/CLAUDE.md) · [Companion architecture](docs/SUPERAGENT.md).

### Characters and artwork

Rin, Nahida, Kaguya, Iroha and Elysia each include seven validated animation sheets (112 poses) produced through the existing character pipeline. Kaguya and Iroha use their everyday designs. Custom image uploads, optional action images and idle fallback remain available. Uploading a new picture selects the portrait appearance so your picture is visible. Furina's sticker appearance includes activity transitions; PNG actions are not a Live2D rig. Character research and portrait generation depend on the native account's actual tool availability and report failures instead of substituting fabricated artwork or results.

Franchise presets are unofficial fan interpretations. The code's MIT license does not grant franchise character rights. See [fan-art provenance](characters/FANART.md), [original Rin provenance](characters/ASSETS.md), [third-party notices](THIRD_PARTY_NOTICES.md), and [character production](docs/AUTOMATIC_PET_PRODUCTION.md).

### File feeding

File feeding requires a preview and explicit confirmation. Only then does the app make a recovery copy and move the selected regular files to the system Trash/Recycle Bin. It does not silently clean directories or empty the Trash. Restoration refuses to overwrite an existing file. [Limits and storage](docs/SUPERAGENT.md#file-feeding).

## Troubleshooting

| Problem                                 | What to do                                                                                                                                                                                                |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nothing appears                         | Wait for portable extraction, check the tray/menu-bar icon, then use the recovery shortcut. Quit older copies.                                                                                            |
| Codex cannot be found                   | Confirm a native signed-in installation exists on this OS. The app also checks supported desktop-install paths. In workbench settings, choose the actual `codex.exe` on Windows or native `codex` on Mac. |
| Chat reports a sign-in or quota error   | Complete sign-in in the official Codex CLI/app and retry. The app preserves actual failures; a local welcome/touch line does not mean a model request succeeded.                                          |
| Claude cannot be found                  | Install native Claude Code, sign in, then restart. Confirm `claude --version` works in a fresh terminal.                                                                                                  |
| Keyboard rhythm cannot start on Windows | Check that built-in Windows PowerShell and .NET Framework are available and permitted by your organization. No execution-policy or security-setting changes are made by Anime Codex.                      |
| A source ZIP contains no EXE            | Download the Windows application asset above, or use the build steps below.                                                                                                                               |

Local data is normally `%APPDATA%\anime-codex\` on Windows and `~/Library/Application Support/anime-codex/` on Mac. Keep that folder to retain your library and memories when upgrading. Personal imports, account data and test reports are excluded from Git.

## Build from source

Use **Node.js 24**, npm and Git. In Windows PowerShell, run these lines one at a time:

```powershell
git clone https://github.com/Lihhan/anime-codex.git
Set-Location anime-codex
npm.cmd ci
npm.cmd run build
npm.cmd start
```

On Mac use `npm` instead of `npm.cmd`. Source dependencies do not install or authenticate Codex/Claude. Quit the app through its tray/menu-bar menu before ending the development terminal.

Build application packages:

```powershell
# Windows x64
npm.cmd run dist:win
```

```sh
# Build on a Mac; Xcode Command Line Tools are needed to compile the bundled counter.
npm run dist:mac:arm64
npm run dist:mac:x64
```

Outputs are under `release/v0.8.1/`. To start the retained workbench directly for development, set `ANIME_CODEX_SURFACE=workbench` before `npm start`; omit it for the default companion.

## Validation

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run smoke:native
npm.cmd run smoke:companion
npm.cmd run smoke:input   # Windows native input-counter lifecycle and check-command test
```

CI builds Windows x64, Mac Apple Silicon and Intel packages. It checks source and packaged companion/workbench UI, native inference, native input helpers and existing safety regressions. Real model-turn tests use subscription allowance and are opt-in; UI fixtures never count as actual execution. See [version-specific validation evidence](docs/VALIDATION.md).

Code: MIT. Repository: [Lihhan/anime-codex](https://github.com/Lihhan/anime-codex).
