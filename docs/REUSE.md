# Reuse evaluation

Checked on November 5, 2026 using project README files, license endpoints and GitHub repository metadata. Recent pushes are maintenance signals, not guarantees of quality or future support.

| Project | License and Windows evidence | Maintenance signal | Decision |
|---|---|---|---|
| [openai/codex](https://github.com/openai/codex) | [Apache-2.0](https://github.com/openai/codex/blob/main/LICENSE); native Windows App Server verified locally | Active on 2026-11-05 | Direct JSON-lines App Server transport; no Codex binary redistributed |
| [Electron](https://github.com/electron/electron) | [MIT](https://github.com/electron/electron/blob/main/LICENSE), with separate Chromium notices; tested on Windows | Active on 2026-11-05 | Desktop container, pinned to 45.2.3 |
| [CodexOshi](https://github.com/Chester-chs/CodexOshi) | [MIT](https://github.com/Chester-chs/CodexOshi/blob/main/LICENSE); README explicitly targets Windows x64 with Codex desktop | Last push checked: 2026-10-25; not archived | Companion/usage display reference, not a full coding-chat backend; no code/assets copied |
| [TsunderAI](https://github.com/rajatt1616/TsunderAI) | No explicit SPDX license or LICENSE file verified; Windows packaging not independently tested | Last push checked: 2026-09-16; not archived | Considered for interaction concepts only; no code or Hiyori model copied |
| [codex-app-sdk](https://github.com/codex-app-sdk/codex-app-sdk) | [Apache-2.0](https://github.com/codex-app-sdk/codex-app-sdk/blob/main/LICENSE); third-party Electron adapters, Windows compatibility not independently tested | Active on 2026-11-05 | Possible future integration; direct official protocol keeps this MVP's dependency surface smaller |
| [pixi-live2d-display](https://github.com/guansss/pixi-live2d-display) | [MIT wrapper](https://github.com/guansss/pixi-live2d-display/blob/master/LICENSE); requires separate Core and model licenses | Last push checked: 2024-08-20; not archived | Not bundled; compatibility needs verification before adoption |

The official [App Server interface](https://learn.chatgpt.com/docs/app-server) was selected for client-managed approvals, real thread history and streamed events. Local CLI-generated protocol types were inspected to cross-check the implementation. This avoids treating a third-party chat wrapper as proof of actual tool execution.

The current renderer uses local action images: the bundled original Rin sample or user-supplied artwork, with explicit idle fallback. It requires no avatar SDK, generated model or character-service account. Imported artwork remains subject to its own permissions.

For a future Cubism renderer, review the separate [Live2D SDK publication requirements](https://www.live2d.com/en/sdk/license/), particularly user-extensible applications. Neither a wrapper license nor a downloadable sample model is blanket permission to redistribute Core, artwork, motions, textures or voices.
