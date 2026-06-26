---
title: "mip legacy — work with legacy packages"
description: "The legacy command helps identify and handle legacy packages that have not been updated for a long time or use outdated formats."
---

# mip legacy

::: callout info "What is this?" icon:clock
`mip legacy` is a utility for working with legacy packages in your project. It helps identify packages that have not been updated for a long time, contain outdated dependency formats, or require manual intervention. The command allows you to view a list of such packages, try to automatically fix them, or clean up emulation of old dependencies.
:::

## Syntax

```bash
mip legacy <action> [package-name]
```

## Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `action` | string | ✅ | Action: `list`, `fix`, `clean` |
| `package-name` | string | ❌ | Package name (required for `fix`) |

## Available actions

| Action | Description |
|--------|-------------|
| `list` | Shows all legacy packages in the project |
| `fix` | Attempts to fix a legacy package (emulates dependencies) |
| `clean` | Cleans up emulations of old dependencies |

## How it works

### `list`
1. Scans the `.mip/` folder for installed packages.
2. For each package, checks whether it is "legacy" (according to `LegacyFallback` criteria).
3. Outputs a list of such packages with a fix hint.

### `fix`
1. Takes a package name.
2. Runs the dependency emulation mechanism via `emulateDependencies()`.
3. Outputs a report on how many dependencies were emulated.

### `clean`
1. Cleans up all legacy dependency emulations.
2. Outputs the number of emulations removed.

## Examples

::: tabs
== tab "List legacy packages"
```bash
mip legacy list
```

**Example output:**
```
🔍 Checking for legacy packages...

⚠️ Found 3 legacy packages:
  • lodash@4.17.19 (deprecated)
  • request@2.88.2 (unmaintained)
  • moment@2.29.1 (legacy format)

💡 Run 'mip legacy fix <package>' to try automatic fix
```
:::
== tab "Fix a legacy package"
```bash
mip legacy fix lodash
```

**Example output:**
```
🔧 Fixing package: lodash
✅ Emulated dependencies for lodash: 3 dependencies resolved
```
:::
== tab "Clean emulations"
```bash
mip legacy clean
```

**Example output:**
```
🧹 Cleaned emulation: 5 entries removed
```
:::
== tab "No legacy packages"
```bash
mip legacy list
```

**Example output:**
```
🔍 Checking for legacy packages...
✅ No legacy packages found
```
:::

## Common errors

::: callout warning "❌ No packages found" icon:alert-triangle
**Cause:** No packages are installed in the project (`.mip/` folder is missing or empty).

**Solution:**
1. Install packages: `mip install`
2. Then retry: `mip legacy list`
:::

::: callout warning "❌ Package not found for fix" icon:alert-circle
**Cause:** The specified package is not legacy or is not installed.

**Solution:**
1. Check the list of legacy packages: `mip legacy list`
2. Make sure the package name is spelled correctly.
:::

::: callout tip "💡 Tip" icon:lightbulb
Regularly run `mip legacy list` to track package deprecation:
- Packages that haven't been updated for over 2 years may contain vulnerabilities.
- Outdated formats can slow down installation.
- It is recommended to replace legacy packages with modern alternatives (e.g., `request` → `axios`).
:::

## Related commands

- [mip outdated](/commands/outdated) — shows version-outdated packages.
- [mip audit](/commands/audit) — checks packages for vulnerabilities.
- [mip update](/commands/update) — updates packages to the latest versions.
- [mip doctor](/commands/doctor) — diagnoses project state.

::: collapsible "🧠 What makes a package 'legacy'?"
MIP defines legacy packages by several criteria:

1. **Publication date** — package has not been updated for more than 2 years.
2. **Dependency format** — uses outdated format (e.g., `peerDependencies` in old style).
3. **Registry warnings** — package is marked as `deprecated` in the npm registry.
4. **Critical vulnerabilities** — package contains vulnerabilities with no patches available.

**Check example:**
```javascript
// Example criterion from LegacyFallback
isLegacyPackage(pkgName) {
  const pkgInfo = this.getPackageInfo(pkgName);
  if (!pkgInfo) return false;
  
  // Check last update date
  const lastUpdated = new Date(pkgInfo.lastUpdated);
  const yearsOld = (Date.now() - lastUpdated) / (365 * 24 * 60 * 60 * 1000);
  if (yearsOld > 2) return true;
  
  // Check deprecated flag
  if (pkgInfo.deprecated) return true;
  
  return false;
}
```

**Dependency emulation:**
With `mip legacy fix`, MIP attempts to automatically resolve conflicts in legacy packages by creating dependency emulations that allow the package to work in a modern environment.
:::

::: collapsible "🔍 Practical recommendations"
**What to do with legacy packages?**

1. **Check alternatives** — often there are modern replacements:
   - `request` → `axios` or `node-fetch`
   - `moment` → `day.js` or `date-fns`
   - `lodash` → using built-in methods

2. **Try updating** — `mip update <package>` may solve the problem.

3. **Use `mip legacy fix`** — if automatic fix works, verify the application still functions correctly.

4. **Plan migration** — if the package is unmaintained, plan a transition to an alternative.

**Important:** Legacy packages are not always bad. If a package is stable and has no vulnerabilities, it can be kept. But regular auditing helps avoid future problems.
:::
