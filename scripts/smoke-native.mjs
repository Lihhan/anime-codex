import { createRequire } from "node:module";
import fs from "node:fs/promises";
const require = createRequire(import.meta.url),
  { probe } = require("./native-probe.cjs");
const result = await probe(require("onnxruntime-node"));
await fs.mkdir("test-results", { recursive: true });
await fs.writeFile(
  "test-results/native-runtime.json",
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result));
