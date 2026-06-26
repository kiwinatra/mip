---
title: "mip uninstall — remove packages"
description: "The uninstall command removes packages from your project, cleaning them from the global cache, manifest, mip-lock.yml, and mip.yml."
---

# mip uninstall

::: callout info "What is this?" icon:trash
`mip uninstall` is a command for removing packages from your project. It completely cleans the package from `node_modules/`, removes it from `mip-lock.yml`, the manifest, and (by default) from `mip.yml`. Unlike manual removal, the command ensures no "garbage" is left in configuration files.
:::

## Syntax

```bash
mip uninstall <package-name> [--no-save]
```

## Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `package-name` | string | ✅ | Name of the package to remove |

## Options

| Flag | Description |
|------|-------------|
| `--no-save` | Removes the package from `node_modules/`, the manifest, and the lockfile, but **does not remove** it from `mip.yml` |

## How it works

1. **Check `mip.yml`** — if the file is missing, the command exits with an error.

2. **Remove from manifest** (`manifest.json`):
   - Removes the package entry from `.mip/manifest.json`.

3. **Remove symlink from `node_modules/`**:
   - Removes the symbolic link to the package.

4. **Remove from `mip-lock.yml`**:
   - Removes all entries starting with `<package-name>@`.

5. **Remove from `mip.yml`** (unless `--no-save` is specified):
   - Removes the package from `dependencies` and `devDependencies`.

6. **Global cache cleanup** — the package is NOT removed from `~/.mip/store/`, as it may be used by other projects.

7. **Output result** — shows what was removed.

## Examples

::: tabs
== tab "Regular removal"
```bash
mip uninstall lodash
```

**Output:**
```
🗑️ Removing lodash...
  ✅ Removed from manifest: lodash
  ✅ Removed from node_modules: lodash
  ✅ Removed from lockfile: lodash@4.17.21
  ✅ Removed from mip.yml: lodash

✅ Removed lodash (1 version)
```
:::
== tab "Remove without saving"
```bash
mip uninstall lodash --no-save
```

**Output:**
```
🗑️ Removing lodash...
  ✅ Removed from manifest: lodash
  ✅ Removed from node_modules: lodash
  ✅ Removed from lockfile: lodash@4.17.21

✅ Removed lodash from project (kept in mip.yml)
```
:::
== tab "Package not found"
```bash
mip uninstall unknown-package
```

**Output:**
```
❌ Package unknown-package not found
```
:::

## Common errors

::: callout warning "❌ mip.yml not found" icon:alert-triangle
**Cause:** You are not in the root of a MIP project.

**Solution:**
1. Navigate to the project folder: `cd /path/to/project`
2. Make sure `mip.yml` exists there.
3. If not — create it: `mip init`
:::

::: callout warning "❌ Package not found" icon:info
**Cause:** The specified package is not installed in the project.

**Solution:**
1. Check the list of installed packages: `mip list`
2. Make sure the package name is spelled correctly.
:::

::: callout tip "💡 Tip" icon:lightbulb
`mip uninstall` is a safe way to remove packages:
- Automatically cleans all configuration files.
- Does not remove the package from the global cache (saves time when reinstalling).
- Shows what was removed.

**After removal:**
1. Check that `mip.yml` has been updated.
2. Run `mip list` to confirm.
3. If in doubt, use `--no-save`.
:::

## Related commands

- [mip install](/commands/install) — install packages.
- [mip list](/commands/list) — view installed packages.
- [mip outdated](/commands/outdated) — check for outdated packages.
