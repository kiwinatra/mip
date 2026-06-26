---
title: "mip update — update packages to the latest versions"
description: "The update command checks for updates for all dependencies and installs them after user confirmation."
---

# mip update

::: callout info "What is this?" icon:arrow-up
`mip update` is a command for updating all packages in your project to the latest available versions. It checks each dependency from `mip.yml`, shows a list of packages that can be updated, and after confirmation installs new versions. This is a convenient way to keep your project up to date without manually editing `mip.yml`.
:::

## Syntax

```bash
mip update
```

## How it works

1. **Read `mip.yml`** — loads all dependencies from `dependencies` and `devDependencies`.

2. **Parallel check** — for each package, a request is made to the registry to get the latest version.

3. **Compare versions** — if the latest version differs from the current one, the package is added to the update list.

4. **Check global cache** — shows whether the package will be taken from the global cache (`🌍`) or downloaded again (`📡`).

5. **Check manifest** — shows whether the package is installed in the project (`📋`) or not (`❌`).

6. **Display list** — shows all packages that can be updated, with current and new versions, as well as cache and manifest status.

7. **Request confirmation** — asks the user: *"Update these packages? (y/N)"*.

8. **Install updates** — on confirmation, installs new versions with forced reload (`force: true`).

9. **Update lockfile** — automatically updates `mip-lock.yml` with new versions.

## Examples

::: tabs
== tab "Updates available"
```bash
mip update
```

**Output:**
```
📦 Checking for updates (3 packages)...

Found 2 updates:

  lodash: 4.17.19 → 4.17.21 (🌍 📋)
  express: 4.17.1 → 4.18.2 (📡 ❌)

Update these packages? (y/N) y

🔄 Updating packages...
  ✅ lodash@4.17.21 installed
  ✅ express@4.18.2 installed

✅ All packages updated!
```
:::
== tab "All packages up to date"
```bash
mip update
```

**Output:**
```
📦 Checking for updates (3 packages)...

✨ All packages are up to date!
```
:::
== tab "Update cancelled"
```bash
mip update
```

**Output:**
```
📦 Checking for updates (3 packages)...

Found 2 updates:

  lodash: 4.17.19 → 4.17.21 (🌍 📋)
  express: 4.17.1 → 4.18.2 (📡 ❌)

Update these packages? (y/N) n

❌ Update cancelled
```
:::

## Icon explanations

| Icon | Meaning |
|------|---------|
| 🌍 | Package already in global cache |
| 📡 | Package will be downloaded from the registry |
| 📋 | Package installed in the project (in manifest) |
| ❌ | Package not in manifest |

## Common errors

::: callout warning "❌ No mip.yml found" icon:alert-triangle
**Cause:** You are not in the root of a MIP project.

**Solution:**
1. Navigate to the project folder: `cd /path/to/project`
2. Make sure `mip.yml` exists there.
3. If not — create it: `mip init`
:::

::: callout warning "⚠️ Check failed for package" icon:alert-circle
**Cause:** Failed to get package information from the registry.

**Solution:**
1. Check your internet connection.
2. Check the package name in `mip.yml`.
3. Try again later.
:::

::: callout tip "💡 Tip" icon:lightbulb
`mip update` is a safe way to update:
- Shows all changes before installation.
- Does not update packages without your consent.
- Automatically updates the lockfile.

**After updating:**
1. Check that the project works: `mip run test`
2. If there are issues — use `mip install` to reinstall.
3. Commit the updated `mip.yml` and `mip-lock.yml`.
:::

## Related commands

- [mip outdated](/commands/outdated) — check outdated packages (without installation).
- [mip install](/commands/install) — install a specific package.
- [mip audit](/commands/audit) — security check.

::: collapsible "🧠 How does update work?"
`mip update` performs updates through the existing installation mechanism:

**Steps:**
1. **Version check** — for each package, gets the latest version from the registry.
2. **Comparison** — if the latest version differs from the current one, the package is added to the list.
3. **Installation** — calls `installPackage()` with the `force: true` flag, which:
   - Overwrites the existing package in the global cache.
   - Updates `mip-lock.yml`.
   - Does not change `mip.yml` (the version range remains the same).

**Important:** `mip update` updates packages **to the latest version**, regardless of the range in `mip.yml`. If you want to update only within the range — use `mip install` with a specific version.

**Example:**
```yaml
# mip.yml
dependencies:
  lodash: ^4.17.0  # range allows 4.17.x
```
- `mip update` will install `4.17.21` (the latest in the range).
- `mip install lodash` will install `4.17.21` (if no lockfile) or `4.17.19` (from the lockfile).
:::

::: collapsible "🔍 update vs install comparison"
| Command | What it does | Updates `mip.yml` | Updates `mip-lock.yml` | Confirmation |
|---------|--------------|-------------------|------------------------|--------------|
| `mip update` | Updates all packages to the latest versions | ❌ | ✅ | ✅ Asks |
| `mip install` | Installs packages (from lockfile) | ❌ | ✅ | ❌ No |
| `mip install <pkg>` | Installs a specific package | ✅ (unless `--no-save`) | ✅ | ❌ No |

**Recommendation:**
- Use `mip outdated` to check.
- Then `mip update` to update with confirmation.
- For CI, use `mip ci` (no updates).
:::
