---
title: "mip genlock — generate lockfile"
description: "The genlock command creates a mip-lock.yml file based on dependencies from mip.yml, pinning exact versions and URLs for reproducible installs."
---

# mip genlock

::: callout info "What is this?" icon:lock
`mip genlock` generates a **lockfile** (`mip-lock.yml`) based on the dependencies specified in `mip.yml`. Unlike `mip install`, this command does not install packages locally — it only resolves their versions and creates a file with pinned versions, URLs, and dependencies. This is useful for pre-generating a lockfile in CI/CD or after manually updating `mip.yml`.
:::

## Syntax

```bash
mip genlock
```

## How it works

1. **Check for `mip.yml`** — the command checks if `mip.yml` exists in the current directory. If not, execution stops.

2. **Read dependencies** — extracts `dependencies` and `devDependencies` sections from `mip.yml`.

3. **Resolve versions** — for each dependency (name + version range), queries the npm registry to get the exact latest version that satisfies the range.

4. **Collect metadata** — for each package, fetches:
   - Exact version (`version`).
   - Tarball URL (`resolved`).
   - List of dependencies (`dependencies`).
   - List of peer dependencies (`peerDependencies`).

5. **Generate lockfile** — creates `mip-lock.yml` with the following structure:
   ```yaml
   version: 1.0.0
   generatedAt: '2026-01-15T14:23:00.000Z'
   packages:
     lodash@4.17.21:
       version: 4.17.21
       resolved: https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz
       dependencies: {}
       peerDependencies: {}
       installPath: .mip/lodash/4.17.21
   ```

6. **Output results** — shows how many packages were successfully added to the lockfile.

## Examples

::: tabs
== tab "Generate lockfile"
```bash
mip genlock
```

**Example output:**
```
🔒 Generating lockfile...
  ⏳ Resolving packages... 1/42
  ⏳ Resolving packages... 42/42

✅ Generated mip-lock.yml with 42 packages
```
:::
== tab "When mip.yml is empty"
```bash
mip genlock
```

**Example output:**
```
ℹ️ No dependencies found in mip.yml
```
:::
== tab "On resolve error"
```bash
mip genlock
```

**Example output:**
```
🔒 Generating lockfile...
  ⏳ Resolving packages... 1/42
  ❌ Failed to resolve some-package@^2.0.0: Package not found

✅ Generated mip-lock.yml with 41 packages
```
:::

## Common errors

::: callout danger "❌ mip.yml not found" icon:skull
**Cause:** No `mip.yml` file in the current directory.

**Solution:**
1. Make sure you are in the project root.
2. If it's a new project — create `mip.yml` with `mip init`.
3. Or use `mip create` to generate a ready-made project.
:::

::: callout warning "❌ No dependencies found" icon:info
**Cause:** No dependencies specified in `mip.yml` (empty `dependencies` and `devDependencies` sections).

**Solution:** This is not an error, just a warning. If you want to pin dependencies — add them to `mip.yml` and run `mip genlock` again.
:::

::: callout danger "❌ Failed to resolve package" icon:alert-circle
**Cause:** Package not found in the registry or the specified version does not exist.

**Solution:**
1. Check the package name and version in `mip.yml`.
2. Check your internet connection.
3. If the package is private — make sure the correct registries are configured.
4. After fixing, run `mip genlock` again.
:::

::: callout tip "💡 Tip" icon:lightbulb
`mip genlock` **requires registry access**, as it resolves versions in real time.

It is recommended to use `mip genlock`:
- **After manually editing** `mip.yml`.
- **In CI/CD** to generate a lockfile from `mip.yml` without installing packages.
- **In automation scripts** to check dependency availability.
:::

## Related commands

- [mip install](/commands/install) — installs dependencies and generates a lockfile.
- [mip ci](/commands/ci) — installs dependencies **from the lockfile**.
- [mip update](/commands/update) — updates dependencies and regenerates the lockfile.

::: collapsible "🧠 Why do you need a lockfile?"
A lockfile is a **snapshot of the dependency tree** at a specific point in time. It guarantees:

1. **Reproducibility** — all developers and CI get **identical** package versions.
2. **Speed** — no need to resolve dependencies on every install.
3. **Security** — if a package is removed from the registry, you still have the pinned version.

**Difference between `mip install` and `mip genlock`:**
| Command | Installs packages to global cache | Generates lockfile |
|---------|-----------------------------------|-------------------|
| `mip install` | ✅ Yes | ✅ Yes (if no lockfile) |
| `mip genlock` | ❌ No | ✅ Yes (always) |

`mip genlock` allows you to **prepare a lockfile in advance** in CI, without spending time on installing packages.
:::

::: collapsible "🔧 mip-lock.yml format"
```yaml
version: 1.0.0
generatedAt: '2026-01-15T14:23:00.000Z'
packages:
  lodash@4.17.21:
    version: 4.17.21
    resolved: https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz
    dependencies: {}
    peerDependencies: {}
    installPath: .mip/lodash/4.17.21
  react@18.2.0:
    version: 18.2.0
    resolved: https://registry.npmjs.org/react/-/react-18.2.0.tgz
    dependencies:
      loose-envify: ^1.1.0
      scheduler: ^0.23.0
    peerDependencies: {}
    installPath: .mip/react/18.2.0
```

**Fields:**
- `version` — lockfile format version (for future compatibility).
- `generatedAt` — generation time (ISO 8601).
- `packages` — object with keys in the format `name@version` and metadata.
- `resolved` — URL for downloading the tarball.
- `installPath` — path where the package will be installed (relative to project root).
:::
