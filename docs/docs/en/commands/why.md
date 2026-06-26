```markdown
---
title: "mip why — analyze package dependencies"
description: "The why command shows why a specific package is installed in your project — which other packages depend on it and which version is used."
---

# mip why

::: callout info "What is this?" icon:question
`mip why` is a command for dependency analysis. It shows why a specific package is present in your project: whether it is a direct dependency (listed in `mip.yml`) or was installed as a dependency of another package. This helps you understand the dependency tree structure, optimize it, and identify duplicate packages.
:::

## Syntax

```bash
mip why <package-name>
```

## Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `package-name` | string | ✅ | Name of the package whose dependencies you want to analyze |

## How it works

1. **Check arguments** — if no package name is provided, usage help is displayed.

2. **Read lockfile** — analyzes `mip-lock.yml` to understand the dependency structure.

3. **Search for dependencies** — checks all packages in the lockfile for dependencies on the specified package.

4. **Analyze direct dependencies** — if the package is listed in `mip.yml`, it is considered a direct dependency.

5. **Output results** — shows:
   - The version of the installed package.
   - A list of packages that depend on it.
   - The dependency level (direct or transitive).

## Examples

::: tabs
== tab "Analyze lodash dependency"
```bash
mip why lodash
```

**Example output:**
```
📦 Why is lodash installed?

  Version: 4.17.21
  Resolved: https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz

  Required by:

    └── express@4.18.2 (requires ^4.17.21)
    └── webpack@5.88.2 (requires ^4.17.21)
    └── jest@29.7.0 (requires ^4.17.20)

ℹ️ Also listed as direct dependency in mip.yml
```
:::
== tab "Analyze transitive dependency"
```bash
mip why braces
```

**Example output:**
```
📦 Why is braces installed?

  Version: 3.0.2
  Resolved: https://registry.npmjs.org/braces/-/braces-3.0.2.tgz

  Required by:

    └── eslint@8.56.0 (requires ^3.0.1)
    └── prettier@3.1.1 (requires ^3.0.0)

ℹ️ Transitive dependency (not listed in mip.yml)
```
:::
== tab "Direct dependency"
```bash
mip why express
```

**Example output:**
```
📦 Why is express installed?

  Version: 4.18.2
  Resolved: https://registry.npmjs.org/express/-/express-4.18.2.tgz

  ✅ Direct dependency (listed in mip.yml)
```
:::
== tab "Package not found"
```bash
mip why unknown-package
```

**Example output:**
```
❌ Package unknown-package not found in lockfile
```
:::
== tab "No lockfile"
```bash
mip why lodash
```

**Example output:**
```
❌ No mip-lock.yml found
💡 Run "mip install" first
```
:::

## Common errors

::: callout warning "❌ No mip-lock.yml found" icon:alert-triangle
**Cause:** Lockfile is missing (packages are not installed).

**Solution:**
1. Install packages: `mip install`
2. Try again: `mip why <package>`
:::

::: callout warning "❌ Package not found" icon:info
**Cause:** The specified package is not installed in the project.

**Solution:**
1. Check the list of installed packages: `mip list`
2. Make sure the name is spelled correctly.
3. If the package is needed — install it: `mip install <package>`
:::

::: callout tip "💡 Tip" icon:lightbulb
`mip why` is useful for:
- **Understanding structure** — why a particular package is installed.
- **Optimization** — identifying duplicate dependencies.
- **Updates** — understanding which package updates will affect others.

**Usage:**
1. Find the package you're interested in: `mip why <package>`
2. See who requires it.
3. If it's a transitive dependency — consider whether you can remove it.
:::

## Related commands

- [mip list](/commands/list) — view all installed packages.
- [mip outdated](/commands/outdated) — check for outdated packages.
- [mip dedupe](/commands/dedupe) — eliminate duplicates.

::: collapsible "🧠 How does dependency analysis work?"
`mip why` uses **two sources** of information:

**1. `mip-lock.yml` — main source:**
```yaml
packages:
  express@4.18.2:
    version: 4.18.2
    dependencies:
      accepts: ~1.3.8
      array-flatten: 1.1.1
  lodash@4.17.21:
    version: 4.17.21
    dependencies: {}
```

**2. `mip.yml` — for determining direct dependencies:**
```yaml
dependencies:
  express: ^4.18.0
  lodash: ^4.17.21
```

**Algorithm:**
1. Get all packages from `mip-lock.yml`.
2. For each package, check its `dependencies`.
3. If the target package is found among them — add to `dependents` list.
4. Check if the package is in `mip.yml`.
5. Output the result.

**Dependency levels:**
- **Direct** — listed in `mip.yml`.
- **Transitive** — installed as a dependency of another package.
:::
```