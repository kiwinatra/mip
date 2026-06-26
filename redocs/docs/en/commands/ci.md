---
title: "mip ci — install for CI/CD environments"
description: "The ci command is designed for fast and reliable dependency installation in CI/CD environments using a lockfile and verifying its integrity."
---

# mip ci

::: callout info "What is this?" icon:rocket
`mip ci` is a special command for **non-interactive environments** (CI/CD, Docker, testing servers). It installs dependencies strictly according to `mip-lock.yml`, ignoring `mip.yml`, which guarantees a reproducible installation. Unlike `mip install`, this command does not update the lockfile and does not check for updates — it only installs what is already locked.
:::

## Syntax

```bash
mip ci [--frozen-lockfile]
```

## Options

| Flag | Description |
|------|-------------|
| `--frozen-lockfile` | Checks that `mip-lock.yml` is in sync with `mip.yml`. If there are discrepancies, installation stops with an error. |

## How it works

1. **Check that required files exist** — the command verifies `mip.yml` and `mip-lock.yml` are present. If any are missing, it exits with error code `1`.

2. **Frozen lockfile check (if the flag is set)** — compares dependencies from `mip.yml` and `mip-lock.yml`:
   - All dependencies from `mip.yml` must be present in the lockfile.
   - The lockfile must not contain extra packages that are not in `mip.yml`.
   - If discrepancies are found, it prints the problems and instructions on how to fix them.

3. **Install from the lockfile** — for each package from `mip-lock.yml`:
   - Checks whether it exists in the global cache `~/.mip/store/`.
   - If it’s missing, it’s downloaded and extracted.
   - A symlink is created in `node_modules/`.

4. **Progress indication** — shows a progress bar with the completion percentage.

## Examples

::: tabs
== tab "Standard CI installation"
```bash
mip ci
```

Installs all dependencies from `mip-lock.yml`. If the lockfile is missing, it prints an error.

**Example output:**
```
🚀 Running CI installation...
📦 Installing from lockfile (42 packages)
⬇️  Downloading lodash@4.17.21...
   ████████████████████████████████████ 100% 42/42
✅ Installed 42 packages
🔒 Lockfile integrity verified
```
:::

== tab "Strict frozen lockfile check"
```bash
mip ci --frozen-lockfile
```

Before installation, it checks that the lockfile matches `mip.yml`. If there’s a mismatch, it prints an error and a hint.

**Example error:**
```
❌ Frozen lockfile check failed:
  • lodash: missing from lockfile
  • axios: extra in lockfile
💡 Run 'mip install' to update lockfile
```
:::

## Common errors

::: callout danger "❌ Lockfile not found" icon:skull
**Cause:** `mip-lock.yml` is missing in the project.

**Resolution:** CI must run only with a **committed** lockfile. Run `mip install` locally and commit `mip-lock.yml` to your repository. Never ignore the lockfile in `.gitignore`.
:::

::: callout danger "❌ mip.yml not found" icon:skull
**Cause:** `mip.yml` does not exist in the current directory.

**Resolution:** Make sure you’re in the project root. If this is a new project, create `mip.yml` with `mip init`.
:::

::: callout warning "🔒 Frozen lockfile mismatch" icon:alert-triangle
**Cause:** `mip.yml` was changed, but `mip-lock.yml` wasn’t updated.

**Resolution:**
1. Run `mip install` locally to sync the lockfile.
2. Commit the updated `mip-lock.yml`.
3. Restart CI.

To automate this, add `mip ci --frozen-lockfile` to your CI pipeline — this prevents people from forgetting to update the lockfile.
:::

::: callout tip "💡 Tip" icon:lightbulb
Always use `mip ci` instead of `mip install` in CI/CD. It’s:
- **Faster** — it doesn’t check for updates, it only installs.
- **More reliable** — guarantees reproducible builds.
- **Safer** — prevents accidental dependency updates.

The command also uses a progress bar to make the process visible.
:::

## Related commands

- [mip install](/commands/install) — interactive install that updates the lockfile.
- [mip genlock](/commands/genlock) — generates the lockfile.
- [mip doctor](/commands/doctor) — checks overall project health.

::: collapsible "🧠 Why ci and install are different?"
MIP splits these commands to prevent common CI mistakes:

| Command | Purpose | Updates lockfile | Checks updates |
|---------|----------|-------------------|------------------|
| `mip install` | **Interactive install** (for development) | ✅ Yes | ✅ Yes |
| `mip ci` | **CI/CD install** (for automation) | ❌ No | ❌ No |

In CI you **always** want to install exactly the versions that are locked in the lockfile. Using `mip install` in CI can lead to nondeterministic builds if someone publishes a newer package version.

Additionally, `--frozen-lockfile` acts as a **human error protection**: if a developer forgot to update the lockfile after changing `mip.yml`, CI will fail with a clear error and a hint about what to do.
:::

