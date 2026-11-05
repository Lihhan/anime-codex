# Anime Codex

A transparent Windows desktop programming companion powered by the **real Codex App Server**. Upload your own character images, talk naturally, and watch the character change expression as Codex actually works.

**UI languages:** Simplified Chinese, English and Japanese, selectable from the desktop toolbar. The preference is saved locally. Repository documentation is maintained in English.

## Meet Rin

**Rin is included in the character library and selected on a fresh install.** Her calm, warm personality and eight original expressions work with the same action-image system as your own characters. Upgrading adds Rin without replacing your selected character, images or settings. You can switch characters, customize Rin, or upload someone entirely different.

![Rin in the actual transparent desktop app](docs/images/rin-desktop.png)

Actual application capture, with no project connected. The surrounding area is transparent; the chat panel is optional. This is the welcome screen, not a claimed task execution.

![Rin action previews: thinking, working, waiting for approval and success](docs/images/rin-actions.png)

These are the application's explicitly labeled **Preview** states. Real task states follow Codex events. Speaking reuses the listening image; interrupted reuses idle. See [artwork provenance](characters/ASSETS.md).

## Your character, your images

**One idle image is enough.** Upload an idle portrait to create a character. Every other image is optional: any action without its own image automatically uses the idle image.

| Action | When it appears |
|---|---|
| Idle | Ready, with no active task |
| Listening | You are typing |
| Thinking | Codex begins a turn or continues reasoning |
| Reading | Structured read/search activity |
| Working | Commands or file modifications |
| Awaiting approval | A server request needs your decision |
| Speaking | A streamed reply, or optional TTS playback |
| Success | The server completes a turn |
| Sorry / failure | A failed turn or a disconnected backend |
| Stopped | You interrupt a turn |

Import PNG, JPEG or WebP files separately for the actions you want. Transparent PNG is recommended for a background-free desktop character. Backgrounds are retained by default; optional local AI can remove them. The app does not generate characters, rig them or change their facial artwork. There is no Face Studio or procedural skin mode.

In **Settings → Character library**, create another character, rename it, edit its personality, replace individual images or restore an optional action to idle fallback. Preview is clearly labeled and does not execute a task. Files are copied locally, not uploaded to Codex or GitHub. See [character setup](docs/CHARACTERS.md).

## Local automatic background removal

Enable **Automatically remove background on import** in Character library, or click **Remove background** for an image you already imported. Each action keeps its own original copy; **Restore original** returns to that copy. Removing a background changes alpha only, preserving RGB colors, dimensions and alignment. If processing fails or is cancelled, the current image remains unchanged.

The first operation downloads a pinned 176,069,933-byte Anime Segmentation model (about 168 MiB), verifies SHA-256, and caches it under the application's local `models/` directory. Later operations work offline. Character images are never uploaded, and image processing does not require Codex login or consume Codex quota. Download/inference progress can be cancelled. Processing runs in a background CPU worker so the desktop UI remains responsive.

The model is optimized for anime illustrations. Inspect fine hair and complex backgrounds; restore the original if you prefer it. Already-transparent pixels remain transparent. Original source files are never overwritten. Model/runtime sources and licenses are in [third-party notices](THIRD_PARTY_NOTICES.md).

## Desktop behavior

- Drag the character or the dotted toolbar handle to move it.
- Resize with minus/plus, the Settings slider, or Alt + mouse wheel (50–180%).
- Drag near any screen edge to collapse to a small tab; hover over or click it to restore.
- Pending approvals prevent hiding; a new approval request automatically reveals the UI.
- Toggle always-on-top and transparent-area click-through. `Ctrl + Alt + A` reveals the overlay and restores mouse input.
- Position, scale, selected character, action images, personality, auto-hide and language survive restarts.

## Real Codex capabilities

The application uses the official `codex app-server --listen stdio://` transport. It preserves streamed replies, persistent threads, tool activity, command output and exit codes, progress, diffs and one-time permission approvals. It displays original Codex text rather than rewriting execution results through a separate character model.

A success image means the server completed the turn; it does not guarantee that all tests passed. Failures, unsupported requests and unverified results remain visible. The character's presentation never grants permissions or substitutes for actual execution evidence.

## Run on Windows

Recommended: Windows 11 x64, Node.js 24 with npm, Git, and an installed official Codex CLI or the native `codex.exe` from Codex desktop.

```powershell
codex --version
codex login
git clone https://github.com/Lihhan/anime-codex.git
cd anime-codex
npm ci
npm run build
npm start
```

