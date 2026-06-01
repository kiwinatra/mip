# Commands (Users)

All commands are executed via `mip <command> [args]`.

## Core commands

### `mip init`
Creates a new project in the current directory:
- `mip.json`
- `.mip/` structure:
  - `.mip/packages/`
  - `.mip/cache/`
  - `.mip/temp/`

If `mip.json` already exists, it throws (except under test mode).

### `mip install <pkg> [versionRange]`
Installs a package into `.mip/<name>/<version>/` and links it into `node_modules/<name>`.

Supported options (flags):
- `-g`, `--global` — install into global store (`~/.mip/global/`)
- `-D`, `--save-dev` — save as `devDependencies` in `mip.json`
- `-f`, `--force` — force re-extraction (ignores cached `.mip` content)
- `--no-save` (internal option in code via `noSave: true`)

If `<pkg>` is omitted:
- installs everything from `mip.json` (`dependencies + devDependencies`)

### `mip uninstall <pkg>`
Removes a dependency (see implementation in `lib/commands/uninstall.js`).

### `mip update`
Checks `dependencies + devDependencies` for newer versions (compares with `latest` in npm registry).
If updates exist, prompts and then reinstall updated packages with `force`.

### `mip list`
Shows installed packages (from `.mip/` and `mip-lock.json`).
It warns if packages exist in lockfile but are missing in `.mip/`.

## Info & search

### `mip search <query>`
Searches the npm registry (uses npm search endpoint).

### `mip info <pkg>`
Shows package metadata (see `lib/commands/info.js`).

### `mip why <pkg>`
Explains why a package is present (see `lib/commands/why.js`).

### `mip outdated`
Shows outdated dependencies (see `lib/commands/outdated.js`).

## Security & CI

### `mip audit [--fix]`
Scans `mip-lock.json` for vulnerabilities using npm security advisories endpoint.

- Without `--fix`: prints vulnerabilities grouped by severity.
- With `--fix`: tries to install a compatible patched version found in `patched_versions` and updates `mip.json`.

### `mip ci [--frozen-lockfile]`
Installs all packages from `mip-lock.json` into `.mip/` without resolving new versions.

With `--frozen-lockfile`:
- verifies `mip.json` dependencies/devDependencies match versions in lockfile.

## Development utilities

### `mip create <template> <name>`
Creates a project from one of built-in templates:
- `node`
- `react`
- `cli`
- `express`

Creates files and installs template dependencies (some templates auto-install).

### `mip run <script>`
Runs `scripts[script]` from `mip.json`.

Implementation details:
- command is executed as a *string* via shell (`sh -c` or `cmd.exe /c`)
- builds `PATH` from bins found inside `.mip/**/.../.bin` and `.mip/**/.../.bin/<cmd>`

Example:
```json
{
  "scripts": {
    "start": "node app.js"
  }
}
```

Then:
```bash
mip run start
```

### `mip exec <command> [args...]`
Executes a local binary from `.mip`:
- searches `.mip/<pkg>/<version>/node_modules/.bin/<command>`
- searches `.mip/<pkg>/<version>/.bin/<command>`
- if not found: falls back to system command

## Cache & diagnostics

### `mip cache clean|size`
Manages cache directories:
- local `.mip/` in the project
- global `~/.mip/packages`

### `mip doctor`
Diagnostics:
- Node.js version
- mip version
- `~/.mip` existence
- global bin in `PATH`
- `git` availability
- network reachability (curl)
- disk writeability (tmp file test)

## Monorepo (workspaces)

### `mip workspaces ...`
Workspace commands exist (see `lib/commands/workspaces.js` for full behavior).

Common usage patterns:
- `mip workspaces list`
- `mip workspaces install`
- `mip workspaces run <script>`
