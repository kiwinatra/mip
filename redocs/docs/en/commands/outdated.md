---
title: "mip outdated — check for outdated packages"
description: "The outdated command compares installed package versions with the latest versions in the registry and shows which packages need updating."
---

# mip outdated

::: callout info "What is this?" icon:clock
`mip outdated` is a command for checking outdated packages in your project. It compares package versions specified in `mip.yml` with the latest available versions in the npm registry. The command shows which packages can be updated and outputs the result in a convenient table or JSON for automation.
:::

## Syntax

```bash
mip outdated [--json]
```

## Options

| Flag | Description |
|------|-------------|
| `--json` | Outputs the result in JSON format (useful for CI/CD and scripts) |

## How it works

1. **Read `mip.yml`** — the command loads dependencies from `dependencies` and `devDependencies`.

2. **Check currency** — for each package, a request is made to the npm registry to get the latest version.

3. **Compare versions** — if the version from `mip.yml` differs from the latest in the registry, the package is considered outdated.

4. **Check global cache** — shows whether the package is in the global cache (`🌍`) or needs to be downloaded (`📡`).

5. **Check manifest** — shows whether the package is installed in the project (`📋`) or not (`❌`).

6. **Output result**:
   - **Normal mode** — table with columns: `Package`, `Current`, `Latest`, `Store`, `Manifest`.
   - **JSON mode** (`--json`) — structured output for automation.

7. **Exit code** — in JSON mode, returns code `1` if there are outdated packages (useful for CI).

## Examples

::: tabs
== tab "Check outdated packages"
```bash
mip outdated
```

**Example output:**
```
🔍 Checking for outdated packages...

┌─────────────────────┬──────────────┬──────────────┬────────────┬────────────┐
│ Package             │ Current      │ Latest       │ Store      │ Manifest   │
├─────────────────────┼──────────────┼──────────────┼────────────┼────────────┤
│ ⚠️ lodash           │ 4.17.19      │ 4.17.21      │ 🌍         │ 📋         │
│ ⚠️ express          │ 4.17.1       │ 4.18.2       │ 📡         │ ❌         │
└─────────────────────┴──────────────┴──────────────┴────────────┴────────────┘

📊 2 package(s) outdated out of 3

💡 Run "mip update" to update all packages
```
:::
== tab "All packages up to date"
```bash
mip outdated
```

**Example output:**
```
🔍 Checking for outdated packages...

┌─────────────────────┬──────────────┬──────────────┬────────────┬────────────┐
│ Package             │ Current      │ Latest       │ Store      │ Manifest   │
├─────────────────────┼──────────────┼──────────────┼────────────┼────────────┤
│ ✅ lodash           │ 4.17.21      │ 4.17.21      │ 🌍         │ 📋         │
│ ✅ express          │ 4.18.2       │ 4.18.2       │ 🌍         │ 📋         │
└─────────────────────┴──────────────┴──────────────┴────────────┴────────────┘

📊 0 package(s) outdated out of 2
```
:::
== tab "JSON output for CI/CD"
```bash
mip outdated --json
```

**Example output:**
```json
{
  "packages": [
    {
      "name": "lodash",
      "current": "4.17.19",
      "latest": "4.17.21",
      "outdated": true,
      "cached": true,
      "inManifest": true
    },
    {
      "name": "express",
      "current": "4.17.1",
      "latest": "4.18.2",
      "outdated": true,
      "cached": false,
      "inManifest": false
    }
  ]
}
```
:::

## Column explanations

| Column | Meaning |
|--------|---------|
| `Package` | Package name |
| `Current` | Current version in the project |
| `Latest` | Latest version in the registry |
| `Store` | 🌍 — in global cache, 📡 — will be downloaded |
| `Manifest` | 📋 — installed in project, ❌ — missing |

## Common errors

::: callout warning "❌ No mip.yml found" icon:alert-triangle
**Cause:** You are not in the root of a MIP project.

**Solution:**
1. Navigate to the project folder: `cd /path/to/project`
2. Make sure `mip.yml` exists there.
3. If not — create it: `mip init`
:::

::: callout warning "❌ Package not found in registry" icon:alert-circle
**Cause:** Package not found in the npm registry (possibly a typo or the package was removed).

**Solution:**
1. Check the package name in `mip.yml`.
2. Make sure the package exists in the registry.
3. Fix the name and try again.
:::

::: callout tip "💡 Tip" icon:lightbulb
`mip outdated` is the first step before updating:
1. Run `mip outdated` to see what needs updating.
2. Check which packages have breaking changes.
3. Update packages: `mip update` or `mip update <package>`.

**In CI/CD:**
Use `mip outdated --json` for automatic checking and team notifications.
:::

## Related commands

- [mip update](/commands/update) — update packages to the latest versions.
- [mip install](/commands/install) — install packages.
- [mip audit](/commands/audit) — check package security.
- [mip list](/commands/list) — view installed packages.

::: collapsible "🧠 How does version comparison work?"
MIP uses **semantic versioning** for comparison:

1. **Exact comparison** — versions are compared as strings (if `current` === `latest`, the package is up to date).

2. **Examples:**
   - `4.17.19` vs `4.17.21` → outdated.
   - `4.17.21` vs `4.17.21` → up to date.
   - `^4.17.0` vs `4.18.0` → outdated (if the range doesn't include the new version).

3. **Important:** The command compares **exact versions**, not ranges. If `mip.yml` specifies a range, the command shows the version that is actually installed (from the lockfile or global cache).

**`--json` flag:**
Use for:
- Automatic notifications in chats.
- Integration with CI/CD pipelines.
- Generating dependency status reports.
:::
