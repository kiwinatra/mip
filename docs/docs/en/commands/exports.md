---
title: "mip exports — view package export paths"
description: "The exports command shows all public export paths of a package that can be imported via require or import."
---

# mip exports

::: callout info "What is this?" icon:box
`mip exports` is a utility for viewing the **exported paths** (exports) of a package. It shows which files and subpaths the package makes available for import. This is especially useful when working with packages that use `exports` in `package.json` to control their public API, or when you want to know where to import specific files (e.g., `lodash/fp`, `react-dom/server`).
:::

## Syntax

```bash
mip exports <package-name>
```

## Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `package-name` | string | ✅ | The name of the package whose exports you want to view |

## How it works

1. **Determine project directory** — the command gets the current working directory.

2. **Find the package** — via `ExportsResolver`, the command locates the installed package in the local `.mip/` cache.

3. **Read `exports`** — parses the `exports` section in the package's `package.json` (if it exists).

4. **Check availability** — for each exported path, checks whether the file physically exists.

5. **Output results** — displays a list of all available paths with an indicator of file existence (✅ or ❌).

## Examples

::: tabs
== tab "View React exports"
```bash
mip exports react
```

**Example output:**
```
📦 Exports for react:
  ✅ .
  ✅ index.js
  ✅ jsx-dev-runtime
  ✅ jsx-runtime
  ✅ react.shared-subset
  ✅ server
  ✅ server.browser
  ✅ server.node
```
:::
== tab "View Lodash exports"
```bash
mip exports lodash
```

**Example output:**
```
📦 Exports for lodash:
  ✅ .
  ✅ add
  ✅ array
  ✅ chain
  ✅ collection
  ✅ date
  ✅ fp
  ✅ function
  ✅ lang
  ✅ math
  ✅ number
  ✅ object
  ✅ seq
  ✅ string
  ✅ util
```
:::
== tab "Package with no exports"
```bash
mip exports some-old-package
```

**Example output:**
```
❌ No exports found for some-old-package
```
:::

## Common errors

::: callout warning "❌ Package not found" icon:alert-triangle
**Cause:** The specified package is not installed in the project.

**Solution:**
1. Check the list of installed packages: `mip list`
2. Install the package: `mip install <package-name>`
3. Try again: `mip exports <package-name>`
:::

::: callout info "💡 Tip" icon:lightbulb
`mip exports` is especially useful for:
- **Exploring a new package** — to understand what can be imported.
- **Migration** — when switching from CommonJS to ESM, when the package changes its export structure.
- **Working with monorepos** — to understand which subpackages are available.

Use this command before writing imports — it will show you which paths actually exist.
:::

## Related commands

- [mip info](/commands/info) — shows package information (version, description, dependencies).
- [mip list](/commands/list) — shows all installed packages.
- [mip install](/commands/install) — installs packages.

::: collapsible "🧠 What is exports in package.json?"
The `exports` field in `package.json` is a modern standard for **controlling the public API** of a package. It defines:

1. **Which files are available** — not all files in the package are public, only those listed in `exports`.
2. **How they are available** — you can configure different paths for `require` and `import`.
3. **Conditional exports** — different versions for Node.js, browser, React Native, etc.

**Example from `react/package.json`:**
```json
{
  "exports": {
    ".": {
      "require": "./index.js",
      "import": "./index.js"
    },
    "./jsx-runtime": {
      "require": "./jsx-runtime.js",
      "import": "./jsx-runtime.js"
    },
    "./server": {
      "require": "./server.node.js",
      "import": "./server.browser.js"
    }
  }
}
```

`mip exports` shows **all possible paths** that the package exports, with verification that the files actually exist.
:::

::: collapsible "🔍 Why are some paths marked ❌?"
A path may be marked ❌ if:
1. There is an entry in `exports`, but the file is physically missing (package error).
2. The export is described with conditions (`browser`, `node`, `default`), and it is not available in your environment.

In any case, if a path is marked ❌ — the import will not work. `mip exports` helps identify such issues before writing code.
:::
