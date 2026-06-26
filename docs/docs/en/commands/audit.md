---
title: "mip audit — dependency security check"
description: "The audit command analyzes the dependency tree for known vulnerabilities, reports issues, and suggests automatic fixes."
---

# mip audit

::: callout info "What is this?" icon:shield
`mip audit` scans all installed packages and their dependencies, comparing them against a vulnerability database (GitHub Advisory Database, npm Security). You receive a report of critical, high, moderate, and low vulnerabilities, along with upgrade recommendations.
:::

## Syntax

```bash
mip audit [--fix]
```

## Options

| Flag | Description |
|------|-------------|
| `--fix` | Automatically update vulnerable packages to safe versions (if possible) |

## How it works

1. **Read the lockfile** — the command checks whether `mip-lock.yml` exists in the current directory. If it’s missing, execution stops.

2. **Scan dependencies** — for each package from the lockfile, the command sends a request to the npm registry to get a list of known vulnerabilities.

3. **Filtering** — it checks whether the current package version matches `vulnerable_versions` from the vulnerability database.

4. **Sorting** — all found vulnerabilities are sorted by CVSS score (from most critical to least dangerous).

5. **Output report** — vulnerabilities are grouped by severity: 🔴 Critical, 🟠 High, 🟡 Moderate, 🔵 Low.

If `--fix` is specified:
6. **Find fixes** — for each vulnerability, it checks whether `patched_versions` exists.
7. **Update packages** — runs `mip install <pkg>@<fixed-version>`.
8. **Sync `mip.yml`** — automatically updates `mip.yml`.

## Examples

::: tabs
== tab "Standard check"
```bash
mip audit
```

It prints a list of all vulnerabilities, including:
- Package name and version
- Severity level and description
- CVSS score
- Available patches or a recommendation to update manually
- A link to the detailed vulnerability description

**Example output:**
```
🔍 Scanning dependencies... (42 packages)

🔴 lodash@4.17.19 (critical)
   Prototype Pollution vulnerability
   CVSS: 9.8
   Fix: 4.17.20
   https://github.com/advisories/GHSA-xxx

🟠 axios@0.21.1 (high)
   Server-Side Request Forgery
   CVSS: 7.5
   Fix: 0.21.2
   https://github.com/advisories/GHSA-yyy

📊 Summary:
   🔴 Critical: 1
   🟠 High: 1
   🟡 Moderate: 0
   🔵 Low: 0

💡 Run 'mip audit --fix' to auto-fix updateable vulnerabilities.
```
:::

== tab "Auto-fix"
```bash
mip audit --fix
```

1. Finds all vulnerable packages.
2. For each vulnerability, checks that a patched version exists **within the same current major release** (to avoid breaking changes).
3. Automatically updates the package and syncs `mip.yml`.
4. Reports which packages were updated.
:::
:::

## Common errors

::: callout warning "❌ ERR_NO_CONNECTION" icon:alert-triangle
**Cause:** Failed to connect to the npm registry (network issues or the registry is unavailable).

**Resolution:**
1. Check your internet connection.
2. Make sure the npm registry is reachable.
3. If you’re using a proxy, configure environment variables.
:::

::: callout danger "❌ lock_not_found" icon:skull
**Cause:** `mip-lock.yml` is missing in the current directory.

**Resolution:**
1. Make sure you’re in the project root with `mip.yml`.
2. Run `mip install` to create the lockfile.
3. Try again: `mip audit`.
:::

::: callout warning "⚠️ update_failed" icon:alert-circle
**Cause:** Could not install the patched package version (dependency conflicts or registry error).

**Resolution:**
1. Check whether the specified package version exists in the registry.
2. Try installing the patch manually: `mip install <pkg>@<version>`.
3. Check for conflicts with other dependencies.
:::

::: callout info "🔄 Auto-fix only within the same major release" icon:info
`mip audit --fix` will never upgrade a package to a version with a different major number (for example, `1.x` → `2.x`). This prevents potential breaking changes. If a safe version requires changing the major, the command will ask you to update manually.
:::

## Related commands

- [mip outdated](/commands/outdated) — shows outdated packages (not only vulnerabilities)
- [mip update](/commands/update) — updates all packages to the latest versions
- [mip doctor](/commands/doctor) — checks the overall project health (including dependency conflicts)

::: collapsible "🔧 How patch search works"
When `--fix` is enabled, the command:
1. Checks whether `patched_versions` exists.
2. Parses the list of available patches.
3. Selects the **minimum** version that is higher than the current one **within the same major release**.
4. Runs `mip install <pkg>@<version>`.
5. Updates `mip.yml`.

This approach guarantees minimal changes and a safe update.
:::

