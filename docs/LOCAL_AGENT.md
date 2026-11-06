# Local agent and character studio — 0.9.0

## Codex integration

The programming backend launches the native `codex app-server --listen stdio://` executable directly. Both Codex and Claude now receive exported variables recovered from a new interactive login shell: PATH, HOME, CODEX_HOME if explicitly exported, SSH agent environment, proxy/endpoints and TZ are not rewritten. This is not a copy of another terminal's unexported variables or temporary authorization.

The UI defaults to **inherit native permissions**. In that mode thread/start and thread/resume omit sandbox, approvalPolicy and approvalsReviewer overrides. Existing explicit read-only and workspace-write modes remain available. This can grant full local access if that is already your native Codex configuration; the app does not manufacture or persist broader permission rules. Existing request approvals remain interactive. Client-side tool implementations that only exist inside the official desktop application are not automatically recreated here.

Model catalogs and supported reasoning efforts come from `model/list`. Settings are saved only in Anime Codex preferences. New and resumed threads carry `model` and `config.model_reasoning_effort` when explicitly chosen. Selecting inheritance omits those parameters. Saving clears the selected app thread so the next prompt starts with the new selection. Active work cannot be reconfigured. Original native conversations and global config files are not changed. The workbench shows the effective values returned by the native server.

Official protocol reference: https://learn.chatgpt.com/docs/app-server

## Character studio

Open settings → 角色工作室. Enter a character name, work and optional user-created setting. A separate native Codex session produces a Chinese profile containing summary, appearance, voice rules, avoidance rules, original example dialogue and unknown facts. Profiles are explicitly **model drafts**, not verified canonical research. User-created settings and invented examples are kept separate in the persona prompt.

Generate a static 2D portrait through Codex's actual image generation tool. Choose anime/chibi/pixel style and Mori's balanced/bold/soft direction. Each generation adds a new candidate, retaining previous candidates. Review the 160px preview and full-size view, then explicitly activate a candidate. Activation imports a new character and its voice prompt; built-in characters remain intact. Missing action frames use the idle image. This release does not synthesize or claim animated motion sequences.

Generation requires the native account's image tool to be available. Failures are explicit; the app never substitutes SVG/code placeholders. Images are requested without configuring external paid API credentials. Normal account/tool usage limits still apply. Drafts and candidates are stored under the app data directory's `character-studio/<uuid>/`. Incomplete work can be inspected and retried; restarting does not automatically repeat a model request.

Mori sources inspected: `electron/research.cjs` (draft/source separation), `electron/persona.cjs` (voice rules, user setting separation), `electron/pet-pipeline.cjs` (persisted candidates and explicit activation), `electron/pet-recipes.cjs` and `shared/pet-candidate-directions.json` (candidate directions). Only the direction data is copied; adapted logic uses the existing native Codex backend rather than Mori's API-key service layer. MIT attribution is in THIRD_PARTY_NOTICES.md.

## Validation

`RUN_REAL_CODEX=1 npm run smoke:agent` executes code creation/tests in a unique fixture, read-only SSH to the existing a800-16 alias, and computer-state inspection. It never modifies remote files or clicks/types. Evidence: `test-results/agent-kPsoHS/report.json` and events.json. The actual run passed code tests, SSH and `mcp__cua_repl.js` → `cua.getState()` with 14 applications. Browser inventory reported “browser access host is unavailable”; browser interaction is not covered by this check. A subsequent controlled test verified native mouse and keyboard actions, described below.

`RUN_REAL_CODEX=1 npm run smoke:workbench` drives the real Electron UI, selects model/effort, checks effective native permissions, runs a code task and compares the global Codex config hash before/after. It uses isolated Anime Codex app data and the normal Finder Codex profile, not the developer agent's alternate CODEX_HOME.

`RUN_REAL_CODEX=1 TEST_IMAGE=1 npm run smoke:studio` exercises actual native profile drafting and image generation. Unit tests cover permission inheritance, profile evidence boundaries and invalid job identifiers. No model responses are mocked in the real smoke scripts.

## Verified artifact

Local macOS ARM64 0.9.0 is installed side-by-side at `~/Applications/Anime Codex 0.9.0.app`; the already-running 0.8.0 application was left running. Quit the older application before opening 0.9.0, since both use the same app data. Preferences were backed up before installation.

Real image generation produced two candidates for the original character 小苔. The second candidate includes native `imageGeneration: completed` evidence; the first was retained. A copy of this draft and both candidates is available in the user's character studio without replacing the current character. The packaged UI validated candidate activation and restart persistence in an isolated profile.

Final checks: 70 unit tests, production build, dialogue UI regression, packaged model/effort selection plus actual code execution, and packaged character activation/restart. Evidence: `test-results/workbench-real.json`, `test-results/studio-ui.json`, `test-results/studio-location.json`. These local artifacts are gitignored; the repository does not include account data or generated test sessions.

## Native computer interaction check

`RUN_REAL_CODEX=1 node scripts/smoke-computer.mjs` creates a dedicated local test window. The native Codex computer tool clicked its input, typed `CUA_VERIFIED_42`, clicked Confirm test and read the resulting text; an independent UI assertion verified the exact receipt. Methods included `cua.getApp`, `click`, `typeText`, `pressKey`, and `getAXStateAndScreenshot`. Evidence: `test-results/computer-ui.json` and the referenced events.json. No browser automation or page evaluation was used by the agent to manipulate the fixture.

The first attempt could not resolve a window because several installed app versions share `io.animecodex.desktop`; it stopped without input. The passing test used the exact Electron application path. When asking computer use to operate a specific installed app copy, provide its full path. This is a real local UI test, not an assertion that every possible integration/plugin or browser host is available.

## 0.9.1 automatic connection

Startup now connects automatically to the selected native backend using its saved executable. Per-backend project paths are persisted after directory selection and restored when still accessible; unavailable paths produce a clear prompt to choose again. Connection attempts are coalesced and backend changes are blocked during connection startup. Account authentication remains managed by the native CLI. No task is automatically replayed. Existing versions did not save workspace paths, so the first directory selection after upgrading is required once. Verified first launch, restart restoration, and missing-directory recovery with real native handshakes in smoke-autoconnect.mjs.
