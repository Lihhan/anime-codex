# Upload your own action audio

No speech model, synthesized voice or voice-cloning service is used. Audio clips are optional, prerecorded reactions. Written replies remain in the dialogue bubble.

1. Hover over the character and open Settings (`设置`).
2. Choose `角色、模型与更多设置 ↗` and select the intended character.
3. Find `自己的动作语音包`. Click Upload (`上传`) beside an action, then choose a recording.
4. Click Preview (`试听`) to check the clip. Preview works while automatic playback is disabled.
5. Enable `播放我上传的动作语音` and adjust `动作语音音量` above the audio card.

Each character has independent slots for greeting, idle, touch, reading a book, local office animation, listening, thinking, reply notification, reading code, coding, approval, success, failure, interruption, games, meals, sleep and walking. Missing slots stay silent. There is no fallback voice. The reply slot plays a fixed notification, not the words of a generated reply.

WAV, MP3, OGG, FLAC and M4A are accepted when the local Chromium decoder supports their codec. Each file must be at most **8 MiB and 45 seconds**. PCM WAV is the most portable choice. A file is decoded before it enters the library; unsupported or damaged recordings produce an error.

Replace (`替换`) changes one slot. Delete (`删除`) removes the application's copy; your original file stays untouched. Recordings and their index are stored under `userData/voice-clips/` and survive upgrades. They are not sent to Codex, Claude or an audio service. The app does not record the microphone.

Only one clip plays at a time. Approval and task-result notifications can interrupt ordinary reactions; manual preview takes priority. Automatic reactions have a cooldown and do not loop. Quiet mode, zero volume, hiding the window and switching characters stop playback. Disabling automatic audio stops an automatic clip; preview remains available. Stop Playback (`停止播放`) stops the current clip.

Task clips follow actual task state. A prerecorded success sound is only a notification: the original tool records, verification result, errors and approval requests remain the source of execution evidence. A recording never grants approval or creates a task result. Local book/office animations have separate slots from reading code/coding.

Audio uses real local media playback, but there is no phoneme or mouth-shape analysis. Uploaded recordings do not create a Live2D rig or accurate lip sync.
