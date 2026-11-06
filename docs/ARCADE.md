# Action games

The independent playroom includes two original pixel-art Canvas 2D games alongside guessing and memory pairs. Both action games use an original tri-color beagle, regardless of the selected conversation character. Its atlas includes idle, two running strides, jump, crouch, landing, harmless stumble and celebration. No Rin or custom portrait is passed to the action renderer. The main desktop character, guessing and memory pairs keep their existing appearance.

Scenery uses snapped square blocks and a small flat palette on a 400×210 canvas. Image smoothing is disabled and CSS uses pixelated scaling, independently of the 800×420 physics coordinates. The transparent raster asset and source/edit prompts are in [asset provenance](../public/games/beagle/ASSET.md). No new game engine or audio dependency is required.

## Controls

| Action | Beagle hop | Beagle runner |
|---|---|---|
| Primary input | Hold mouse on the board/button or hold Space/Enter/↑; release to jump | Click the board/button or press Space/Enter/↑ to start/jump |
| Secondary input | Glowing arc previews the landing while charging | Hold ↓ or the duck button to crouch |
| Pause / resume | P or the pause button | P or the pause button |
| Restart | R or New round | R or New round |

Click the game board to give it keyboard focus. Auto-repeated jump keys are ignored. Pointer capture supports releasing a mouse hold outside the board; cancelled holds are discarded. The first hop is deliberately predictable, so players can learn the charge timing. The charge caps at 1.2 seconds; waiting longer does not add distance.

## Hopping

A capped monotonic charge curve selects a 70–330 world-pixel jump. The avatar follows an arc toward that landing position. A landing supported by the next platform earns one point; landing within ten world pixels of its center earns two and extends the perfect streak. Missing the platform produces a visible fall and a retry prompt.

New platforms are placed within a reachable charge distance of the actual previous landing, with widths gradually narrowing to a fixed minimum. Only a short platform history is retained. The camera follows the avatar; the predictor, platform target rings and landing particles provide feedback without a separate backend.

## Running

The runner automatically moves past crystals and flying kite obstacles. Jumping follows gravity; crouching reduces the grounded hitbox, but not an airborne one. The pace rises from 260 to a capped 500 world pixels per second. Obstacles are spaced in time and flying obstacles appear after the introductory section. Score follows distance. A collision ends the round and shows the supplied failure expression when available.

## Pause, persistence and work isolation

Window blur, document hiding, switching game tabs and a real main-window approval pause action games. A held charge is cancelled and crouch is released. Approval-driven pauses cannot be bypassed through resume/restart input while the approval badge remains active. The original client owns every approval decision. Losing a game does not fail a coding task, and a game score never counts as programming success.

Tab switches preserve the in-memory round. Closing the playroom ends it. Best scores are local, per game, and saved on landing, round end, pause or tab cleanup. There are no accounts, leaderboards, network requests or Codex turns for these games. Best-score storage failures do not prevent play.

Simulation uses small bounded time steps, independently of rendering frequency, and clamps a stalled frame. Paused/static boards do not run a continuous animation loop. The fixed low-resolution canvas scales with nearest-neighbor sampling. Reduced-motion settings suppress decorative particles, running bobbing and running-frame alternation; core game movement remains necessary for play.

## Original Rin protection

The built-in Rin profile is a template. Image replacements, optional-action removal, background processing and profile edits create a custom copy before mutation. Selecting the original verifies its image assignments against the bundled assets. During an upgrade, modified legacy Rin content is first copied to a custom profile; original Rin is then repaired. Existing custom characters stay available, and no image file is deleted by this repair.

Use **Settings → Use original Rin** to return directly to the original. This also resets unsaved profile-name input and exits appearance preview, without changing a running Codex task. Custom copies can be selected and edited normally.

## Checks

`npm test` covers charge bounds, exact landings and streaks, reachable platform generation, overshoots, deterministic frame stepping, jump/crouch collision behavior and pause semantics. Built-in character tests cover copy-on-edit and preservation of legacy changes.

`npm run smoke:arcade` uses real Electron windows with a disposable profile. It replaces Rin's idle image, returns to the original, verifies the custom copy, performs an actual mouse-held jump, starts/jumps/pauses a runner, lets a collision end the round, resumes a previous game tab and verifies best scores after restart. Explicit work/approval UI fixtures test isolation without claiming any programming execution. The test can capture original-artwork-only demo images with `CAPTURE_ARCADE_DEMO=1`.
