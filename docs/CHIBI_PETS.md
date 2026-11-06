# Chibi and sticker appearances

These development notes describe features integrated into the Windows/macOS 0.8.0 release. Preview version numbers in older records are historical labels.

Character identity and appearance are separate. The appearance selector saves portrait/chibi/sticker choices per character without replacing its identity or memories. Characters without a sprite pack retain their portraits. `shared/pet-appearances.json` registers themes and atlases; `src/PetSprite.jsx` reads grid dimensions, action rows and frame durations. These are finite sprite animations, not Live2D or skeletal models.

## Artwork and behavior

The built-in image generator created `public/characters/furina/chibi/atlas.png`: a transparent 4 × 4 sheet containing blinking, running, sleeping and eating, four frames each. Prompts specify consistent Furina identity, two-head-tall proportions, clean dark-blue outlines, flat pastel shading, complete bodies and clear margins. Preserve the hat, white/blue hair, blue eyes and blue/white costume. No text, grid lines or unrelated character features. Later `run.png` and `life.png` add four-direction running and reading/eating/gaming/office actions, bringing the original pack to 48 frames.

Character scale ranges from 40% to 140%, defaults to 70%, and persists locally. Bubble/text size is independent. Movement advances every 33 ms within scaled bounds, reverses direction at boundaries, and pauses during dragging, chat, panels and tasks. Reduced motion suppresses automatic movement/animation. Office animation alone executes no computer operation. Current scheduling is described in [automatic production](AUTOMATIC_PET_PRODUCTION.md).

Double-clicking or choosing Chat opens the compact bubble composer. Enter sends; Shift+Enter inserts a newline; Chinese composition is supported. History opens the larger panel; Escape dismisses it. Hover or keyboard focus reveals the toolbar; empty areas allow mouse input through.

## Sticker style and limitations

The separate Furina sticker appearance references the official Paimon's Paintings set 28: <https://www.hoyolab.com/article/23063798>. References/style studies are recorded under `assets/style-studies/furina-official/`. The generated 4 × 4 sheets in `public/characters/furina/sticker/` retain identity while using clear hair shapes, simple black outlines, flat colors and single hard shadows. Atlas rows cover blinking, sleeping, reading and eating; run covers four directions; life covers gaming, office work, waving/laughing and thinking. An inconsistent desk frame is skipped with indices 0, 2, 3, 2. Actual image aspect ratios are preserved.

These are generated fan interpretations, not official desktop-pet assets or animation. Limited frames and drawing inconsistencies remain. Original artwork is retained when switching styles.

The sticker atlas has background alpha values of 1–23. A rendering-only SVG alpha transfer removes alpha below 24 without rewriting PNGs or altering RGB/opaque foreground. It also removes low-opacity detail, so future smoke/translucent artwork needs separate configuration. The foot aura was removed.

Idle foot centers were 160, 146.75, 134 and 121.75 source pixels. Rendering offsets align them at 149.875 with baseline 320; image-based tests check less than one source pixel of error. See [cross-action calibration](ALL_ACTIVITY_TRANSITIONS.md).

## Personality and checks

`shared/companion-personality.json` supplies local behavior and conversational guidance. Furina's preview uses 120–240 second idle intervals, 10% wandering, quiet/reading preferences, sleep after 20 minutes of inactivity, and at least 35 minutes between invitations. Touch lines avoid immediate repetition; wave/thought reactions play once. Manual actions remain available.

Guidance requests natural, concise Chinese and restrained theatricality without repetitive fixed forms of address or task sales pitches. Existing summaries may affect tone; tests cannot establish canonical personality fidelity.

Historical checks include `scripts/smoke-chibi.mjs` and `scripts/smoke-pet-life.mjs`: actual Electron playback, scale persistence, directional/life actions, inward boundary motion, independent bubble size and rendering errors. [Current release evidence](VALIDATION.md) identifies the actual 0.8.0 platform checks.
