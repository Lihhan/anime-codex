// Keep the pinned Intel Mac runtime separate from Windows and Apple Silicon.
function loadInferenceRuntime() {
  return process.platform === "darwin" && process.arch === "x64"
    ? require("onnxruntime-node-intel")
    : require("onnxruntime-node");
}
module.exports = { loadInferenceRuntime };
