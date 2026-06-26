---
title: "mip info — get package information"
description: "The info command shows detailed information about a package from the registry: description, author, versions, homepage, repository, and publication date."
---

# mip info

::: callout info "What is this?" icon:info
`mip info` is a utility for quickly retrieving information about any package from the npm registry. It shows the description, author, versions, links to the homepage and repository, as well as the publication date. This is useful for exploring a new package before installation, checking version currency, or finding a link to the documentation.
:::

## Syntax

```bash
mip info <package-name>
```

## Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `package-name` | string | ✅ | The name of the package to get information about |

## How it works

1. **Argument check** — if no package name is provided, usage help is displayed.

2. **Parallel request** — two requests are made to the registry simultaneously:
   - Fetching information about the latest version of the package.
   - Fetching a list of all available versions.

3. **Report generation** — from the retrieved data, an information card is assembled:
   - Package name and latest version.
   - Description.
   - Author.
   - Homepage.
   - Number of available versions.
   - Publication date.
   - Repository link.

4. **Recent versions list** — shows the last 5 versions with a marker for the current one.

## Examples

::: tabs
== tab "Information about a popular package"
```bash
mip info lodash
```

**Example output:**
```
🔍 Fetching info for lodash...
╔═══════════════════════════════════════╗
║ lodash@4.17.21
╠═══════════════════════════════════════╣
📝 Description
  Lodash modular utilities.

👤 Author
  John-David Dalton <john.david.dalton@gmail.com>

🏠 Homepage
  https://lodash.com/

📦 Versions
  Latest: 4.17.21
  Total: 154

📅 Published
  2023-01-01

📦 Repository
  git+https://github.com/lodash/lodash.git

Recent versions:
  • 4.17.21 (latest)
  • 4.17.20
  • 4.17.19
  • 4.17.18
  • 4.17.17
```
:::
== tab "Information about a newer package"
```bash
mip info @docmd/core
```

**Example output:**
```
🔍 Fetching info for @docmd/core...
╔═══════════════════════════════════════╗
║ @docmd/core@0.8.7
╠═══════════════════════════════════════╣
📝 Description
  Documentation engine from Markdown.

👤 Author
  docmd.io

🏠 Homepage
  https://docmd.io

📦 Versions
  Latest: 0.8.7
  Total: 42

📅 Published
  2026-01-15

📦 Repository
  git+https://github.com/docmd-io/docmd.git

Recent versions:
  • 0.8.7 (latest)
  • 0.8.6
  • 0.8.5
  • 0.8.4
  • 0.8.3
```
:::
== tab "Package not found"
```bash
mip info unknown-package
```

**Example output:**
```
🔍 Fetching info for unknown-package...
❌ Failed to fetch info: Not found
```
:::

## Common errors

::: callout warning "❌ Package not found" icon:alert-triangle
**Cause:** The specified package does not exist in the npm registry.

**Solution:**
1. Check the spelling of the package name.
2. The package may be private and require authentication.
3. Try searching for the package: `mip search <partial-name>`
:::

::: callout warning "❌ Failed to fetch info" icon:alert-circle
**Cause:** Network issues or the npm registry is unavailable.

**Solution:**
1. Check your internet connection.
2. Check registry availability: `mip doctor`
3. Try again later.
:::

::: callout tip "💡 Tip" icon:lightbulb
`mip info` shows information **from the registry**, not from a locally installed package. To find the version of a locally installed package, use `mip list` or check `mip-lock.yml`.
:::

## Related commands

- [mip search](/commands/search) — searches for packages in the registry.
- [mip list](/commands/list) — shows locally installed packages.
- [mip outdated](/commands/outdated) — checks for outdated packages in the project.
