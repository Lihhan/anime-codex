import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createRequire } from "node:module";
const { BackgroundRemoval } = createRequire(import.meta.url)(
  "../electron/background.cjs",
);
test("one-shot native workers are retired after success and a later operation starts a fresh worker", async (t) => {
  const workers = [];
  const remover = new BackgroundRemoval({
    directory: "fixture",
    workerPath: "fixture",
    mathPath: "fixture",
    reuseWorker: false,
    workerFactory: () => {
      const w = new EventEmitter();
      w.postMessage = ({ id, image }) =>
        queueMicrotask(() => w.emit("message", { id, image }));
      w.terminate = () => {
        w.retired = true;
      };
      workers.push(w);
      return w;
    },
  });
  remover.ensureModel = async () => "fixture.onnx";
  t.after(() => remover.dispose());
  assert.deepEqual(
    await remover.remove(Buffer.from([1, 2])),
    Buffer.from([1, 2]),
  );
  assert.equal(remover.worker, null);
  assert.equal(workers[0].retired, true);
  assert.deepEqual(
    await remover.remove(Buffer.from([3, 4])),
    Buffer.from([3, 4]),
  );
  assert.equal(workers.length, 2);
  assert.equal(workers[1].retired, true);
});
