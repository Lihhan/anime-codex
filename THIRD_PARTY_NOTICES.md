# Third-party notices for local background removal

Anime Codex application code remains MIT-licensed. Dependencies and model weights retain their respective licenses.

- **ONNX Runtime / onnxruntime-node 1.31.1** — Microsoft and contributors, MIT. Windows CPU inference. The package retains its own bundled notices. See `third_party/onnxruntime-LICENSE.txt` and https://github.com/microsoft/onnxruntime.
- **pngjs 7.0.0** — contributors, MIT. PNG parsing/encoding; its license remains in the installed package. https://github.com/pngjs/pngjs.
- **Anime Segmentation ISNet** — SkyTNT and contributors, Apache-2.0. The model card declares Apache-2.0 separately from the runtime license. See `third_party/anime-segmentation-LICENSE.txt`, https://github.com/SkyTNT/anime-segmentation and https://huggingface.co/skytnt/anime-seg.

Model source is pinned to Hugging Face revision `493cb60893f47441b26ec4fb9a306bce9e342982`, file `isnetis.onnx`, size 176,069,933 bytes, SHA-256 `f15622d853e8260172812b657053460e20806f04b9e05147d49af7bed31a6e99`. The binary is downloaded on first requested use, cached in local application data, and excluded from Git and the application package. No user image is sent to the model host.

The application implements aspect-preserving RGB preprocessing and alpha-mask composition for this model; it does not redistribute rembg or IMG.LY background-removal code. The original imported image remains available for restoration. User artwork retains its existing rights and is not relicensed by this feature.
