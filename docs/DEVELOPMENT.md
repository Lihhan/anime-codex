# Development

## Build from source

Use **Node.js 24**, npm and Git. In Windows PowerShell, run these lines one at a time:

```powershell
git clone https://github.com/Lihhan/anime-codex.git
Set-Location anime-codex
npm.cmd ci
npm.cmd run build
npm.cmd start
```

On Mac use `npm` instead of `npm.cmd`. Source dependencies do not install or authenticate Codex/Claude. Quit the app through its tray/menu-bar menu before ending the development terminal.

Build application packages:

```powershell
# Windows x64
npm.cmd run dist:win
```

```sh
# Build on a Mac; Xcode Command Line Tools are needed to compile the bundled counter.
npm run dist:mac:arm64
npm run dist:mac:x64
```

Outputs are under `release/v0.8.1/`. To start the retained workbench directly for development, set `ANIME_CODEX_SURFACE=workbench` before `npm start`; omit it for the default companion.

## Validation

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run smoke:native
npm.cmd run smoke:companion
npm.cmd run smoke:input   # Windows native input-counter lifecycle and check-command test
```

CI builds Windows x64, Mac Apple Silicon and Intel packages. It checks source and packaged companion/workbench UI, native inference, native input helpers and existing safety regressions. Real model-turn tests use subscription allowance and are opt-in; UI fixtures never count as actual execution. See [version-specific validation evidence](VALIDATION.md).

Code: [MIT](../LICENSE).
