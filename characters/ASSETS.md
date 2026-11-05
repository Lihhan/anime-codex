# 示例素材来源

`public/characters/rin/sheet.png` 是本次任务通过内置 ImageGen 生成的原创示例角色图，2026-11-05 保存。未使用外部人物参考、现有动漫角色或下载的 Live2D 模型。非人工原画；不声称拥有排他版权，生成内容使用仍适用生成服务条款与所在法域规则。

仓库代码的 MIT 许可不替代生成服务条款，也不替代你后续替换素材的作者许可。发布时请保留此来源说明；不要对第三方角色、声音或模型作出相同授权假设。

图像规格：1536×1024，4×2 等分，单格 384×512。首稿存在紫灰背景；为满足用户无背景桌面交互的要求，再通过内置 ImageGen 编辑为透明 RGBA 图。已检查 alpha 范围 0..254，约 24.1% 像素为完全透明，另有柔化边缘。透明像素的 RGB 可能仍有原始底色，符合 PNG 表示；渲染按 alpha 合成。八格顺序与 `rin.json` 一致。不同动作有细微位置差异，使用交叉淡化实现过渡，不是骨骼动画。

背景移除编辑提示：仅去除整张图所有紫灰背景为真实透明 alpha，保持 1536×1024、4×2 格、原人物身份、发丝、衣服、表情、动作、键盘与书本以及图格位置不变；没有背景矩形、风景、发光、地板、卡片、棋盘格、阴影、标记或框。人物之间及发丝/手臂空隙必须透明。

使用的生成模式：内置 ImageGen。提示摘要：原创成年女性编程伙伴，银紫长发、青绿色眼睛与几何发夹，海军蓝开衫和米白衬衫，同一身份与统一腰部以上构图；八格分别待机、倾听、思考、读书、键盘工作、等待许可、成功微笑、担忧；无文字、无场景、禁止现有角色。完整提示如下：

> Create a production-ready original anime visual novel character sprite sheet for desktop programming companion named Rin (凛), adult woman age 25. Exactly 4 columns by 2 rows equal cells, each cell 384 wide by 512 tall, total 1536x1024 landscape. Transparent background, no text no frames no shadows outside figure. Each cell repeats IDENTICAL character identity, face, proportions, pose framing waist-up centered, silver lavender long hair, teal eyes, navy cardigan over ivory blouse, little teal geometric hair clip, understated modern elegant anime art, polished professional VN illustration. Keep every figure fully contained within its own cell, no overlap. Row 1: neutral relaxed idle, attentive listening with gentle head tilt, thoughtful hand at chin, focused reading looking downward holding small notebook. Row 2: focused coding with hands near keyboard at bottom, waiting for permission with gentle questioning expression and open palm, happy modest success smile with closed eyes, concerned failure expression with slightly lowered brows. Same body scale and head location each cell for smooth crossfade. Upper body standing sprites with breathing room around head, no scenery, no labels. Original design only.
