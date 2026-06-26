---
title: "mip link — local package linking for development"
description: "The link command allows you to create a global link to a local package and use it in other projects, simplifying the development of interconnected packages without publishing to the registry."
---

# mip link

::: callout info "What is this?" icon:link
`mip link` is a tool for local development of interconnected packages. Instead of constantly publishing changes to the registry and updating versions, you can create a global link to a local package and use it in other projects as a regular dependency. This significantly speeds up the development of libraries, plugins, and monorepos.
:::

## Syntax

```bash
mip link [package-name]
```

## Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `package-name` | string | ❌ | Name of the package to link. If not specified — creates a link from the current package. |

## How it works

### `mip link` (no arguments)
1. Checks for a config file (`mip.yml` or `package.json`) in the current directory.
2. Creates the global folder `~/.mip-links/`.
3. Creates a symbolic link from `~/.mip-links/<package-name>` to the current directory.
4. Outputs confirmation of successful link creation.

### `mip link <package-name>`
1. Checks for the existence of a global link in `~/.mip-links/`.
2. If the link is not found — displays a list of available links.
3. If the link is found:
   - Creates the `node_modules/` folder (if it doesn't exist).
   - Creates a symbolic link from `node_modules/<package-name>` to the target package.
   - Adds information about the linked package to the manifest (`.mip/manifest.json`).
   - Adds information about the linked package to the config (`mip.yml`).

## Examples

::: tabs
== tab "Create a global link from the current package"
```bash
cd ~/dev/my-lib
mip link
```

**Example output:**
```
✅ Created global link: my-lib -> /home/user/dev/my-lib
```

Now the package `my-lib` is globally available as `my-lib`.
:::
== tab "Use a linked package in another project"
```bash
cd ~/dev/my-app
mip link my-lib
```

**Example output:**
```
✅ Added to manifest: my-lib@1.0.0
✅ Added to config: my-lib
✅ Linked my-lib@1.0.0 -> /home/user/dev/my-lib
```

Now `my-app` can use `my-lib` as a regular dependency.
:::
== tab "View available global links"
```bash
mip link unknown-package
```

**Example output:**
```
❌ No global link found for "unknown-package"

📦 Available links:
  • my-lib -> /home/user/dev/my-lib
  • shared-utils -> /home/user/dev/shared-utils
```
:::
== tab "Attempt to create a link without a config"
```bash
cd ~/dev/empty-folder
mip link
```

**Example output:**
```
❌ No config file found (mip.yml, mip.json, or package.json)
💡 Run "mip init" first
```
:::

## Common errors

::: callout warning "❌ No config file found" icon:alert-triangle
**Cause:** No config file (`mip.yml`, `mip.json`, or `package.json`) in the current folder.

**Solution:**
1. Create `mip.yml`: `mip init`
2. Specify the package name in `mip.yml`.
3. Retry: `mip link`
:::

::: callout warning "❌ No global link found" icon:alert-circle
**Cause:** You are trying to use a package that has not been globally linked.

**Solution:**
1. Navigate to the package folder you want to link.
2. Create a global link: `mip link`
3. Return to your project and use: `mip link <package-name>`
:::

::: callout danger "❌ Linked package is invalid" icon:skull
**Cause:** The target package is corrupted or deleted.

**Solution:**
1. Check that the target folder exists and contains a config.
2. If the package was moved — recreate the link: `mip link` in the package folder.
:::

::: callout tip "💡 Tip" icon:lightbulb
`mip link` is ideal for:
- **Library development** — test changes in a real project without publishing.
- **Monorepos** — link packages together.
- **Plugins** — develop plugins locally and use them in your project.

**After changes in the package:** changes are applied instantly (thanks to symbolic links). No need to reinstall the package!
:::

## Related commands

- [mip install](/commands/install) — install packages from the registry.
- [mip uninstall](/commands/uninstall) — remove linked packages.
- [mip list](/commands/list) — view installed packages (including linked ones).

::: collapsible "🧠 How does symbolic linking work?"
MIP uses two levels of symbolic links:

1. **Global link** (`~/.mip-links/<package-name>` → `<path-to-package>`)
   - Created once for each package.
   - Allows referencing the package from any project.

2. **Local link** (`node_modules/<package-name>` → `~/.mip-links/<package-name>`)
   - Created in each project that uses the linked package.
   - Points to the global link (which in turn points to the actual folder).

**Advantages:**
- Changes in the package are visible instantly (no need to reinstall).
- No need to publish intermediate versions to the registry.
- Easy debugging.

**Limitations:**
- Symbolic links do not work on all file systems (e.g., Windows may require administrator privileges).
- When moving a package, links become invalid (need to be recreated).
:::
