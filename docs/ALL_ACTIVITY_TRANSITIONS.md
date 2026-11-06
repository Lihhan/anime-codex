# 全活动过渡 0.18.5

当前芙宁娜贴纸：idle/read/meal/gaming/office/sleep/walk/pet/attention，72 个有向组合。已有 sleep-read 图集负责睡觉和阅读，新添 activity-bridges-v1.png 与 social-bridges-v1.png（均1254×1254，透明，4×4）。共补32帧，正反播放复用进入/退出动作；制作流程为后续角色独立生成7组112帧。

两张素材使用内置 image_gen，参考 public/characters/furina/sticker/life.png，不更改生成像素。透明像素比例分别65.2%和64.0%。工具输出是关键姿势动画，结构覆盖不意味着每帧肢体、物品落点和跨图集尺度已经达到手工逐帧润色质量。

生成提示1：
Create a square transparent production sprite atlas of exact same chibi Furina as reference. STRICT 4 columns x 4 rows, sixteen equal square cells, each complete character 12% clear margin and common ground baseline 88% cell height. Same costume navy crown silver hair white shorts navy tailcoat, big head tiny body, same crisp flat sticker style. Each ROW shows four physically consecutive poses ENTERING a different activity FROM identical neutral standing hands empty, designed also to play in reverse for putting things away. ROW1 eating: frame1 neutral empty hands, frame2 reaches into coat and pulls a small blue bowl, frame3 raises bowl and spoon, frame4 holds blue rice bowl and spoon ready to eat while standing. ROW2 gaming: frame1 neutral, frame2 pulls navy handheld console with crown motif from coat, frame3 squats down with console, frame4 sits with legs forward playing console matching reference row1. ROW3 office: frame1 standing beside folded compact gold desk and folded blue chair (both fully within cell), frame2 unfolds desk and chair, frame3 sits and opens navy laptop, frame4 seated at gold desk blue chair typing navy laptop exactly matching reference office setup. ROW4 running: frame1 neutral standing, frame2 bends knees leans forward, frame3 steps off with one leg, frame4 running rightward. Actual anatomy motion across frames, props move with hands, never teleport. Character scale consistent between rows and frames; don't change camera. No text labels gridlines ground shadow or background. Genuine transparent alpha, no halo. Clear uncropped complete cells.

生成提示2：
Generate a square transparent sprite sheet, exactly 4 columns x 4 rows of complete chibi Furina matching reference identity, large head tiny body, silver blue hair navy gold crown and tailcoat, white shorts. Flat pastel sticker outlines. Each row four distinct consecutive physical animation poses, with same scale center and ground baseline, at least 8% clear cell margins, no background, shadow, labels or gridlines. Row1 ENTER HEADPAT interaction: neutral standing empty hands, notices user's touch and lifts chin, inclines head toward viewer with shy smile, eyes closed happy leaning into petting with hand at cheek. Row2 EXIT HEADPAT: happy tilted head and hand at cheek, lifts head, straightens crown hat with both hands, lowers hands to neutral standing. Row3 ENTER LISTENING: neutral standing, turns head toward viewer, draws hands together, leans forward attentively hands clasped. Row4 EXIT LISTENING: leaning hands clasped, straightens torso, small acknowledging nod, releases hands to neutral standing. No actual human hands or additional characters. Maintain exact outfit anatomy, no repeated stills, no whole-picture rotation as substitute. Transparent alpha, no white matte.

验证：tests/pet-transitions.test.mjs 对当前芙宁娜和新制作 pack 分别检查72条路径、动画帧与别名。scripts/smoke-all-transitions.mjs 在真实 Electron 中沿有向图依次点击8种可选活动的56条路径，验证退出/进入播放及连续点击。倾听由系统状态触发，包含在静态路径检查中。

## 0.18.6 节奏与对齐

每个过渡关键帧至少280ms，首帧再加60ms、末帧加100ms；普通四帧片段从约660ms延长到1280ms，退出+进入约2.56秒。跑步循环保持原有速度。

scripts/calibrate-furina-sprites.cjs 只读取原图 alpha 范围，写入播放器的 offsetX、offsetY、renderScale 元数据，不编辑 PNG。校准115个被引用的单元格，使非移动动作前景中心和脚底落点一致；睡觉与游戏循环适当缩放以接近过渡段。跑动和悬空拖动保留各自锚点。跨素材的人体比例、手部和道具设计差异不能只靠坐标校准消除，仍需后续原画润色。
