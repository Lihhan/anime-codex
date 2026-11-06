import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
if (process.platform !== "darwin")
  throw Error("Build the Mac counter on macOS.");
const arch = process.argv[2] || process.arch;
if (!["arm64", "x64"].includes(arch))
  throw Error("Unsupported Mac architecture.");
await fs.mkdir("build/native", { recursive: true });
execFileSync(
  "/usr/bin/swiftc",
  [
    "electron/native/input-pulse.swift",
    "-O",
    "-target",
    (arch === "x64" ? "x86_64" : arch) + "-apple-macosx14.0",
    "-o",
    "build/native/input-pulse-mac",
  ],
  { stdio: "inherit" },
);
execFileSync(
  "/usr/bin/codesign",
  ["--force", "--sign", "-", "build/native/input-pulse-mac"],
  { stdio: "inherit" },
);

execFileSync(
  "/usr/bin/swiftc",
  [
    "electron/native/speech.swift",
    "-O",
    "-target",
    (arch === "x64" ? "x86_64" : arch) + "-apple-macosx14.0",
    "-o",
    "build/native/speech-mac",
  ],
  { stdio: "inherit" },
);
execFileSync(
  "/usr/bin/codesign",
  ["--force", "--sign", "-", "build/native/speech-mac"],
  { stdio: "inherit" },
);
