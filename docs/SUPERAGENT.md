# Desktop companion / Superagent — 0.10.0

This release changes the default surface from a coding workbench to a resident desktop companion. Existing character preferences, character drafts, Claude conversations and Codex threads are preserved. New companion records live in `userData/companion/`.

## What runs where

- The companion brain uses a separate text-only Codex subscription call. Shell, applications, hooks, computer/browser tools, MCP and delegation are disabled for this child only. It receives the active persona, recent conversation, confirmed memories, retrieved older messages, a fallible rolling summary and task status.
- Worker tasks use the existing native Codex app-server or Claude CLI adapter, with the login-shell environment and native permissions. No global config, proxy, TZ, account or system prompt files are changed. Tasks carry their original project, engine, model choices and thread ID.
- Up to two projects can execute concurrently. Tasks in the same canonical project directory are serialized. Chat continues independently. After an interrupted application session, tasks are shown as interrupted and require an explicit continuation, avoiding silent replay of external operations.
- Results retain native output and tool evidence. A separately configured, user-authored check command can be rerun in the project using the inherited environment. Passing that command is shown as a check pass, not universal correctness. Without a command, results remain unverified.
- Native permission requests appear on the task card. Only live, single-use answers are forwarded. Unknown requests cannot grant permissions.

## Memory and history

`history.jsonl` is append-only conversation history with character IDs, timestamps and result provenance. Recent messages are supplied with bounded excerpts; older messages are retrieved by lexical matching (including Chinese bigrams). This is local lexical retrieval, not semantic vector search. Original messages remain searchable.

Confirmed memories can be edited, forgotten or shared across characters. Model suggestions are displayed for confirmation and excluded from confirmed memory until accepted. Every 24 new messages, an optional-on-use background consolidation creates a rolling summary with a source cursor. The summary is identified as fallible and does not replace the raw history. Summarization uses subscription calls; local movement and invitations do not.

`state.json` is atomically replaced through a serialized writer. Native worker history remains owned by its adapter/runtime. This release creates and resumes managed threads; it does not take over arbitrary active threads in other official applications.

## Desktop life and UI

- Independent resident transparent window and menu-bar access; closing a panel leaves the character present. Hide and quit are distinct.
- Restyled light, mint/ivory conversation panel with separate Tasks, Memory, Life and Settings tabs; model and effort are visible in Settings and linked from task creation.
- Local wandering, breathing, resting, touch reactions, task activity poses, cursor following, mini companion mode and occasional invitations. Idle detection uses system idle time. Quiet mode suppresses ambient bubbles.
- Optional global keyboard/mouse rhythm on macOS uses a small CoreGraphics event-counter helper. It reads aggregate event counts only, not key codes, entered text, clipboard or window titles. It is off by default and compiled on first enable with the local Swift toolchain. Helper lifetime follows the app. No global input hook is installed.
- 20-second catch-the-star game plus the existing arcade room. Optional system speech reads new assistant replies.
- Existing character generation studio and persona editing remain available. Current animation uses the existing action images with transforms; it is not a Live2D rig or newly generated frame-by-frame walk cycle.

## File feeding

Drop ordinary files on the character or select them in Life. A preview lists exact paths. After confirmation the main process checks file metadata, copies a recovery version into a private local directory, journals the operation, and calls Electron's system Trash API. Success animation follows actual completion.

Limits: 20 files, 50 MiB per file, 100 MiB per batch. Directories and symlinks are rejected. Recovery copies use owner-only file permissions. Restore copies back with exclusive-create semantics and never replaces an existing pathname. The system Trash copy remains in Trash; the app does not manage or empty Trash. Recovery copies currently remain in `companion/recovery/` and consume disk until manually managed. Original ACLs, extended attributes and full filesystem metadata are not guaranteed by the recovery copy; content bytes are tested.

This release supports drag-to-feed. Walking precisely to an existing Finder icon, true Finder Put Back integration, and reversible folder cleanup are not implemented.

## Open-source references and integration decisions

All implementations in this release were written locally; no new upstream source or art was copied. References informed architecture and interaction design. This is not installation of eight entire upstream applications.

| Reference | Design used here | Upstream boundary |
| --- | --- | --- |
| [AIRI](https://github.com/moeru-ai/airi) | Persistent main character, background task notices, persona-specific memories, local automation triggers | Not importing its Live2D/VRM, game bots, server or cloud sync |
| [Agent Pet](https://github.com/WindyWin/vpet-agent-pet) | Autonomous movement/rest, urgent task state above ambient activity, interruptible interactions | Qt implementation and separately licensed artwork are not copied |
| [Claw Orchestrator](https://github.com/Enderfga/claw-orchestrator) | Persistent native worker sessions, recovery state, task/check distinction | Existing local adapters retained; no gateway installation |
| [Letta Code](https://github.com/letta-ai/letta-code) | Explicit memories, searchable raw history, background consolidation | Local JSON/JSONL storage here, not MemFS/cloud/self-modifying harness |
| [CodePet](https://github.com/nokryong/CodePet) | Mapping task records to native session IDs and resuming them | No account switcher or proxy installation |
| [DeskPet-Furina](https://github.com/Ice-teapop/desktop-pet) | Desktop tool outcomes coupled to character reactions, system Trash | No upstream art, state machine implementation or direct-tool brain copied |
| [VPet](https://github.com/LorisYounger/VPet) | Feeding, life activities and interaction feedback | No WPF code or VUP animation assets copied |
| [BongoCat](https://github.com/ayangweb/BongoCat) | Cursor-following character and input-rhythm feedback | No Live2D models, global key contents or Tauri runtime imported |
| [Clawd on Desk](https://github.com/rullerzhou-afk/clawd-on-desk) | Task/approval cues, compact companion mode, local recap | AGPL source and separately reserved artwork are not copied; no auto-installed hooks |

The earlier Mori-derived candidate directions and license attribution remain in place. See THIRD_PARTY_NOTICES.md.

## Acceptance

Run `npm test`, `npm run build`, `node scripts/smoke-companion.mjs`, and `node scripts/smoke-companion-real.mjs`. The real smoke consumes local Codex/Claude subscription usage, creates disposable project files, and trashes/restores only its own test snack. Artifacts and evidence live in `test-results/`.
