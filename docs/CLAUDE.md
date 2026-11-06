# Local Claude Code and independent Codex translation (0.8.0)

This source build adds a selectable local Claude Code backend. Codex remains available as the original programming backend. No Claude or Codex login credentials are copied into this application.

## Use

1. Install and sign in to native Claude Code and Codex on this computer.
2. Open Settings → Programming backend → Claude Code.
3. Leave **Independent translation · Codex subscription** enabled. A blank translation-model field uses the installed Codex CLI's default model. Save after changing settings; the next message starts a new conversation.
4. Connect and choose your project. Type Chinese normally.
5. Use History to inspect the original input, the English prompt actually sent, Claude's original English, and the Chinese translation. Tool records and approval payloads are verbatim.

The flow is:

```
Chinese input → separate Codex translation/polishing call
             → local Claude Code (actual project work)
             → separate Codex Chinese translation call → character dialogue
```

Codex translation uses the installed CLI and its ChatGPT login, not a paid API-key endpoint and not Claude Code. It consumes Codex usage allowance. Every translated assistant message can require an additional Codex call, with corresponding latency and quota use. Translation can be explicitly disabled. The Settings test button uses two real Codex translation calls.

Code fences and inline code are replaced with unique placeholders and restored byte-for-byte. Missing or duplicated placeholders fail translation. Natural-language translation and polishing remain model-generated; review the actual sent prompt when wording is consequential. Plain-text identifiers, URLs and commands are instructed to remain unchanged, but only fenced/inline code has deterministic preservation.

## Environment and permissions

On macOS, the main process reads exported variables from the user's login interactive shell, then starts the selected native Claude executable directly with that environment and the selected project as its working directory. This supports Finder launches that lack terminal PATH and exports. On Windows the parent environment is inherited. Environment values and credentials are not exposed to the renderer or stored in the application history.

The Claude command only adds structured streaming transport, session identity/resume, permission-prompt routing and appended character/language instructions. It does **not** set a permission mode, skip permissions, set an allow/deny tool list, replace settings sources, disable hooks/MCP, alter HOME or CLAUDE_CONFIG_DIR, or rewrite proxies, API endpoints, certificates or TZ. Claude loads its own user/project/local/managed configuration. No proxy server, tunnel, network listener or timezone setting is installed by this feature.

Claude's live permission requests are shown in the app. An approval returns the original tool input and grants that call only; it never writes a persistent permission rule. AskUserQuestion is supported. Unsupported control requests are shown and can only be refused. Codex's read-only/project-write selector is hidden for Claude, because it does not describe Claude's policy.

This is a new native Claude session, not attachment to a running terminal process. Terminal-session-only approvals, shell aliases/functions that add flags, unexported variables and project-specific shell prompt hooks (such as direnv activation) are not automatically imported. The app cannot prove identical network routing or grant continuity with every terminal invocation. It preserves the native configuration and inherited environment rather than manufacturing equivalent permissions. Native `--print` behavior also differs from the interactive TUI; slash-command and terminal UI parity are not claimed.

## Isolation and failures

Translation runs in a separate empty application directory. Only the Codex translation child receives ephemeral/read-only/ChatGPT-auth configuration, disabled shell, browser, apps, hooks, multi-agent and code-mode-host features, disabled web search, and ignored user/project execution configuration. API-key environment variables are removed from that child to prevent accidental API billing. None of these overrides are applied to Claude. The app stops a translation if it emits a tool-operation item.

Input translation failure never sends the original prompt as a fallback. The input remains in local history with the failed turn. Reply translation failure preserves the original English and labels the failure without changing Claude's reported task outcome. Stop cancels translation and the active Claude process; late translation output is discarded. Partial original replies are retained and labelled if translation is interrupted.

Native Claude sessions remain in Claude's normal store. Application-side display history is stored under `claude-conversations/threads.json` in application data, alongside settings. The app lists its own Claude conversations; importing arbitrary pre-existing CLI history is not implemented. A resumed native session retains its original system-prompt snapshot, so changing character/translation settings starts a new app conversation.

## Verification

Development and real testing on this Apple Silicon Mac used Claude Code 2.1.318 and Codex CLI 0.160.1. Tests include:

- 66 unit tests: exact environment inheritance, absence of permission/network overrides, approvals, user questions, translation failures, cancellation, streaming originals and protected code.
- Production build and existing Gal dialogue regression.
- A real Chinese prompt independently translated by Codex, an actual Claude Read of a randomly marked fixture, independent Chinese reply translation, unchanged fixture and saved original/sent/translated text.
- The same real task through the desktop composer, backend switch blocking during work, settings persistence, switching back to Codex and local history after restart.
- Native Claude `--resume` retaining the prior random marker without reading the fixture again.
- Packaged ARM64 0.8.0 startup/native inference and the real translated UI workflow, including settings/history after restart.
- The default Codex profile used by Finder is signed in with ChatGPT; no API key is required.

Commands:

```sh
npm test
npm run build
npm run smoke:gal
npm run smoke:claude                  # real native connection, no model task
RUN_REAL_CLAUDE=1 npm run smoke:claude-real
RUN_REAL_CLAUDE=1 npm run smoke:claude # actual UI task; consumes both subscriptions
```

Raw local evidence is in ignored `test-results/claude-real.json`, `claude-ui-real.json`, `claude-ui.json` (connection-only), and `claude-native-resume.json`. Windows and Intel Mac have not been revalidated for this new backend. No remote CI pass, release publication, full proxy-route equivalence, or exhaustive hook/MCP compatibility is implied.

References: [Claude CLI](https://code.claude.com/docs/en/cli-reference), [Claude configuration](https://code.claude.com/docs/en/settings), [official control-protocol implementation](https://github.com/anthropics/claude-agent-sdk-python/blob/main/src/claude_agent_sdk/_internal/query.py), [Codex non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode), [Codex authentication](https://learn.chatgpt.com/docs/auth).
