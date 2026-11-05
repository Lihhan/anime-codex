# 复用评估（2026-11-05）

以各项目 GitHub API 的仓库、LICENSE 和 README 为依据；`pushed_at` 只说明最近推送时间，不能证明质量或未来维护承诺。没有把示例中的第三方角色模型复制进本项目。

| 项目 | 许可证核查 | Windows 与适配程度 | 维护信号 | 本次决定 |
|---|---|---|---|---|
| [openai/codex](https://github.com/openai/codex) | [Apache-2.0](https://github.com/openai/codex/blob/main/LICENSE) | 官方原生 Windows CLI/App Server；本机真实验证 | 2026-11-05 有推送，未归档 | 使用本机独立进程，直接接 JSON-lines 协议，不分发其二进制 |
| [Electron](https://github.com/electron/electron) | [MIT](https://github.com/electron/electron/blob/main/LICENSE)，Chromium 等保留各自 notices | 支持 Windows；在本机 Electron 实测 | 2026-11-05 有推送 | 桌面容器，锁定 45.2.3 |
| [CodexOshi](https://github.com/Chester-chs/CodexOshi) | [MIT](https://github.com/Chester-chs/CodexOshi/blob/main/LICENSE) | README 明确 Windows x64 + Codex 桌面；偏伴侣展示和使用量 | 2026-10-25 推送，未归档 | 可参考状态体验，不适合作为完整代理聊天底座；未复制代码/素材 |
| [TsunderAI](https://github.com/rajatt1616/TsunderAI) | API 无 SPDX，LICENSE 接口未返回文件；不能假定允许复用 | README 描述 VN、Live2D、TTS；Windows 打包支持未独立验证 | 2026-09-16 推送，未归档 | 仅评估交互方向，未复制代码及 Hiyori 模型 |
| [codex-app-sdk](https://github.com/codex-app-sdk/codex-app-sdk) | [Apache-2.0](https://github.com/codex-app-sdk/codex-app-sdk/blob/main/LICENSE) | 第三方 Electron/preload 适配与示例；Windows 完整兼容未独立验证 | 2026-11-05 推送，未归档，接口活跃变化 | 值得后续集成；MVP 直接接官方协议，减少版本耦合 |
| [pixi-live2d-display](https://github.com/guansss/pixi-live2d-display) | [MIT 包装层](https://github.com/guansss/pixi-live2d-display/blob/master/LICENSE)，不代表 Cubism Core/模型许可 | 浏览器/Pixi renderer，可作为 Electron 方案；需单独 Core | 最近推送 2024-08-20，未归档；需验证现代 Pixi/Cubism 版本 | 暂不引入，先用独立 PNG 状态图集 |

本次没有采用官方 TypeScript SDK 的 `exec` 风格路径，因为应用需要客户端处理双向服务器审批。选用官方 [App Server](https://learn.chatgpt.com/docs/app-server) 提供线程、流式事件和请求回复。协议字段另外用本机 CLI 生成类型交叉检查，而非照抄早期第三方示例。

[Live2D 官方发布许可](https://www.live2d.com/en/sdk/license/) 对 Core、发布场景及可扩展应用另有要求。若开放加载用户模型，尤其需要按官方可扩展应用规则确认许可。包装库的 MIT 不覆盖 Core、模型、贴图、动作和声音。不要把网上可下载的模型当作可随仓库再分发的资源。
