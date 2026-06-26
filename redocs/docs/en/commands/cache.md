---
title: "mip cache — Manage package cache"
description: "The cache command lets you view the size and clear the local and global MIP cache, freeing disk space."
---

# mip cache

::: callout info "What is this?" icon:database
`mip cache` manages the cache of downloaded packages. MIP stores downloaded packages in two places: a **local cache** (`.mip/` inside the project directory) and a **global cache** (`~/.mip/store/`). This command lets you check their size, clear them, or see which packages are currently used.
:::

## Syntax

```bash
mip cache <action> [--global]
```

## Arguments

| Name | Type | Required | Description |
|------|------|-----------|-------------|
| `action` | string | ✅ | Cache action: `size`, `clean`, or `usage` |

## Options

| Flag | Description |
|------|-------------|
| `--global` | Applies the action to the global cache (`~/.mip/store/`) |

## Available actions

| Action | Description |
|---------|-------------|
| `size` | Shows the cache size (local or global) and the number of packages in the manifest |
| `clean` | Completely removes the cache, freeing space |
| `usage` | Shows which packages from the global cache are used in the current project |

## How it works

### `size`
1. **Local cache** — scans the `.mip/` folder in the current project and shows its size.
2. **Global cache** (with `--global`) — scans `~/.mip/store/` and shows the total size of all packages.
3. **Manifest** — shows the number of packages installed in the current project.

### `clean`
1. **Local cache** — deletes the `.mip/` folder in the current project.
2. **Global cache** (with `--global`) — deletes all packages from `~/.mip/store/`.

### `usage`
1. Scans the global cache (`~/.mip/store/`).
2. Compares it with the current project’s manifest.
3. Shows which packages are used (📋) and which can be safely removed (💀).

## Examples

::: tabs
== tab "View local cache"
```bash
mip cache size
```

**Example output:**
```
📦 Manifest: 3 packages
📦 Cache size: 42.50 MB
```
:::

== tab "View global cache"
```bash
mip cache size --global
```

**Example output:**
```
🌍 Global cache size: 156.30 MB
```
:::

== tab "Clear local cache"
```bash
mip cache clean
```

**Example output:**
```
🧹 Cache cleaned: 42.50 MB freed
```
:::

== tab "Clear global cache"
```bash
mip cache clean --global
```

**Example output:**
```
🌍 Global cache cleaned: 156.30 MB freed
```
:::

== tab "View global cache usage"
```bash
mip cache usage --global
```

**Example output:**
```
📊 Global cache usage
────────────────────────────────────────────────────────────
  📋 lodash@4.17.21  21.50 MB
  📋 express@4.18.2  25.00 MB
  💀 jest@29.7.0    32.00 MB
────────────────────────────────────────────────────────────
📦 Total: 78.50 MB

Legend:
  📋 - used in current project
  💀 - not used (can be cleaned)
```
:::
:::

## Common errors

::: callout warning "⚠️ No lockfile or manifest found" icon:alert-triangle
**Cause:** This project has no installed packages.

**Resolution:** This is not an error — there’s simply nothing to clean. Install packages via `mip install`.
:::

::: callout warning "⚠️ No global cache found" icon:alert-circle
**Cause:** The global cache hasn’t been created yet (no packages were installed).

**Resolution:** Start installing packages — the cache will be created automatically.
:::

::: callout tip "💡 Tip" icon:lightbulb
Clear the cache if:
- You’re running out of disk space.
- You suspect cache corruption (weird install errors).
- You switched between projects that use different package versions.

Use `mip cache usage --global` to analyze which packages can be safely removed.
:::

## Where the cache is stored

| Type | Path | Purpose |
|------|------|----------|
| Local | `.mip/` | Cache for the current project (tarballs and temporary files) |
| Global | `~/.mip/store/` | Stores all package versions for all projects |

## Related commands

- [mip install](/commands/install) — installs packages and creates the cache
- [mip doctor](/commands/doctor) — checks project status, including cache integrity

::: collapsible "🧠 Why two caches?"
MIP uses **two cache levels** to balance speed and disk space:

1. **Global cache** (`~/.mip/store/`) — stores all versions of all packages you’ve ever installed in any project. This saves traffic and space: if a package already exists globally, MIP just creates a symlink in the project.

2. **Local cache** (`.mip/` inside the project) — stores only tarballs for fast re-installs and temporary files. It does not duplicate packages.

Cleaning the global cache removes packages from `~/.mip/store/`. On the next install they will be downloaded again, but it frees a lot of disk space.
:::