The repository is private, so cloning requires GitHub access. Use `npm run dev` for development. If Electron's runtime was not downloaded, run `node node_modules/electron/install.js`.

A packaged `Anime Codex 0.2.3.exe` runs without Node/npm but still requires your local Codex installation and login. This is an unsigned development build; it bundles neither Codex nor credentials. Packages are written to `release/v0.2.3/`.

## First use

1. Pick Chinese, English or Japanese on the bottom toolbar.
2. Start with Rin, or open **Settings → Character library → New character from idle image** to upload your own character. Optional action images can be added later. Rin remains available in the character selector.
3. Click **Connect to Codex and choose project** above the composer. Select the folder you want Codex to work in. Opening the official Codex app alone does not connect this client.
4. Send a message. **Show workspace** exposes threads, progress, raw events, command records and diffs.
5. Read every approval's original command, directory and reason before deciding.

Read-only is the default. To allow edits, choose **Project write** in Settings before starting a new conversation. This permits changes within the selected folder without approving every file; Codex still enforces sandbox and organization policies. Reselect the project and start a new conversation to change permission mode.

The app resolves a native `codex.exe` from an explicit selection or `CODEX_PATH`, a remembered successful connection, PATH, or the Codex desktop installation under `%LOCALAPPDATA%\OpenAI\Codex\bin\<version>\codex.exe`. Desktop discovery works even when launching from Explorer supplies no Codex PATH entry. A successful selection is saved locally; if that saved file disappears after an update, automatic discovery runs again.

If automatic discovery fails, open Settings and use **Choose codex.exe and connect**. `CODEX_PATH`, when set, must be a valid absolute native executable path; an invalid explicit configuration is reported instead of silently ignored. A `codex.cmd` npm wrapper is not the native backend and is not launched through a shell. The app never searches the selected project folder for a backend executable.

## Language and local data

The language selector translates application controls, settings, action labels, local errors and native picker titles. It also sets the response-language preference for new/resumed Codex conversations and the preferred system TTS language. Existing replies, tool output, code, diffs and server-supplied requests remain verbatim. Changing language mid-turn does not rewrite that turn's instructions.

Preferences and copied images live in `%APPDATA%\anime-codex\`. Uploaded images are never sent to Codex or GitHub; your chosen name and personality are included in conversation instructions. Windows voices vary by installation. TTS is optional; image switching is not phoneme-accurate lip synchronization.

## Test and package

```powershell
npm test
npm run build
npm run smoke:ui
npm run smoke:customization
# Real handshake/account read with an empty PATH, including restart persistence:
npm run smoke:connection
# Optional real local AI check (downloads the model if missing):
$env:RUN_REAL_BACKGROUND = '1'
npm run smoke:background -- path/to/character.png
$env:RUN_REAL_CODEX = '1'
npm run smoke:backend
npm run smoke:desktop
npm run dist:win
```

Real-backend tests use your Codex quota. They operate on disposable fixture directories. UI-only action/approval events are explicitly marked test fixtures, not claimed execution results. UI tests use isolated application data directories and do not change your own character library.

See [validation evidence](docs/VALIDATION.md). Windows Actions checks run unit tests, the production build, UI/customization checks and dependency audit. A local pass does not claim that an uninspected remote Actions run passed.

## Boundaries and implementation

Electron main owns the Codex subprocess, native file pickers, validated imports, persistent settings and desktop layout. The renderer has no Node access. Context isolation, renderer sandboxing, CSP, navigation blocking and fixed IPC endpoints remain enabled. Approvals must match a live request ID; there is no permanent or automatic approval path and no silent full-access retry. Advanced permission grants and MCP elicitation currently support conservative refusal only.

The UI uses image crossfades and subtle presentation motion. It does not include a deformable avatar rig, Live2D/Core runtime, face editor, automatic portrait rigging, speech input or emotional voice synthesis. Optional action images are your own artwork; one idle image remains sufficient for every task state.

## License and repository

Code: MIT. Dependencies retain their own licenses. Rin's original AI-generated sample artwork has a [provenance record](characters/ASSETS.md). Your imported images are not relicensed by this project. See [reuse evaluation](docs/REUSE.md).

Repository: [Lihhan/anime-codex](https://github.com/Lihhan/anime-codex), private, default branch `main`. Do not commit personal images, application data, `test-results/`, credentials, `.env` or local Codex settings.
