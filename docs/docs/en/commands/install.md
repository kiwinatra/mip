---
title: "mip install — install dependencies"
description: "The install command installs packages from the npm registry into your project, saves them to mip.yml, and creates a lockfile with pinned versions."
---

# mip install

::: callout info "What is this?" icon:package
`mip install` is the main command for installing dependencies. It downloads packages from the npm registry, saves them to the global cache `~/.mip/store/`, creates symlinks in `node_modules/`, and updates the manifest and lockfile. Supports installing multiple packages, global installation, and non-interactive mode for CI.
:::

## Syntax

```bash
mip install [packages...] [options]
```

## Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `packages` | array | ❌ | List of packages to install. If not specified — installs all dependencies from `mip.yml`. |

## Options

| Flag | Description |
|------|-------------|
| `--save-dev` / `-D` | Saves the package to `devDependencies` |
| `--force` / `-f` | Forces reinstallation of packages (overwrites cache) |
| `--global` / `-g` | Installs the package globally |
| `--no-save` | Installs the package without saving to `mip.yml` |
| `--ci` | Non-interactive mode (automatically skips peer dependencies) |

## How it works

### `mip install` (no arguments)
1. **Read `mip.yml`** — loads dependencies from `dependencies` and `devDependencies`.
2. **Check lockfile** — if `mip-lock.yml` is missing, it will be created.
3. **Install all packages** — sequentially installs all dependencies.
4. **Progress bar** — displays installation progress.
5. **Peer dependency resolution** — in interactive mode, asks for confirmation; in `--ci` mode, automatically skips.

### `mip install <package>`
1. **Version resolution** — if `package@version` is specified, installs that specific version; otherwise — `latest`.
2. **Dependency resolution** — fetches package information from the registry.
3. **Download and extract** — downloads the tarball and extracts it to the global cache `~/.mip/store/`.
4. **Create symlink** — creates a symbolic link in `node_modules/` pointing to the global cache.
5. **Install package dependencies** — recursively installs nested dependencies.
6. **Update lockfile** — pins exact versions in `mip-lock.yml`.
7. **Save to `mip.yml`** — adds the package to `dependencies` (unless `--no-save` is specified).
8. **Update manifest** — writes information to `.mip/manifest.json`.

## Examples

::: tabs
== tab "Install all dependencies"
```bash
mip install
```

**Output:**
```
📦 Installing all dependencies (42 packages)...

  ████████████████████████████████████ 100% 42/42

✅ Installed 42 packages in 12.3s
```
:::
== tab "Install multiple packages"
```bash
mip install react electron
```

Installs both packages in parallel.
:::
== tab "Install a specific package"
```bash
mip install express
```
:::
== tab "Install a specific version"
```bash
mip install lodash@4.17.21
```
:::
== tab "Install and save to devDependencies"
```bash
mip install jest --save-dev
```
:::
== tab "CI mode (non-interactive)"
```bash
mip install --ci
```

Automatically skips all peer dependency prompts.
:::
== tab "Global installation"
```bash
mip install --global typescript
```
:::

## Global cache

MIP uses a **global cache** at `~/.mip/store/`. All packages are stored once and used across all projects:

```
~/.mip/store/
├── lodash/
│   └── 4.17.21/
│       ├── package.json
│       └── index.js
└── express/
    └── 4.18.2/
        ├── package.json
        └── lib/
```

This saves up to 90% of disk space.

## Common errors

::: callout warning "❌ Package not found" icon:alert-triangle
**Cause:** The specified package does not exist in the npm registry.

**Solution:**
1. Check the package name spelling.
2. Use `mip search` to find the package.
:::

::: callout warning "❌ Version not found" icon:alert-circle
**Cause:** The specified package version does not exist.

**Solution:**
1. Check available versions: `mip info <package>`
:::

::: callout danger "⚠️ Peer dependency conflicts" icon:skull
**Cause:** The package requires a version of another package that conflicts with an already installed one.

**Solution:**
- In interactive mode, MIP will offer options.
- In CI, use `--ci` to automatically skip.
- Manually install the required version.
:::

::: callout tip "💡 Tip" icon:lightbulb
- For clean installs in CI, use `mip ci` — it's faster and more reliable.
- Use `--force` only if you're sure the cache is corrupted.
- For global packages, use `mip global install` (more convenient interface).
:::

## Related commands

- [mip ci](/commands/ci) — installation for CI/CD
- [mip update](/commands/update) — update packages
- [mip uninstall](/commands/uninstall) — remove packages
- [mip list](/commands/list) — view installed packages
- [mip global](/commands/global) — manage global packages
