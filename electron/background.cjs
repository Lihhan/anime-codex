const fs = require("node:fs/promises");
const { createReadStream } = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { Worker } = require("node:worker_threads");
const os = require("node:os");
const MODEL = require("../shared/background-model.json");
const GENERAL_MODEL = require("../shared/background-general-model.json");
async function hashFile(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}
class BackgroundRemoval {
  constructor({
    directory,
    workerPath,
    mathPath,
    emit = () => {},
    model = MODEL,
    fetchFn = globalThis.fetch,
    workerFactory = (file, options) => new Worker(file, options),
    reuseWorker = true,
  }) {
    Object.assign(this, {
      directory,
      workerPath,
      mathPath,
      emit,
      model,
      fetchFn,
      workerFactory,
      reuseWorker,
    });
    this.status = { stage: "idle", percent: 0 };
    this.busy = false;
    this.worker = null;
    this.job = null;
    this.counter = 0;
    this.verified = false;
  }
  get modelPath() {
    return path.join(this.directory, this.model.filename);
  }
  publish(stage, percent = 0) {
    this.status = { stage, percent, model: this.model.variant || "anime" };
    this.emit({ method: "client/background", params: this.status });
  }
  async isCached() {
    try {
      return (await fs.stat(this.modelPath)).size === this.model.bytes;
    } catch {
      return false;
    }
  }
  async ensureModel() {
    if (this.verified && (await this.isCached())) return this.modelPath;
    this.publish("checking");
    await fs.mkdir(this.directory, { recursive: true });
    if (
      (await this.isCached()) &&
      (await hashFile(this.modelPath)) === this.model.sha256
    ) {
      this.verified = true;
      return this.modelPath;
    }
    this.controller = new AbortController();
    const partial = this.modelPath + ".part";
    let file;
    try {
      this.publish("downloading");
      const response = await this.fetchFn(this.model.url, {
        signal: AbortSignal.any([
          this.controller.signal,
          AbortSignal.timeout(300000),
        ]),
      });
      if (!response.ok || !response.body) throw new Error("error.bgDownload");
      file = await fs.open(partial, "w");
      const hash = createHash("sha256");
      let bytes = 0,
        lastUpdate = 0;
      for await (const chunk of response.body) {
        bytes += chunk.length;
        if (bytes > this.model.bytes) throw new Error("error.bgChecksum");
        hash.update(chunk);
        await file.write(chunk);
        if (Date.now() - lastUpdate > 150) {
          this.publish(
            "downloading",
            Math.min(99, Math.round((bytes * 100) / this.model.bytes)),
          );
          lastUpdate = Date.now();
        }
      }
      await file.close();
      file = null;
      if (
        bytes !== this.model.bytes ||
        hash.digest("hex") !== this.model.sha256
      )
        throw new Error("error.bgChecksum");
      await fs.rename(partial, this.modelPath);
      this.verified = true;
      return this.modelPath;
    } catch (error) {
      await file?.close().catch(() => {});
      await fs.unlink(partial).catch(() => {});
      if (this.controller?.signal.aborted) throw new Error("error.bgCancelled");
      throw new Error(
        ["error.bgChecksum", "error.bgDownload"].includes(error.message)
          ? error.message
          : "error.bgDownload",
      );
    } finally {
      this.controller = null;
    }
  }
  async remove(image) {
    if (this.busy) throw new Error("error.bgBusy");
    this.busy = true;
    this.cancelled = false;
    clearTimeout(this.idleTimer);
    try {
      const modelPath = await this.ensureModel();
      if (this.cancelled) throw new Error("error.bgCancelled");
      this.publish("processing");
      if (!this.worker) {
        this.worker = this.workerFactory(this.workerPath, {
          workerData: {
            modelPath,
            mathPath: this.mathPath,
            inputSize: this.model.inputSize,
            variant: this.model.variant,
            threads: Math.min(
              4,
              Math.max(1, (os.availableParallelism?.() || 2) - 1),
            ),
          },
        });
        const worker = this.worker;
        this.worker.on("message", (m) => {
          if (this.worker !== worker) return;
          const job = this.job;
          if (!job || job.id !== m.id) return;
          clearTimeout(job.timer);
          this.job = null;
          m.error
            ? job.reject(new Error(m.error))
            : job.resolve(Buffer.from(m.image));
        });
        this.worker.on("error", () => {
          if (this.worker === worker) this.failWorker();
        });
        this.worker.on("exit", (code) => {
          if (this.worker === worker && code && this.job) this.failWorker();
        });
      }
      const result = await new Promise((resolve, reject) => {
        const id = ++this.counter,
          timer = setTimeout(() => {
            this.failWorker("error.bgTimeout");
          }, 180000);
        this.job = { id, timer, resolve, reject };
        this.worker.postMessage({ id, image });
      });
      if (!this.reuseWorker) {
        const worker = this.worker;
        this.worker = null;
        worker?.terminate();
      }
      this.publish("ready", 100);
      this.idleTimer = setTimeout(() => {
        this.worker?.terminate();
        this.worker = null;
      }, 60000);
      this.idleTimer.unref?.();
      return result;
    } catch (error) {
      if (
        error.message === "error.bgNoForeground" &&
        this.model.filename === MODEL.filename &&
        !this.cancelled
      ) {
        this.failWorker();
        if (!this.general)
          this.general = new BackgroundRemoval({
            directory: this.directory,
            workerPath: this.workerPath,
            mathPath: this.mathPath,
            model: GENERAL_MODEL,
            fetchFn: this.fetchFn,
            workerFactory: this.workerFactory,
            reuseWorker: this.reuseWorker,
            emit: (event) => {
              this.status = event.params;
              this.emit(event);
            },
          });
        return await this.general.remove(image);
      }
      this.publish(
        error.message === "error.bgCancelled" ? "cancelled" : "failed",
      );
      throw error;
    } finally {
      this.busy = false;
    }
  }
  failWorker(message = "error.bgInference") {
    const job = this.job;
    this.job = null;
    if (job) {
      clearTimeout(job.timer);
      job.reject(new Error(message));
    }
    const worker = this.worker;
    this.worker = null;
    worker?.terminate();
  }
  cancel() {
    this.cancelled = true;
    this.controller?.abort();
    this.general?.cancel();
    this.failWorker("error.bgCancelled");
    clearTimeout(this.idleTimer);
  }
  dispose() {
    this.cancel();
  }
}
module.exports = { BackgroundRemoval, hashFile };
