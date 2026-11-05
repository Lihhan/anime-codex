# Character images and desktop controls

## Start with one idle image

Choose **Upload idle image** on the empty desktop character area, or **Settings → Character library → New character from idle image**. The filename supplies an initial name; edit it and the personality in Settings, then save.

No built-in character is automatically selected. Create multiple characters from your own idle portraits and switch them from the library. The app does not synthesize missing pictures. It uses the idle image whenever an action image is absent.

| Slot | Source | Missing-image behavior |
|---|---|---|
| `idle` | Required first image | Replace it instead of removing it |
| `listening` | Typing a message | Idle |
| `thinking` | Turn start / reasoning | Idle |
| `reading` | Structured reading/search events | Idle |
| `coding` | Working / commands / file changes | Idle |
| `approval` | Pending server decision | Idle |
| `speaking` | Streamed reply or optional voice playback | Idle |
| `success` | Completed turn | Idle |
| `failure` | Sorry / error / backend disconnected | Idle |
| `interrupted` | Stopped turn | Idle |

A single idle image therefore covers all ten states. Adding an action changes only that state. **Use idle instead** removes an optional assignment. The task-status label continues to report the real state even if all states share one picture.

## Import and preview

Each action accepts one PNG, JPEG or WebP, up to 15 MB and 8192 pixels per side. The main process checks signatures and dimensions, decodes the selected file and stores a PNG copy. SVG/HTML, scripts, remote image URLs and executable avatar packs are not accepted.

Use transparent PNG for a background-free appearance. Existing backgrounds remain intact. For smooth transitions, keep your character's identity, canvas dimensions, size and baseline consistent across images. Different dimensions are contained within the idle image's aspect-ratio area; images are never stretched to change their proportions.

Click a slot thumbnail to preview that action. The desktop label explicitly says **Preview**. Previewing never starts a task or invents a result. New activity or an approval clears the preview so genuine task state stays visible. Images crossfade rather than being randomly selected.

This format uses separate action files, not a sprite-sheet editor, face customizer or deformable rig. Uploading an illustration does not automatically animate its limbs or remove its background.

## Desktop placement

Drag the character or toolbar handle. Change size with the minus/plus buttons, the Settings slider, or Alt + mouse wheel. Placement and scale are saved after changes. The overlay spans the connected displays' work-area bounds; geometry uses logical desktop coordinates.

On drag release within 18 logical pixels of a screen edge, auto-hide collapses to an edge tab. Hover over or click it to restore. This does not trigger merely because the app starts near an edge. Pending server decisions prevent hiding; newly received approval requests reveal the UI.

Disable auto-hide or reset position/size in Settings. `Ctrl + Alt + A` reveals the character and restores mouse input if click-through makes interaction difficult. Reduced-motion settings disable animation.

## Storage and privacy

The default directory is `%APPDATA%\anime-codex\`:

- `preferences.json`: language, selected character, names, personalities, action assignments, position, scale and auto-hide.
- `characters/`: copied and normalized image files with generated filenames.

Imports do not depend on the original source file after copying. Images are provided to the renderer as data URLs; the renderer cannot open arbitrary filesystem paths. Replacing/removing an assignment may leave an unused local copy; assets are not automatically uploaded or committed. Close the app and rename `preferences.json` to recover defaults without deleting copied images.

Tests use a separate `ANIME_CODEX_DATA_DIR` and leave your real preferences untouched. Legacy imported image profiles can be read as idle-only characters; old procedural-character settings are ignored.

Images remain local. Character name and personality instructions are sent to Codex for new/resumed conversations. Language selection changes the UI immediately and persists; the response-language preference applies to new/resumed conversations. Existing messages and tool evidence are never translated or rewritten.
