// Isolate the Intel compatibility runtime from the desktop process. Killing a
// process during native inference cannot tear down the main UI's V8 isolate.
function createBackgroundProcess(utilityProcess, file, { workerData }) {
  const child = utilityProcess.fork(file, [JSON.stringify(workerData)], {
    serviceName: "Anime Codex Background Removal",
    stdio: "inherit",
  });
  child.terminate = () => child.kill();
  return child;
}
module.exports = { createBackgroundProcess };
