# Complete builtin character production

The requested production work uses the existing `CharacterStudio.generate` and `CharacterStudio.produce` implementations, including actual native Codex `imageGeneration` tool events. It reuses each builtin's original portrait and persona as reference. Original dialogue personalities and portrait actions remain intact. Kaguya and Iroha retain their everyday real-world designs rather than their Tsukuyomi avatars. Furina's existing assets are not regenerated.

The existing profiles supply identity rather than repeating public research or replacing their personas. Production creates a new chibi identity reference, then the standard seven 4 × 4 atlases: daily, play, run, exit, enter, change and social. Each completed pack has 112 generated poses and routes for all 72 directed activity pairs. These are sprite packs; they contain no native Live2D model/rig.

Completed packs in 0.8.1:

| Character      | Pack status                                  |
| -------------- | -------------------------------------------- |
| Rin            | Complete: seven validated sheets, 112 frames |
| Nahida         | Complete: seven validated sheets, 112 frames |
| Kaguya         | Complete: seven validated sheets, 112 frames |
| Iroha Sakayori | Complete: seven validated sheets, 112 frames |
| Elysia         | Complete: seven validated sheets, 112 frames |

Final packs are imported with `node scripts/import-builtin-pack.mjs <slug> <completed-job.json>`. The importer refuses incomplete jobs, missing actual image-generation evidence, invalid source paths, failed structural QA and overwriting a different pack. It registers the resulting appearance through the same `makePack` contract as custom production.

Assets live under `public/characters/<slug>/complete-v1/`. Each directory includes the seven sheets, identity reference, an extracted idle preview and `provenance.json` with original/packed SHA-256 digests, QA results and sanitized tool event types/statuses. Personal session logs, account information and absolute job paths are excluded from the repository.

Original generated files and resumable job records remain in the local production workspace. Deterministic packing retains every source cell/pixel, adding only transparent padding where necessary. It does not draw poses, remove backgrounds or silently substitute copies for animation. Structural QA checks alpha, margins, grid layout, frame visibility and nonidentical rows. Character fidelity, anatomy and motion continuity still need visual review.
