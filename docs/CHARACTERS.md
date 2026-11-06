# Character images and desktop controls

## Included presets

Settings contains protected cards for Rin, Furina, Nahida, Kaguya and Iroha Sakayori. Kaguya and Iroha use their real-world appearances. Each has its own personality and eight pose images. Switch when no task or approval is active; the active conversation selection is cleared, while stored Codex threads are preserved. The first reply after a switch belongs to the new character.

Changing a preset's personality, name or images creates an independent custom copy. You can return to its original card without losing the custom copy. The original Rin button still restores Rin. Custom names are preserved verbatim; bundled names follow the interface language. Missing uploaded poses still use the idle image.

Personality instructions guide tone and reactions, but truthful task status, explicit approvals and your programming instructions take priority. A character may express uncertainty and must report real failures. Local touch lines are playful UI feedback, not agent execution. See [fan-character provenance](../characters/FANART.md) for appearances and rights, and [the character gallery](../README.md#choose-a-character) for examples.

## Start with one idle image

Rin is included and selected on a fresh install. To create your own character, choose **Settings → Character library → New character from idle image**. The filename supplies an initial name; edit it and the personality in Settings, then save.

Create multiple characters from your own idle portraits and switch them from the library. Original Rin remains a protected template. Editing her images or profile creates a separate custom copy. Use **Use original Rin** to return to the original pictures. Upgrades preserve older modified Rin profiles as custom copies before repairing the template; existing custom characters remain available. Original Rin's name follows the UI language; custom names are kept verbatim. Missing action images use idle rather than synthesized artwork.

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

Use transparent PNG for a background-free appearance. Existing backgrounds remain intact unless you explicitly enable automatic background removal or use the per-image removal button. For smooth transitions, keep your character's identity, canvas dimensions, size and baseline consistent across images. Different dimensions are contained within the idle image's aspect-ratio area; images are never stretched to change their proportions.

Click a slot thumbnail to preview that action. The desktop label explicitly says **Preview**. Previewing never starts a task or invents a result. New activity or an approval clears the preview so genuine task state stays visible. Images crossfade rather than being randomly selected.

This format uses separate action files, not a sprite-sheet editor, face customizer or deformable rig. Uploading an illustration does not animate its limbs. Background removal is a separate, optional local AI operation.

## Removing backgrounds

The automatic-import checkbox applies to future imports. Existing action slots have **Remove background** and, after successful processing, **Restore original**. The original is the normalized PNG copy made during import; your external source file is untouched. The model changes only transparency, retaining the original canvas, dimensions and RGB values. Missing action images still fall back to idle normally.

The first use downloads the fixed Anime Segmentation ISNet model and verifies its expected size and SHA-256 before running it. It is cached locally. Images are processed by a CPU worker, never sent to a web API. A progress panel supports cancellation, including while downloading. Failed or cancelled work never replaces the current image or creates an empty character profile.

The first model is designed for anime characters. If its result would erase almost everything, a small general model is downloaded once and tried locally. If that also lacks a substantial foreground, the app refuses the cutout and preserves the original. An upgrade restores old near-empty processed assignments when their saved originals are available. Difficult hair/background boundaries can still be imperfect. Restore the original whenever a result is unsuitable.

Close the settings panel using its sticky top-right ×, or press Escape. Closing preserves unsaved text in the current session; Save character is still required to persist profile edits. Escape leaves pending approval dialogs and active background processing alone.

## Desktop placement

Reading and interaction settings offer 14–24 px conversation text (18 px by default), independently of avatar scaling, and a touch toggle. Tap visible hair, shoulders or hands for a local playful reaction. Dragging more than six pixels moves the character instead. Touch regions assume aligned portraits. Work and approval status remain authoritative. Play with me opens a separate game window; see [play details](PLAY.md).

Drag the character or toolbar handle. Change size with the minus/plus buttons, the Settings slider, or Alt + mouse wheel. Placement and scale are saved after changes. The overlay spans the connected displays' work-area bounds; geometry uses logical desktop coordinates.

On drag release within 18 logical pixels of a screen edge, auto-hide collapses to an edge tab. Hover over or click it to restore. This does not trigger merely because the app starts near an edge. Pending server decisions prevent hiding; newly received approval requests reveal the UI.

Disable auto-hide or reset position/size in Settings. `Ctrl + Alt + A` reveals the character and restores mouse input if click-through makes interaction difficult. Reduced-motion settings disable animation.

## Storage and privacy

The default directory is `%APPDATA%\anime-codex\`:

- `preferences.json`: language, selected character, names, personalities, action assignments, position, scale and auto-hide.
- `characters/`: copied originals and processed PNG images with generated filenames.
- `models/`: the downloaded, checksum-verified background-removal model.

Imports do not depend on the original source file after copying. Images are provided to the renderer as data URLs; the renderer cannot open arbitrary filesystem paths. Replacing/removing an assignment may leave an unused local copy; assets are not automatically uploaded or committed. Close the app and rename `preferences.json` to recover defaults without deleting copied images.

Tests use a separate `ANIME_CODEX_DATA_DIR` and leave your real preferences untouched. Legacy imported image profiles can be read as idle-only characters; old procedural-character settings are ignored.

Images remain local. Character name and personality instructions are sent to Codex for new/resumed conversations. Language selection changes the UI immediately and persists; the response-language preference applies to new/resumed conversations. Existing messages and tool evidence are never translated or rewritten.
