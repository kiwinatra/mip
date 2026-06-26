---
title: "mip search — search for packages in the registry"
description: "The search command searches the npm registry for packages matching a keyword, showing the name, version, and description."
---

# mip search

::: callout info "What is this?" icon:search
`mip search` is a command for searching packages in the npm registry. It takes a keyword and returns a list of matching packages, with their version and a brief description. This is useful when you are looking for a library for your project but don't know the exact name.
:::

## Syntax

```bash
mip search <query>
```

## Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | string | ✅ | Keyword or phrase to search for |

## How it works

1. **Check arguments** — if no query is provided, usage help is displayed.

2. **Send request to registry** — the command performs a search via the npm registry API.

3. **Get results** — returns up to 20 packages matching the query.

4. **Format output** — for each package, shows:
   - Name and version.
   - Description (truncated to 70 characters).

5. **Report count** — shows the total number of packages found.

## Examples

::: tabs
== tab "Search by keyword"
```bash
mip search express
```

**Example output:**
```
🔍 Searching for packages matching: express...

Found 15 packages:

├── express@4.18.2
    📝 Fast, unopinionated, minimalist web framework for Node.js

├── express-graphql@0.12.0
    📝 GraphQL HTTP server middleware for Express

├── express-session@1.17.3
    📝 Session middleware for Express.js

└── express-validator@7.0.1
    📝 Express.js middleware for request validation
```
:::
== tab "Search with scope prefix"
```bash
mip search @docmd/core
```

**Example output:**
```
🔍 Searching for packages matching: @docmd/core...

Found 3 packages:

├── @docmd/core@0.8.7
    📝 Documentation engine from Markdown

├── @docmd/plugin-openapi@0.8.7
    📝 OpenAPI plugin for docmd

└── @docmd/plugin-mermaid@0.8.7
    📝 Mermaid plugin for docmd
```
:::
== tab "Nothing found"
```bash
mip search some-very-rare-package
```

**Example output:**
```
🔍 Searching for packages matching: some-very-rare-package...

❌ No packages found
```
:::
== tab "Empty query"
```bash
mip search
```

**Example output:**
```
📋 Usage: mip search <query>
```
:::

## Common errors

::: callout warning "❌ No packages found" icon:info
**Cause:** Nothing was found for your query.

**Solution:**
1. Check the spelling.
2. Try a different keyword.
3. The package may have been removed or be unavailable.
:::

::: callout warning "❌ Failed to search" icon:alert-circle
**Cause:** Network issues or the npm registry is unavailable.

**Solution:**
1. Check your internet connection.
2. Check registry availability: `mip doctor`
3. Try again later.
:::

::: callout tip "💡 Tip" icon:lightbulb
`mip search` is the first step before installing a package:
1. Use `mip search` to find the package you need.
2. Check the description and version.
3. Install the package: `mip install <package>`.

**Search tips:**
- Use general keywords (e.g., `http` instead of `http-client`).
- For frameworks, use their name (e.g., `react`, `vue`).
- For scoped packages, specify the full name: `@namespace/package`.
:::

## Related commands

- [mip info](/commands/info) — detailed information about a package.
- [mip install](/commands/install) — install the found package.
- [mip list](/commands/list) — view already installed packages.
