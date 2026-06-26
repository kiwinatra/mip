---
title: "mip dedupe — remove duplicate dependencies"
description: "The dedupe command analyzes the dependency tree and removes duplicate packages to optimize structure and reduce the project size."
---

# mip dedupe

::: callout info "What is this?" icon:scissors
`mip dedupe` finds and removes duplicate package versions in your project. This helps reduce size, speed up installation, and avoid version conflicts. The command has two modes: **quick** (default) and **full** — for maximum optimization.
:::

## Syntax

```bash
mip dedupe [--full]
```

## Options

| Flag | Description |
|------|-------------|
| `--full` | Enables **full deduplication** mode — more aggressively rebuilds the dependency graph, removing all possible duplicates. Can take longer. |

## How it works

1. **Analyze the lockfile** — reads `mip-lock.yml` and builds a dependency graph.

2. **Find duplicates** — identifies packages where:
   - The package name is the same.
   - Versions are different.
   - Both versions satisfy requirements of all parent packages.

3. **Check compatibility** — determines whether the old version can be replaced with the new one without breaking compatibility (it checks the major version).

4. **Report results** — shows the list of found duplicates, including:
   - Package name and versions.
   - Which versions can be deleted (compatible).
   - Which versions must be kept (incompatible).

5. **Ask for confirmation** — before making changes, the command asks: *"Do you want to deduplicate? (y/N)"*.

6. **Run deduplication**:
   - **Quick mode** — removes only compatible duplicates (within the same major version).
   - **Full mode** (`--full`) — removes all duplicates, even if major versions differ (may cause breaking changes).

7. **Update the lockfile** — after deletion, updates `mip-lock.yml`.

8. **Show the result** — reports how many packages were removed and how many remain.

## Examples

::: tabs
== tab "Quick deduplication"
```bash
mip dedupe
```

**Example report:**
```
📊 Duplicate packages found:

  📦 lodash
     ✅ Keeping: 4.17.21
     🔄 Compatible (can dedupe):
        - 4.17.19

  📦 axios
     ✅ Keeping: 0.21.4
     🔄 Compatible (can dedupe):
        - 0.21.1
     ⚠️  Incompatible (keep both):
        - 0.19.2

Do you want to deduplicate? (y/N) y

🧹 Running deduplication...
✅ Deduplication complete!
   Removed: 3 packages
   Remaining: 42 packages

Removed packages:
  • lodash@4.17.19 → kept 4.17.21
  • axios@0.21.1 → kept 0.21.4
```
:::

== tab "Full deduplication"
```bash
mip dedupe --full
```

Analyzes all possible version combinations and максимально compacts the dependency graph. Recommended after large updates.

**Example report:**
```
📊 Duplicate packages found:
  ...
Do you want to deduplicate? (y/N) y

🧹 Running full deduplication...
✅ Full deduplication complete!
   Removed: 8 packages
   Remaining: 56 packages
```
:::

## Common errors

::: callout warning "❌ No duplicates found" icon:info
**Cause:** Your dependency tree is already optimized.

**Resolution:** This is not an error — everything is fine. Continue your work.
:::

::: callout warning "❌ Lockfile not found" icon:alert-triangle
**Cause:** `mip-lock.yml` is missing.

**Resolution:**
1. Run `mip install` to create the lockfile.
2. Then run `mip dedupe` again.
:::

::: callout tip "💡 When to use dedupe" icon:lightbulb
- **After updating many packages**.
- **Before building a production image** (to reduce its size).
- **When you suspect version conflicts at runtime**.

It’s recommended to run `mip dedupe` before committing, to keep the project clean and reduce CI/CD time.
:::

## Related commands

- [mip install](/commands/install) — installs dependencies and creates the lockfile.
- [mip outdated](/commands/outdated) — shows outdated packages (often duplicates appear due to outdated versions).
- [mip doctor](/commands/doctor) — checks overall project health.

::: collapsible "🧠 What is deduplication?"
In package managers, duplication happens when multiple packages require different versions of the same dependency. For example, if package `A` requires `lodash@4.17.19` and package `B` requires `lodash@4.17.21`, MIP will install both versions.

**Quick mode** (`dedupe` without flags):
- Checks only compatible versions (within the same major).
- Removes duplicates that can be safely replaced with one shared version.
- Works fast.

**Full mode** (`dedupe --full`):
- Scans the whole dependency tree.
- Rebuilds it to maximize shared versions.
- May take longer, but gives a better result.

**Important:** deduplication never violates package requirements — a version is replaced only if it’s compatible with all parent packages.
:::

