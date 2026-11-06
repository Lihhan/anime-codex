const assert = require("node:assert/strict");
// Minimal ONNX Identity model: float[1] -> float[1], opset 13, IR 8.
function identityModel() {
  const field = (n, data) =>
    Buffer.concat([Buffer.from([(n << 3) | 2, data.length]), data]);
  const number = (n, v) => Buffer.from([n << 3, v]);
  const string = (n, s) => field(n, Buffer.from(s));
  const tensorType = Buffer.concat([
    number(1, 1),
    field(2, field(1, number(1, 1))),
  ]);
  const info = (name) =>
    Buffer.concat([string(1, name), field(2, field(1, tensorType))]);
  const node = Buffer.concat([
    string(1, "x"),
    string(2, "y"),
    string(4, "Identity"),
  ]);
  const graph = Buffer.concat([
    field(1, node),
    string(2, "native-smoke"),
    field(11, info("x")),
    field(12, info("y")),
  ]);
  return Buffer.concat([
    number(1, 8),
    field(7, graph),
    field(8, number(2, 13)),
  ]);
}
async function probe(ort) {
  const session = await ort.InferenceSession.create(identityModel(), {
    executionProviders: ["cpu"],
  });
  try {
    const result = await session.run({
      x: new ort.Tensor("float32", Float32Array.from([42]), [1]),
    });
    assert.equal(result.y.data[0], 42);
    return {
      platform: process.platform,
      arch: process.arch,
      cpuInference: true,
    };
  } finally {
    await session.release();
  }
}
module.exports = { probe };
