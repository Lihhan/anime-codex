const { EventEmitter } = require("node:events");
const { createInterface } = require("node:readline");
const { spawn } = require("node:child_process");
class Rpc extends EventEmitter {
  constructor(executable = "codex", spawnFn = spawn, env = process.env) {
    super();
    this.executable = executable;
    this.spawnFn = spawnFn;
    this.env = env;
    this.pending = new Map();
    this.next = 0;
    this.child = null;
  }
  async start() {
    if (this.child) return;
    const child = this.spawnFn(
      this.executable,
      ["app-server", "--listen", "stdio://"],
      {
        env: this.env,
        shell: false,
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    this.child = child;
    const fail = (err) => {
      if (this.child !== child) return;
      this.child = null;
      for (const p of this.pending.values()) {
        clearTimeout(p.timer);
        p.reject(err);
      }
      this.pending.clear();
      this.emit("disconnect", err.message);
    };
    child.on("error", fail);
    child.stdin.on("error", fail);
    child.on("exit", (code) =>
      fail(new Error(`error.rpcDisconnected:${code}`)),
    );
    child.stderr.on("data", (b) => this.emit("diagnostic", b.toString()));
    createInterface({ input: child.stdout }).on("line", (line) => {
      let m;
      try {
        m = JSON.parse(line);
      } catch {
        return this.emit("diagnostic", "Non-JSON protocol line ignored");
      }
      if (m.method) this.emit("event", m);
      else {
        const p = this.pending.get(m.id);
        if (p) {
          clearTimeout(p.timer);
          this.pending.delete(m.id);
          m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
        }
      }
    });
    try {
      const result = await this.request("initialize", {
        clientInfo: {
          name: "anime_codex",
          title: "Anime Codex",
          version: "0.1.0",
        },
        capabilities: { experimentalApi: false },
      });
      this.send({ method: "initialized", params: {} });
      return result;
    } catch (e) {
      this.close();
      throw e;
    }
  }
  send(m) {
    if (!this.child?.stdin.writable) throw new Error("error.notConnected");
    this.child.stdin.write(JSON.stringify(m) + "\n");
  }
  request(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.next;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`error.rpcTimeout:${method}`));
      }, 60000);
      this.pending.set(id, { resolve, reject, timer });
      try {
        this.send({ id, method, params });
      } catch (e) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(e);
      }
    });
  }
  reply(id, result) {
    this.send({ id, result });
  }
  reject(id) {
    this.send({
      id,
      error: {
        code: -32601,
        message:
          "Anime Codex does not support this request. No permission granted.",
      },
    });
  }
  close() {
    const c = this.child;
    if (c) c.kill();
  }
}
module.exports = { Rpc };
