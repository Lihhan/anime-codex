# MVP 验收记录

日期：2026-11-05。平台：本机 Windows x64，Node 24，Electron 45.2.3，Codex CLI `0.166.0-alpha.5.1`。下列是实际运行结果，不把 UI 夹具视为代理执行证据。

## 已通过

- 七项 Node 测试：并发工具状态、审批优先级、多审批请求、失败和中断、只读/写入边界、阻止永久授权、JSON-lines 握手/双向请求/UTF-8 分段/错误处理。
- Vite 生产构建。
- Windows 便携版构建成功；最终无背景版本的 `win-unpacked/Anime Codex.exe` 已启动并通过相同 Electron 界面检查。已比对打包内 main、preload、RPC 桥接和角色配置与最终源码一致。
- Electron 界面检查：PNG 加载为 1536×1024，renderer 无 require，context isolation 启用，输入建议，审批弹窗，失败显示，透明页面背景与截图角落 alpha=0。
- 原创透明图集 alpha 检查：RGBA，通道范围 0..254；约 24.1% 像素完全透明，其余包含角色及软边缘。CSS alpha 清理抑制背景残留。
- **真实 App Server**：本机已有登录；在专用测试目录实际读取 `input.txt`、写入 `output.txt`，随机内容逐字匹配。turn 状态 completed，收到 43 个 agentMessage delta；分页历史返回一轮，恢复同一 threadId 成功。底层报告保存在本地未入库的 `test-results/backend.json`。
- **真实桌面完整链路**：Electron UI → preload → main → App Server。通过界面连接、选择测试目录、提交「实际读取 hello.js 并解释 greet」任务，收到了真实工具记录和包含「世界」的回复；恢复所选线程后回复仍存在。脚本 `scripts/smoke-desktop-real.mjs` 实际通过。
- 依赖审计已将构建链中的 minimatch 固定到 11.0.1，最新一次 npm audit 为 0 个漏洞。构建依赖仍可能有弃用提示，不表示应用执行失败。

## 场景性质

`smoke-ui` 的审批和失败事件明确使用测试夹具，只验证视图；没有执行示例审批命令。真实文件工具与真实 UI 往返由两个独立真实后端检查验证。高级权限请求、MCP elicitation、新协议请求暂只可保守拒绝，未验证其接受流程，也没有向用户提供接受按钮。

窗口是透明无边框、可置顶的 Electron 桌面窗口；空白穿透使用 Windows `setIgnoreMouseEvents` 的鼠标移动转发。自动化核对透明像素和功能操作，未覆盖每种多屏/DPI/显卡/辅助技术组合。控制条可关闭穿透以便排查。当前固定窗口尺寸上限随主屏工作区适配，未提供任意缩放或跨屏布局记忆。

未测试的功能不会标记通过：Live2D、精确口型、情感 TTS、语音输入、官方应用原生线程联动、断线时恢复仍在执行的工具、企业环境所有权限策略、签名安装程序与自动更新。

## 发布状态

Windows 便携版由 `npm run dist:win` 生成。开发运行和打包运行均使用同一固定 preload/main 桥接。应用不带 Codex 或凭据，需要本机官方 Codex 登录。

用户已完成 GitHub 设备登录授权；私有仓库 [Lihhan/anime-codex](https://github.com/Lihhan/anime-codex) 已创建，源码、锁文件、测试、中文说明、原创 PNG 和许可记录均已通过 Git 推送到 `main`。本地分支 `codex/mvp` 跟踪 `origin/main`。自动化测试配置随源码提交；本记录中的通过结果指本机实际验证，不把尚未核实的 GitHub Actions 结果标记通过。
