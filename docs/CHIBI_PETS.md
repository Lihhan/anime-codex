# Q 版桌宠外观（0.11.0）

## 0.12.0 更新

设置中的角色大小支持 40%–140%，默认 70%，本机持久化；文字与气泡尺寸独立。新增 `run.png` 与 `life.png`，均通过内置 imagegen 参考原 atlas 生成，每张 4×4、16 帧。run 行依次为右、左、背面向上、正面向下；life 行依次为读书、吃饭、游戏、办公。总计 48 帧，原单向跑步行由新四向动作替代。新多帧动作目前仅覆盖芙宁娜，其他角色也支持大小调节。

生成提示规格：保留原芙宁娜的两头身、帽子、发型、服饰与粗描边；透明背景、4列4行等格、完整人物、同一比例、无文字和网格。生活图要求翻书页、碗筷送饭入口、手持游戏机操作及庆祝、键盘办公及喝茶；方向图要求右/左/背/正面各四个跑步阶段，手脚交替。

运动每 33ms 按速度推进，使用缩放后的边界，碰到四边反转对应速度及动画方向。拖动、聊天、打开面板、任务执行时暂停移动。系统减少动态效果设置下不自动跑动。闲置时每约22秒选择生活活动；生活面板支持手动选择20秒活动或15秒散步。办公演出本身不会执行电脑操作。

验证：82 项测试通过；`scripts/smoke-pet-life.mjs` 在真实 Electron 中验证缩放持久化、四向动作与生活动作切换、右边缘反向后向内移动、气泡不随角色缩放、无渲染错误。

角色身份与外观分离：当前完成芙宁娜一套 16 帧 Q 版动画，原版立绘仍可切换。其他角色目前仍是原版立绘，未声称已生成动画。设置 > 我的角色 > 外观画风，选择按角色保存在本应用 localStorage，不修改角色身份或对话记忆。

`shared/pet-appearances.json` 登记角色主题色和可选动画 atlas。播放器 `src/PetSprite.jsx` 读取网格、动作行、逐帧停留时间；新增角色素材无需复制播放器。当前 4×4 网格：待机眨眼、跑步、睡觉、进食各四帧。跑步随移动方向翻转，系统减少动态效果时只显示首帧。睡觉由系统闲置/安静模式触发，文件投喂时播放进食；设置中可预览每组动作。仍有改进空间：四帧循环较简洁，尚无专门的起跑/落地/入睡过渡。

素材：`public/characters/furina/chibi/atlas.png`。使用内置 imagegen 生成，非下载第三方角色素材。保留芙宁娜的帽子、白蓝发色、蓝色异色瞳、蓝白服饰；借鉴圆润两头身、粗描边、平涂的桌宠表现，不添加鲸鱼娘的鲸尾等特征。

生成提示规格：transparent background; EXACTLY 4 columns x 4 rows equal square cells; same Furina character in all 16 frames; cute round two-head-tall chibi desktop pet; thick clean dark-blue outlines, simple flat pastel shading; full body with consistent scale and transparent margins; row 1 open/half-closed/closed/open smiling eyes; row 2 four distinct right-facing running poses with alternating arms and legs; row 3 four curled sleeping poses, hat beside her; row 4 holding/raising/biting/lowering cake; no text, grid lines, whale tail, fins or maid dress.

角色创建器的 Q 版提示也使用同样风格约束；创建器目前生成单张候选立绘，不能自动产出完整动作包。后续动作包须制作、检查后登记 manifest。

双击角色或点击“聊聊”打开 320px 气泡，Enter 发送、Shift Enter 换行，支持中文输入法。历史按钮才展开完整对话面板。Escape 收起。角色工具栏在悬停或键盘聚焦时显示，离开后隐藏；空白区域鼠标穿透。

验证：`npm test`；`node scripts/smoke-chibi.mjs`（真实 Electron 中测试 4 帧切换、睡姿、画风切换、气泡无大面板、空闲隐藏、零渲染错误）。

## 0.14.0 官方表情包参考画风

芙宁娜新增独立外观 `sticker`，设置显示「表情包参考 · 清爽平涂」，旧 `chibi` 和原立绘继续保留。共享同一个角色身份与记忆。参考原神官方「派蒙的画作」第28弹 https://www.hoyolab.com/article/23063798 ，来源图和风格试稿见 `assets/style-studies/furina-official/`。

使用内置 imagegen，以上一轮四表情风格试稿为图片参考生成三张4×4动作图，位于 `public/characters/furina/sticker/`。提示要求：同一芙宁娜造型、清楚大块发束、简洁黑色轮廓、平涂与单层硬阴影，避免3D手办质感；每格完整人物、统一比例、透明背景。atlas 四行分别为眨眼、睡觉、翻书、吃饭；run 为右、左、背、正四向跑步；life 为掌机游戏、办公、笑/挥手、思考。48张生成画面中，办公第二格桌子朝向不一致，播放器跳过该格，以0、2、3、2顺序循环。素材长宽比例在播放器中保留，避免拉伸。

这些是新生成的二创素材，不是官方发布的桌宠或官方动画。本次仍是有限帧数的动画预览。新增画风切换保存在本机，未覆盖旧图片。

## 0.15.0 透明残留与角色节奏

确认 sticker atlas 大片背景 alpha 在1–23之间，而非0。渲染层对 sprite 使用 SVG alpha transfer，将 alpha<24 归零、其余值保留，同时移除脚下 aura。原始素材不改写，不改变RGB和主体不透明像素。低透明度细节也会被裁掉，适用于当前平涂素材；未来烟雾等半透明素材需单独配置。

`shared/companion-personality.json` 为前端行为与后端聊天共用的角色配置。芙宁娜的闲置选择间隔120–240秒，移动概率10%，活动偏重安静和阅读，自动活动不再随机选择吃饭/办公；20分钟系统闲置后睡觉，主动邀请最少35分钟一次。触摸台词按角色选择并避免连续重复。挥手/思考反应只播放一轮，显式动作预览与用户手动生活操作保留。

后端聊天在原人设之外加入角色专属 conversationalGuidance，不修改用户人设、对话或记忆。强调自然简短中文、克制的戏剧感、避免主角/主人等固定称呼和每次主动推销工作。已有摘要可能仍影响语气，实际角色贴合程度需要对话观察，不能仅凭单元测试保证。

## 0.15.1 待机横向对齐

待机四格的双脚中心在格内分别为160、146.75、134、121.75原图像素，导致眨眼时左右跳动。现在为每帧配置横向补偿，将双脚中心统一到149.875，脚底高度保持320。渲染时补偿而不改原素材；测试从原图不透明脚部测量，验证四帧校正后落点误差小于1原图像素。85项测试通过。
