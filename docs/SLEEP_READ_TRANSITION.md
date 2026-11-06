# 睡觉到读书的动作过渡

素材：public/characters/furina/sticker/sleep-read-v1.png，内置 image_gen 生成，参考现有 atlas.png，保留透明背景。四列两行，共八帧：躺睡、撑起身体、跪坐拿帽、起身戴帽、书从上方落下、接书缓冲、打开书、阅读。播放器以 transition_sleep_read 优先直接播放；反向播放用于收书入睡，分段用于起身、躺下和接书。缺少动作素材时不再用淡入淡出伪装动作过渡。

生成提示摘要：Create a new transparent animation sprite sheet for the exact chibi Furina in the reference. Four columns two rows, 8 square cells. Continuous physical transition: lying asleep with crown beside her; wakes and pushes torso up on palms; kneels and picks up hat; rises and puts hat on; looks up at falling navy gold book; catches it at chest height with knees bending; straightens and opens book; stands reading. Keep consistent character scale, baseline and identity, clear transparent margins, no backgrounds, panel borders, numbers, text, floor shadows or teleporting book.

验证：scripts/smoke-action-transition.mjs 记录运行中的八帧和跨行坐标，确认透明度始终为 1，验证减少动态效果设置。
