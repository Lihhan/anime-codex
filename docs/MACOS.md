# Install Anime Codex on a Mac

Version 0.7.0 adds native macOS support. Use **macOS 14 or later**. Separate downloads are built for **Apple Silicon (arm64)** and **Intel (x64)**. Build and verification results are recorded in [VALIDATION.md](VALIDATION.md); a CI startup check does not cover every desktop, display arrangement or user account.

## 1. Install and sign in to Codex

Anime Codex is the character interface. It needs a separately installed official Codex backend to answer programming requests.

If you already use a native Codex CLI on this Mac, open **Terminal** and run:

```sh
codex --version
codex login status
```

If you need to install it, follow the [official Codex CLI guide](https://learn.chatgpt.com/docs/codex/cli). The documented macOS installer is:

```sh
curl -fsSL https://chatgpt.com/codex/install.sh | sh
```

Close Terminal and open a new window so the installer's PATH changes take effect. Then run:

```sh
codex --version
codex login
codex login status
```

Complete the browser sign-in when asked. You should see a version followed by a signed-in account status. If Terminal cannot find the command after installation, try `~/.local/bin/codex --version` and `~/.local/bin/codex login`; the official standalone installer's default command location is `~/.local/bin/`. [Official installer locations](https://learn.chatgpt.com/docs/config-file/environment-variables) and [authentication](https://learn.chatgpt.com/docs/auth) explain custom installations and sign-in options.

## 2. Choose the correct download

Open **Apple menu → About This Mac**:

| Your Mac shows | Download under release Assets |
|---|---|
| Chip: Apple M1, M2, M3 or another Apple chip | `Anime-Codex-0.7.0-mac-arm64.dmg` |
| Processor: Intel | `Anime-Codex-0.7.0-mac-x64.dmg` |

Open the [0.7.0 release](https://github.com/Lihhan/anime-codex/releases/tag/v0.7.0), expand **Assets**, then download the matching **.dmg**. The Windows `.exe` and GitHub source archives are not Mac installers. For your own build, use [the source build steps](#build-from-source-on-a-mac).

The repository is private. Sign in to a GitHub account with access before downloading. GitHub may show 404 if you are signed out or lack permission.

## 3. Drag the app into Applications

1. Close any older Anime Codex instance.
2. Double-click the downloaded **.dmg**.
3. Drag **Anime Codex.app** to **Applications**.
4. Eject the mounted disk image in Finder.
5. Open **Finder → Applications → Anime Codex**.

The release also provides an architecture-matched `.zip` as an alternative. Extract it in Finder, move the `.app` into Applications, then open it from there.

### If macOS blocks the first launch

These development packages are **ad-hoc signed, without an Apple Developer ID or notarization**. Ad-hoc signing does not identify a trusted developer to Gatekeeper.

After attempting to open the app, if you trust the repository and downloaded file, follow Apple's [documented first-launch procedure](https://support.apple.com/en-us/102445): **System Settings → Privacy & Security → Open Anyway**, then confirm **Open**. A managed Mac may require administrator approval. Do not disable Gatekeeper. If the warning says the application is damaged, verify the checksum and download again instead of assuming it is only a first-launch warning.

The release's `SHA256SUMS.txt` lists checksums. In Terminal, use `shasum -a 256` followed by a space, drag your downloaded `.dmg` into Terminal to insert its full path, then press Return. Compare the output with the matching filename in the checksum file.

## 4. Connect a project and talk to Rin

1. Rin and a toolbar should appear. Select **English** to match the control names below; Chinese and Japanese are also available.
2. Click **Connect and choose project** below the input area.
3. Select the folder you want help with. You may create an empty folder in Documents for an introductory conversation.
4. Wait for the folder name to appear on the toolbar and the connection prompt to disappear.
5. Type in the input directly below Rin's bubble, then click **Say it** or press Return.

A useful first message is:

> Introduce yourself, then list the files in this project. Do not modify anything.

The default permission is **Read-only**. To allow edits, finish the active task, reselect the project by clicking its folder-name button, then choose **Settings → Permissions for new or resumed conversations → Project write** before starting a new conversation. Real approval requests still need your decision in the main window.

**Shift+Return** inserts a new line. **History** shows full replies, tool records and diffs. Clicking the bubble or **Next page** only changes what you are reading; it never sends another task.

## If connection fails

Finder and Dock launches usually have a different PATH from Terminal. The app also checks `~/.local/bin/codex`, `/opt/homebrew/bin/codex`, `/usr/local/bin/codex`, a configured absolute `CODEX_INSTALL_DIR`, and common Codex/ChatGPT application-bundle resource paths.

1. Open **Settings → Choose Codex executable and connect**.
2. In the picker, press **Command+Shift+G**, enter `~/.local/bin`, and press Return. Select the native `codex` executable. For another installation location, use its directory instead.
3. Close Settings, choose your project using the folder button, then retry your message.

The app remembers a successful executable selection and follows native executable symlinks. It does not start shell scripts, npm JavaScript launchers or Windows `.exe` files on a Mac. If an npm launcher is all you have, install the official standalone CLI above and select its native executable. A missing or invalid explicit `CODEX_PATH` is reported instead of silently ignored.

If Codex is signed out, run `codex login` in Terminal and reconnect. If the command is not on PATH, use `~/.local/bin/codex login` or the absolute path of your native installation. No credentials need to be entered into Anime Codex.

## Desktop controls and local data

- Drag the character to move it. Use **− / +**, the Settings slider or **Option+scroll** to resize.
- Drag near a display edge to collapse the character; hover or click the tab to restore it.
- Press **Command+Option+A** to reveal the overlay and restore mouse input. Another application can reserve the same shortcut.
- Custom PNG/JPEG/WebP character images, idle fallback, original Rin, dialogue bubbles, games, system voices and local background removal use the same application features as Windows. Available system voices depend on macOS.
- Intel builds use a separately pinned ONNX Runtime 1.23.2 compatibility package because recent upstream packages omit Intel Mac native binaries. Each operation runs in a fresh utility process so cancelling native work does not tear down the desktop process or reuse a stale session. Windows and Apple Silicon keep ONNX Runtime 1.31.1. Model files remain pinned, downloaded on demand and processed locally.
- Local settings and copied images normally live in `~/Library/Application Support/anime-codex/`. They are separate from the application bundle. Replacing or deleting the `.app` does not intentionally erase the character library.
- To upgrade, quit Anime Codex, replace the old application in Applications with the newer copy, then reopen it. To remove the app, quit it and move it to Trash; delete the separate application data only if you also want to discard your settings and images.

## Build from source on a Mac

Skip this section if you downloaded a release. Install **Node.js 24 with npm** from [nodejs.org](https://nodejs.org/en/download). Open Terminal, run `git --version`, and complete Apple's developer-tools installation prompt if Git is missing. Use a native Terminal/Node installation for your architecture; do not mix Intel dependencies with an Apple Silicon application.

Run these commands one at a time. Your GitHub account needs repository access:

```sh
git clone https://github.com/Lihhan/anime-codex.git
cd anime-codex
npm ci
npm run build
npm start
```

Keep Terminal open while the source app runs. Complete the Codex installation/sign-in and project selection above to send a real request. If you downloaded a source ZIP instead, extract it and open Terminal in the folder containing `package.json`, then start at `npm ci`.

To make your own installer, build **on a Mac of the matching architecture**:

```sh
# Apple Silicon:
npm run dist:mac:arm64

# Intel Mac:
npm run dist:mac:x64
```

The `.dmg` and `.zip` are written to `release/v0.7.0/`. This project does not claim that a Windows cross-build has verified a Mac application. The GitHub **macOS checks and packages** workflow runs on separate Apple Silicon and Intel Macs, checks source UI/native inference, connects a real unauthenticated Codex App Server without using model quota, builds the packages, then checks the packaged application. Signing/notarization with an Apple Developer ID requires your own Apple credentials and is not configured in this development release.
