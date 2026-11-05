# 角色扩展契约

当前只安装 sprite renderer。角色事件模型位于 `shared/state.mjs`，原始协议数据仍保留，不把工具输出变成人设台词。

| 状态 | 事件或输入依据 | 映射格 |
|---|---|---|
| idle | 初始/新会话 | 0 |
| listening | 用户正在输入，未执行任务 | 1 |
| thinking | turn/started、审批结束且无工具 | 2 |
| reading | commandActions 全部为 read/listFiles/search；或搜索/MCP工具 | 3 |
| coding | fileChange；其他命令 | 4 |
| approval | 有尚未 resolved 的服务器请求，优先级最高 | 5 |
| success | turn/completed 且 status=completed | 6 |
| failure | turn 失败或后端断开 | 7 |
| speaking | agentMessage/delta，无待决审批 | 1 |
| interrupted | turn status=interrupted | 建议映射 idle（本版已配置） |

MCP 工具仅表示正在处理信息，不能保证它只读；真实请求与输出始终在证据面板。一个工具结束后仍可能有并发工具运行，状态机保留 active item 集合。完成和失败状态保留，直到新输入或新任务，避免瞬间跳回待机。

替换现有素材：同规格八格图集写入 `public/characters/rin/sheet.png`，修改 `characters/rin.json` 的 persona、name、states，执行 build。角色配置由 main 从受信任本地文件读取；不允许对话内容动态加载远程模型或 JS。现有界面标题中的「凛」是固定设计文案，完整更名还需修改 `src/main.jsx` 和 HTML 标题。

Live2D 扩展建议以独立 `CharacterStage` 组件实现：

```ts
interface CharacterRenderer {
  mount(element: HTMLElement): Promise<void>;
  transition(state: string, options: { durationMs: number }): void;
  setMouthOpen(value: number): void; // clamp 0..1
  setGaze(x: number, y: number): void;
  dispose(): void;
}
interface VoiceProvider {
  speak(text: string, config: unknown,
    onLevel: (level: number) => void, onEnd: () => void): void;
  stop(): void;
}
```

本版已实现 `SystemVoice` 的 provider 形状和节奏回调；还没有实现上述 Live2D renderer。真正口型应从本地音频 RMS/音素时间线驱动 `ParamMouthOpenY`，暂停/失败/打断时归零，不能把字符流速度当作准确音素。

至少需要具有再分发权限的 `.model3.json`、`.moc3`、纹理 PNG、physics、motions、expressions，以及各文件作者/许可；再单独取得适用的 Cubism Core 和 SDK 发布许可。将模型整理成待机/思考/阅读/打字/等待/成功/失败动作组，指定 blend-in/out、动作优先级和眨眼排斥规则。保持审批优先级，工作动作不能遮挡权限弹窗。无模型时继续显示 PNG，不应假称 Live2D 已加载。

可提升项：分层发丝物理、头部视线、自然眨眼、工作手势、表情 hysteresis、本地低延迟中文 TTS、音素口型、跨回合的显式用户偏好。任何记忆应由用户可查看和清除，不能用随机亲密台词代替任务事件。
