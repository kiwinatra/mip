---
title: "mip doctor — diagnose the environment and the project"
description: "The doctor command checks your environment: Node.js and MIP versions, Git availability, access to the registry, write permissions, and PATH correctness."
---

# mip doctor

::: callout info "What is this?" icon:stethoscope
`mip doctor` is a diagnostic utility that checks your environment for potential problems. It analyzes tool versions, network availability, access permissions, and PATH configuration—helping you quickly identify and fix common issues before installing packages.
:::

## Syntax

```bash
mip doctor
```

## How it works

1. **Check Node.js** — analyzes the current Node.js version. Recommended version is **v18 or higher**.

2. **Check MIP** — displays the currently installed MIP version.

3. **Check the global cache** (`~/.mip/`) — verifies that the global storage exists and checks its size.

4. **Check configuration** — verifies that `mip.yml` exists and outputs the number of dependencies, scripts, and workspaces.

5. **Check the manifest** — checks `.mip/manifest.json` and validates that package paths are intact.

6. **Check the local `.mip/` directory** — checks that the local cache exists.

7. **Check PATH** — ensures that MIP global binaries (`~/.mip/global/node_modules/.bin`) are present in `PATH`.

8. **Check Git** — verifies that Git is available (required for GitHub packages).

9. **Check network** — tries to reach the npm registry (`registry.npmjs.org`).

10. **Check disk** — verifies write permissions in a temporary directory.

11. **Report results** — shows all found issues and suggests how to fix them.

## Examples

::: tabs
== tab "Healthy environment"
```bash
mip doctor
```

**Sample output:**
```
🔍 Running diagnostics...

✅ Node.js v20.11.0
✅ mip v2.0
✅ ~/.mip exists
✅ Global store: 42.50 MB
✅ Config: mip.yml
   📦 3 dependencies
   📜 2 scripts
   📁 1 workspace(s)
✅ Manifest: 3 package(s) installed
   ✅ All package paths exist
✅ Local .mip exists
✅ Global bin in PATH
✅ Git installed
✅ Network: npm registry reachable
✅ Disk writeable

📊 Summary: 0 warning(s)

✨ System is healthy!
```
:::

== tab "Problematic environment"
```bash
mip doctor
```

**Sample output:**
```
🔍 Running diagnostics...

⚠️ Node.js v12.22.0 (recommended: v18+)
✅ mip v2.0
⚠️ ~/.mip directory missing (will be created on first install)
ℹ️ No config file found (mip.yml, mip.json, or package.json)
⚠️ Global bin not in PATH: /home/user/.mip/global/node_modules/.bin
⚠️ Git not found (required for GitHub packages)
⚠️ Cannot reach npm registry (check network)
✅ Disk writeable

📊 Summary: 5 warning(s)

Issues found:

  ⚠️ Node.js v12.22.0 (recommended: v18+)
  ⚠️ ~/.mip directory missing
  ⚠️ Global bin not in PATH
  ⚠️ Git not found
  ⚠️ Cannot reach npm registry

💡 Fix suggestions:
  • Add to ~/.zshrc or ~/.bashrc:
    export PATH="$PATH:/home/user/.mip/global/node_modules/.bin"
  • Install git: https://git-scm.com/
  • Run "mip init" to create a config file
```
:::

## Common errors

::: callout warning "⚠️ Node.js version too old" icon:alert-triangle
**Cause:** An outdated Node.js version is installed (below v14).

**Resolution:**
1. Use [nvm](https://github.com/nvm-sh/nvm) to install a current version:
   ```bash
   nvm install 20
   nvm use 20
   ```
2. Or download the latest version from [nodejs.org](https://nodejs.org/).
:::

::: callout warning "⚠️ Global bin not in PATH" icon:alert-circle
**Cause:** MIP global binaries are not added to the environment variable `PATH`.

**Resolution:** Add to your `~/.zshrc` or `~/.bashrc`:
```bash
export PATH="$PATH:~/.mip/global/node_modules/.bin"
```
Then restart your shell: `source ~/.zshrc`
:::

::: callout danger "⚠️ Cannot reach npm registry" icon:skull
**Cause:** Network problems or the npm registry is unreachable.

**Resolution:**
1. Check your internet connection.
2. Check your proxy settings.
3. Temporarily disable VPN/firewall.
4. Make sure DNS works correctly.
:::

::: callout warning "⚠️ Git not found" icon:git-branch
**Cause:** Git is not installed or is missing from `PATH`.

**Resolution:**
- **Linux/Mac:** `sudo apt install git` or `brew install git`
- **Windows:** Download from [git-scm.com](https://git-scm.com/)
:::

## Related commands

- [mip install](/commands/install) — installs dependencies (after running doctor).
- [mip cache clean](/commands/cache) — clears the cache if you run into disk-related issues.
- [mip ci](/commands/ci) — CI/CD installation (doctor helps you pre-check the environment).

::: collapsible "🧠 Why is doctor important?"
`mip doctor` is a **first line of defense** against common problems:

1. **Saves time** — instead of guessing why installation fails, you get a clear diagnosis.
2. **Prevents mistakes** — many issues (e.g., outdated Node.js) lead to confusing errors that are hard to interpret.
3. **Improves onboarding** — new developers only need to run `mip doctor` to understand what must be configured in their environment.

**Tip:** Add `mip doctor` to your `README.md` as the very first step after cloning the repository.
:::

