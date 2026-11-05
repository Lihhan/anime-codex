const { parentPort, workerData } = require("node:worker_threads");
const { PNG } = require("pngjs");
const ort = require("onnxruntime-node");
const { prepareInput, applyMask } = require(workerData.mathPath);
let session;
parentPort.on("message", async ({ id, image }) => {
  try {
    if (!session)
      session = await ort.InferenceSession.create(workerData.modelPath, {
        executionProviders: ["cpu"],
        intraOpNumThreads: workerData.threads || 2,
        interOpNumThreads: 1,
      });
    const input = PNG.sync.read(Buffer.from(image)),
      geometry = prepareInput(input, workerData.inputSize),
      tensor = new ort.Tensor("float32", geometry.tensor, [
        1,
        3,
        geometry.size,
        geometry.size,
      ]);
    const results = await session.run({ [session.inputNames[0]]: tensor }),
      mask = results[session.outputNames[0]];
    if (
      !mask ||
      mask.dims.at(-1) !== geometry.size ||
      mask.dims.at(-2) !== geometry.size
    )
      throw new Error("error.bgInference");
    const output = applyMask(input, mask.data, geometry);
    parentPort.postMessage({ id, image: PNG.sync.write(output) });
  } catch (error) {
    parentPort.postMessage({ id, error: "error.bgInference" });
  }
});
