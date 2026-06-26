---
title: "mip global — manage global packages"
description: "The global command allows you to install, remove, and list packages installed globally for use anywhere in the system."
---

# mip global

::: callout info "What is this?" icon:globe
`mip global` is a command for managing **globally installed packages**. Unlike regular installation (which uses the global cache and symlinks in the project), global installation places packages in `~/.mip/global/` and makes their binaries available from anywhere via the command line. This is convenient for tools you use across all projects, such as test runners, linters, or code generators.
:::

## Syntax

```bash
mip global <action> [package-name]
```

## Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `action` | string | ✅ | Action: `install`, `uninstall`, `list` |
| `package-name` | string | ❌ | Package name (required for `install` and `uninstall`) |

## Available actions

| Action | Description |
|--------|-------------|
| `install` | Installs a package globally, automatically adds the binary to PATH |
| `uninstall` | Removes a globally installed package |
| `list` | Shows a list of all globally installed packages |

## How it works

### `install`
1. Creates the global directory `~/.mip/global/` (if it doesn't exist).
2. Changes to that directory.
3. If `mip.json` is missing — creates it via `mip init`.
4. Installs the specified package via `mip install`.
5. Removes the temporary `mip.json` (if it was created).
6. Checks whether the global folder (`~/.mip/global/node_modules/.bin`) is in PATH.
7. If not — adds it to `.zshrc` or `.bashrc`.

### `uninstall`
1. Removes the package folder from `~/.mip/global/node_modules/`.
2. Reports successful removal or that the package was not found.

### `list`
1. Scans the `~/.mip/global/node_modules/` folder.
2. Outputs a list of all installed packages (excluding internal ones).

## Examples

::: tabs
== tab "Install a global package"
```bash
mip global install eslint
```

**Example output:**
```
🌍 Installing eslint globally...
✅ Added to PATH in /home/user/.zshrc
🔄 Run: source /home/user/.zshrc
✅ eslint installed globally
📁 Location: /home/user/.mip/global/node_modules/.bin/eslint
```

Now you can use `eslint` from anywhere:
```bash
eslint --fix src/
```
:::
== tab "Install multiple packages"
```bash
mip global install jest typescript nodemon
```

**Example output:**
```
🌍 Installing jest globally...
✅ jest installed globally
🌍 Installing typescript globally...
✅ typescript installed globally
🌍 Installing nodemon globally...
✅ nodemon installed globally
```
:::
== tab "List global packages"
```bash
mip global list
```

**Example output:**
```
🌍 Globally installed packages:

  • eslint
  • jest
  • typescript
  • nodemon

📊 Total: 4
```
:::
== tab "Uninstall a global package"
```bash
mip global uninstall eslint
```

**Example output:**
```
🗑️ Uninstalling eslint globally...
✅ eslint removed globally
```
:::
== tab "Attempt to remove a non-existent package"
```bash
mip global uninstall some-package
```

**Example output:**
```
🗑️ Uninstalling some-package globally...
❌ some-package not found globally
```
:::

## Common errors

::: callout warning "⚠️ Package not found" icon:alert-triangle
**Cause:** The specified package does not exist in the registry.

**Solution:**
1. Check the spelling of the package name.
2. Make sure the package is available in the registry: `mip search <package-name>`
:::

::: callout info "🔄 PATH not updated" icon:info
**Cause:** The global folder has not been added to PATH.

**Solution:**
After installation, the command tries to add PATH automatically. If it doesn't work — add it manually:
```bash
echo 'export PATH="$PATH:~/.mip/global/node_modules/.bin"' >> ~/.zshrc
source ~/.zshrc
```
:::

::: callout tip "💡 Tip" icon:lightbulb
**When to use global installation:**
- Tools you use **across all projects** (e.g., `eslint`, `prettier`, `jest`).
- CLI utilities that should be available from anywhere (e.g., `create-react-app`, `vue-cli`).

**When NOT to use global installation:**
- Dependencies specific to a single project.
- Packages that may conflict across different project versions.

**Best practice:** Prefer local installations (`mip install`) for projects, and use global only for universal tools.
:::

## Related commands

- [mip install](/commands/install) — local installation in the current project.
- [mip list](/commands/list) — shows locally installed packages.
- [mip doctor](/commands/doctor) — environment diagnostics (checks PATH).

::: collapsible "🧠 Where are global packages stored?"
```
~/.mip/
├── global/
│   ├── node_modules/
│   │   ├── eslint/
│   │   ├── jest/
│   │   └── .bin/
│   │       ├── eslint        ← link to executable
│   │       └── jest          ← link to executable
│   └── mip.json (temporary)
└── store/                     (global package cache)
```

**Structure:**
- `~/.mip/global/` — root of the global environment.
- `node_modules/` — installed packages.
- `.bin/` — executable files (added to PATH).

**Important:** Global packages **do not depend** on the local `mip.yml` and are not included in `mip-lock.yml`.
:::
