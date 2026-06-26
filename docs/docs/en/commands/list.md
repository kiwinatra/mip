---
title: "mip list — list installed packages"
description: "The list command shows all packages installed in the current project with their versions, source (global cache or local), and status."
---

# mip list

::: callout info "What is this?" icon:list
`mip list` is a command for viewing all packages installed in the current project. It shows packages from the `.mip/manifest.json` manifest, their versions, and paths in the global cache. This is convenient for quickly checking dependency status.
:::

## Syntax

```bash
mip list
```

## How it works

1. **Check `mip.yml`** — if the file is missing, the command outputs an error message.

2. **Read manifest** — all installed packages are extracted from `.mip/manifest.json`.

3. **Determine source** — for each package, the following is shown:
   - 🌍 — package from the global cache `~/.mip/store/`
   - 🔗 — package linked via `mip link`
   - 📁 — local package (for backward compatibility)

4. **Display versions and paths** — for each package, the version and path in the global cache are shown.

5. **Total count** — total number of packages.

## Examples

::: tabs
== tab "View installed packages"
```bash
mip list
```

**Example output:**
```
📦 Installed packages:

  🌍 express@4.18.2
     /home/user/.mip/store/express/4.18.2
  🌍 lodash@4.17.21
     /home/user/.mip/store/lodash/4.17.21
  🌍 jest@29.7.0
     /home/user/.mip/store/jest/29.7.0

📊 Total: 3 package(s)
```
:::
== tab "Empty project (no packages)"
```bash
mip list
```

**Example output:**
```
📦 Installed packages:

  (no packages installed)

📊 Total: 0 package(s)
```
:::
== tab "Linked packages"
```bash
mip list
```

**Example output:**
```
📦 Installed packages:

  🔗 my-lib@1.0.0
     /home/user/dev/my-lib
  🌍 lodash@4.17.21
     /home/user/.mip/store/lodash/4.17.21

📊 Total: 2 package(s)
```
:::

## Icon meanings

| Icon | Meaning |
|------|---------|
| 🌍 | Package from global cache (`~/.mip/store/`) |
| 🔗 | Locally linked package (via `mip link`) |
| 📁 | Local package (backward compatibility) |

## Common errors

::: callout warning "❌ No mip.yml found" icon:alert-triangle
**Cause:** You are not in the root of a MIP project.

**Solution:**
1. Navigate to the project folder: `cd /path/to/project`
2. Make sure `mip.yml` exists there.
3. If not — create it: `mip init`
:::

::: callout tip "💡 Tip" icon:lightbulb
`mip list` is the first command for diagnostics:
- Check that all packages are installed.
- Ensure paths in the manifest are correct.
- Review package versions before updating.

Use `mip list` before `mip outdated` to understand what you have installed.
:::

## Related commands

- [mip install](/commands/install) — install packages.
- [mip outdated](/commands/outdated) — check for outdated packages.
- [mip doctor](/commands/doctor) — project diagnostics.
