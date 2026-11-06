# Character production, activities and first-run guide

## Create a character

Open Settings → Character, model and more settings → Create a character. Enter a name, work and optional user-created setting, then choose production/activation. Production uses the companion brain's configured Codex model/effort, native environment and permissions. The native image tool must be available. No external paid image API is automatically configured.

The pipeline creates a profile, one identity reference and seven 4 × 4 atlases, validates their structure, then copies and activates the result locally. The 112 frames cover:

| Sheet  | Four action rows                                   |
| ------ | -------------------------------------------------- |
| daily  | Standing, reading, eating, sleeping                |
| play   | Gaming, office work, head-pat response, listening  |
| run    | Right, left, up, down running                      |
| exit   | Putting away book, food, game device, office props |
| enter  | Starting reading, eating, gaming, office work      |
| change | Falling asleep, waking, starting/stopping a run    |
| social | Entering/leaving head-pat response and listening   |

Progress/results are stored in `character-studio/<job-id>/job.json`. Cancellation, interruption or failure requires an explicit resume; restarting does not regenerate or overwrite successful sheets. Each failed group is automatically retried at most once. Repeated activation does not create duplicate characters.

Non-square/non-divisible sheets receive transparent padding per 4 × 4 cell while retaining original files and pixels, avoiding another paid generation solely for dimensions. Validation rejects non-PNGs, symbolic links, oversized images, invalid grids, empty frames, opaque backgrounds, clipping and completely duplicated static rows. It cannot prove identity, anatomy or action meaning; review the output. Quota use is explained beforehand; cancellation does not refund completed calls.

## Activity transitions

Playback prefers `transition_<old>_<new>`, otherwise `exit_<old>` → `enter_<new>`; neutral standing needs neither. Transitions use actual pose frames without crossfades. Movement waits for completion. Rapid normal selections finish the current movement before routing to the latest target. Picking up the character interrupts immediately; reduced motion skips transitions.

The Furina sticker pack and new-production contract cover nine activities/72 directed combinations. Other appearances need corresponding artwork: the player cannot invent missing frames. See [transition provenance and limits](ALL_ACTIVITY_TRANSITIONS.md).

## Daily behavior and onboarding

Activities typically last 45–120 seconds and walks 8–14 seconds, subject to personality overrides. Manual actions take priority. Chat, menus, dragging, tasks and onboarding prevent autonomous interruptions. Quiet mode and prolonged inactivity allow rest. A local state machine schedules actions without a model call for every change. Static characters fall back to available reading/thinking/coding poses; full motion requires atlases.

The first-run guide highlights one control at a time:

1. Chat: send a message and receive a successful reply.
2. Tasks: open the card and acknowledge its explanation; no real task is created.
3. Life: select an activity.
4. Settings: adjust size or quiet companionship.

Progress persists locally and can be postponed/restarted. The guide remains text; optional uploaded clips are configured independently. Restarting the guide does not reset tasks/history.

## Research evidence

Before profile drafting, the configured native Codex web tool searches the character/work and opens references, preferring official material and identifying secondary wikis. User-created settings go to the model but should not enter search queries. A separate call structures research into persona, speech rules and creative examples before image generation.

`job.research` stores background, personality, short quotations with `sourceUrl`, sources, story stage and uncertainties. `job.researchEvidence` retains tool-access evidence. Only HTTP(S) sources present in actual `webSearch` events are retained; model-invented URLs do not count. Access evidence cannot prove every fact/quotation, so the UI labels results as model-organized research. Missing valid sources produces an insufficient-information result; tool failure stops and preserves the job.

`personaFor` incorporates research into the new persona without silently rebuilding existing/custom personas. Original characters without public sources use user settings and identified creative material. Production exposes expandable sources and short reference dialogue.

Historical preview evidence: `test-results/research-d6LDVO/cdbccf25-94d5-4df6-865c-11c17bda0077/job.json` recorded four tool-accessed Furina sources, with official-page extraction limits and secondary-source dependencies in `unknowns`. That check performed research/profile drafting only, without regenerating artwork or replacing a character. It is not a fresh Windows production run. See [current validation](VALIDATION.md).
