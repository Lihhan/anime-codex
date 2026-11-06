# Third-party notices for local background removal

Anime Codex application code remains MIT-licensed. Dependencies and model weights retain their respective licenses.

- **ONNX Runtime / onnxruntime-node 1.31.1** — Microsoft and contributors, MIT. Windows and Apple Silicon CPU inference. The package retains its own bundled notices. See `third_party/onnxruntime-LICENSE.txt` and https://github.com/microsoft/onnxruntime.
- **ONNX Runtime / onnxruntime-node 1.23.2**, installed under the alias **onnxruntime-node-intel** — Microsoft and contributors, MIT. Intel Mac CPU inference only; recent upstream packages omit Intel Mac binaries ([upstream issue](https://github.com/microsoft/onnxruntime/issues/27961)). This pinned compatibility runtime retains its own bundled notices and matching onnxruntime-common dependency. It is excluded from Windows packages. The installer-only adm-zip dependency is overridden to 0.6.1 to include its security fixes; model inference does not extract user-supplied archives.
- **pngjs 7.0.0** — contributors, MIT. PNG parsing/encoding; its license remains in the installed package. https://github.com/pngjs/pngjs.
- **Anime Segmentation ISNet** — SkyTNT and contributors, Apache-2.0. The model card declares Apache-2.0 separately from the runtime license. See `third_party/anime-segmentation-LICENSE.txt`, https://github.com/SkyTNT/anime-segmentation and https://huggingface.co/skytnt/anime-seg.

Model source is pinned to Hugging Face revision `493cb60893f47441b26ec4fb9a306bce9e342982`, file `isnetis.onnx`, size 176,069,933 bytes, SHA-256 `f15622d853e8260172812b657053460e20806f04b9e05147d49af7bed31a6e99`. The binary is downloaded on first requested use, cached in local application data, and excluded from Git and the application package. No user image is sent to the model host.

The application implements aspect-preserving RGB preprocessing and alpha-mask composition for this model; it does not redistribute rembg or IMG.LY background-removal code. The original imported image remains available for restoration. User artwork retains its existing rights and is not relicensed by this feature.

**General fallback: U2NetP** — Xuebin Qin and U-2-Net contributors, Apache-2.0. Upstream architecture and pretrained model: https://github.com/xuebinqin/U-2-Net, license in `third_party/u2net-LICENSE.txt`. ONNX conversion is distributed at https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx. The rembg project's [U2NetP session](https://github.com/danielgatis/rembg/blob/main/rembg/sessions/u2netp.py) documents this release's MD5 (`8e83ca70e441ab06c318d82300c84806`), which was verified during integration. Anime Codex additionally pins SHA-256 `309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8` and exact size 4,574,861 bytes in `shared/background-general-model.json`. The binary is downloaded only if the anime result fails the foreground check, and is not bundled or committed.

The general fallback uses its own JavaScript RGB preprocessing (320×320 bilinear resize, maximum-value scaling and channel mean/std normalization) and min/max mask normalization with constant/low-confidence mask rejection. This follows the model's documented input/output conventions; it does not bundle Python, rembg application code or a remote image-processing service. These changes do not license user artwork.

## Optional fan-character samples

Furina and Nahida reference Genshin Impact; Kaguya and Iroha Sakayori reference Cosmic Princess Kaguya!. Their names and underlying designs remain with the respective franchise rights holders. Included images are newly generated unofficial fan art, not extracted official assets, and personality text is newly written. The application code license does not license franchise IP. See [characters/FANART.md](characters/FANART.md) for provenance and limitations.

## Mori character workflow

The character studio adapts profile evidence separation and candidate review patterns from the local Mori project. `shared/pet-candidate-directions.json` is copied from Mori (Copyright 2026 Mori contributors), under the MIT license reproduced in `third_party/MORI_LICENSE.txt`. Mori assets and private application data are not bundled.

## Companion design references (0.10.0)

The companion architecture and interaction design were informed by AIRI, Agent Pet, Claw Orchestrator, Letta Code, CodePet, DeskPet-Furina, VPet, BongoCat, and Clawd on Desk. This release copies no source code or artwork from those projects. Their respective licenses do not grant blanket rights to bundled character assets. Detailed source links, adaptation boundaries, and the original implementations used here are recorded in [docs/SUPERAGENT.md](docs/SUPERAGENT.md).

### Q版芙宁娜动作包（0.11.0）
`public/characters/furina/chibi/atlas.png` 是内置 imagegen 生成的二创素材，未复制参考桌宠项目的图片。芙宁娜角色属于《原神》及其权利人；本应用不声称拥有原角色知识产权。生成规格和使用范围见 `docs/CHIBI_PETS.md`。

0.12.0: `public/characters/furina/chibi/run.png` and `life.png` were generated with the built-in imagegen tool using the earlier generated Furina atlas as the visual reference. The same fan-art character rights notice above applies. Prompt specifications are recorded in `docs/CHIBI_PETS.md`.

### Elysia preview (0.13.0)
New imagegen-created fan-art sprites in `public/characters/elysia/`, visually referencing 神帝宇's “q版粉色小妖精小姐” preview at https://www.aplaybox.com/details/model/ZdIJ1cvFE7Ow . No original model files are redistributed. Elysia and associated character designs belong to their respective rights holders; generated fan art is not covered by the code MIT license. See `docs/ELYSIA.md` for provenance and prompt specifications.

### Furina flat-sticker preview (0.14.0)
`public/characters/furina/sticker/` contains newly generated fan-art animation sheets, using a generated style study based on Genshin Impact Official's Paimon's Paintings Set 28 as reference: https://www.hoyolab.com/article/23063798 . These are not official sprites. Original character rights remain with their holders. Prompt and asset details: `docs/CHIBI_PETS.md`.
