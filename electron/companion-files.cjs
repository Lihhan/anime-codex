const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { constants } = require("node:fs");
// Keep a private recovery copy before using the OS Trash; restore never overwrites.
class FileMeals {
  constructor(store, shell) {
    this.store = store;
    this.shell = shell;
    this.busy = false;
  }
  async inspect(paths) {
    if (!Array.isArray(paths) || !paths.length || paths.length > 20)
      throw Error("每次请选择 1–20 个普通文件。");
    const files = [];
    for (const file of [...new Set(paths)]) {
      if (typeof file !== "string" || !path.isAbsolute(file))
        throw Error("文件路径无效。");
      const s = await fs.lstat(file);
      if (!s.isFile() || s.isSymbolicLink() || s.size > 50 * 1024 * 1024)
        throw Error(
          "只支持不超过 50 MB 的普通文件；文件夹和链接请交给整理任务。",
        );
      const real = await fs.realpath(file);
      if (
        real === this.store.directory ||
        real.startsWith(this.store.directory + path.sep)
      )
        throw Error("不能投喂角色自己的记录。");
      files.push({
        path: file,
        name: path.basename(file),
        size: s.size,
        mtime: s.mtimeMs,
        ino: s.ino,
      });
    }
    if (files.reduce((a, f) => a + f.size, 0) > 100 * 1024 * 1024)
      throw Error("单次投喂最多 100 MB。");
    return files;
  }
  async eat(files) {
    if (this.busy) throw Error("正在处理文件。");
    this.busy = true;
    const results = [];
    try {
      const dir = path.join(this.store.directory, "recovery");
      await fs.mkdir(dir, { recursive: true, mode: 0o700 });
      for (const file of files) {
        const m = {
          id: randomUUID(),
          path: file.path,
          name: file.name,
          size: file.size,
          status: "preparing",
          time: new Date().toISOString(),
        };
        const backup = path.join(dir, m.id);
        try {
          const [fresh] = await this.inspect([file.path]);
          if (
            fresh.mtime !== file.mtime ||
            fresh.size !== file.size ||
            fresh.ino !== file.ino
          )
            throw Error("文件已经变化，请重新选择。");
          await fs.copyFile(file.path, backup, constants.COPYFILE_EXCL);
          await fs.chmod(backup, 0o600);
          this.store.state.meals.push(m);
          await this.store.save();
          await this.shell.trashItem(file.path);
          m.status = "eaten";
        } catch (e) {
          m.status = "failed";
          m.error = e.message;
          if (!this.store.state.meals.includes(m))
            this.store.state.meals.push(m);
        }
        results.push(m);
        await this.store.save();
      }
      return results;
    } finally {
      this.busy = false;
    }
  }
  async restore(id) {
    if (this.busy) throw Error("正在处理文件。");
    this.busy = true;
    try {
      const m = this.store.state.meals.find((m) => m.id === id);
      if (!m || !["eaten", "preparing", "failed"].includes(m.status))
        throw Error("没有可恢复的记录。");
      await fs.copyFile(
        path.join(this.store.directory, "recovery", m.id),
        m.path,
        constants.COPYFILE_EXCL,
      );
      m.status = "restored";
      await this.store.save();
      return m;
    } finally {
      this.busy = false;
    }
  }
}
module.exports = { FileMeals };
