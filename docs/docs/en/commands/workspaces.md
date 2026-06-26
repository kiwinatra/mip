---
title: "mip workspaces — manage monorepositories"
description: "The workspaces command allows you to manage multiple packages in a single repository, executing commands across all workspaces simultaneously."
---

# mip workspaces

::: callout info "What is this?" icon:folders
`mip workspaces` is a command for working with **monorepositories** (monorepo). It allows you to manage multiple packages in a single repository, executing commands (install, run scripts, execute commands) across all workspaces simultaneously. This is convenient for projects with multiple interconnected packages, libraries, or microservices.
:::

## Syntax

```bash
mip workspaces <action> [arg]
```

## Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `action` | string | ✅ | Action: `list`, `run`, `install`, `exec` |
| `arg` | string | ❌ | Argument for the action (e.g., script name for `run`) |

## Available actions

| Action | Description |
|--------|-------------|
| `list` | Shows a list of all workspaces with their names, versions, and paths |
| `run <script>` | Runs the specified script in all workspaces (if defined) |
| `install` | Installs dependencies in all workspaces |
| `exec <command>` | Executes an arbitrary command in all workspaces |

## Workspace configuration

In the root `mip.yml`, add a `workspaces` section:

```yaml
name: my-monorepo
workspaces:
  - packages/*
  - apps/*
  - libs/shared
```

**Supported patterns:**
- `packages/*` — all folders inside `packages/`.
- `apps/*` — all folders inside `apps/`.
- `libs/shared` — a specific folder.

## How it works

1. **Read root `mip.yml`** — loads the list of workspace patterns.

2. **Find workspaces** — for each pattern:
   - If it contains `*` — scans all subfolders for `mip.yml`.
   - If no `*` — checks the specific folder.

3. **Execute action** — depending on `action`:
   - **`list`** — outputs the list of found workspaces.
   - **`run`** — executes `mip run <script>` in each workspace.
   - **`install`** — executes `mip install` in each workspace.
   - **`exec`** — executes an arbitrary command in each workspace.

## Examples

::: tabs
== tab "List workspaces"
```bash
mip workspaces list
```

**Example output:**
```
📦 Workspaces found:

  📁 @my-app/core@1.0.0
     packages/core

  📁 @my-app/ui@2.1.0
     packages/ui

  📁 @my-app/api@1.5.0
     apps/api
```
:::
== tab "Run script in all workspaces"
```bash
mip workspaces run test
```

**Example output:**
```
🏃 Running script: test in 3 workspaces...

📦 @my-app/core:
  > jest --coverage
  ✅ All tests passed

📦 @my-app/ui:
  > vitest run
  ✅ All tests passed

📦 @my-app/api:
  > jest --passWithNoTests
  ✅ No tests found
```
:::
== tab "Install dependencies in all workspaces"
```bash
mip workspaces install
```

**Example output:**
```
📦 Installing dependencies in 3 workspaces...

📦 @my-app/core:
  ✅ Installed 42 packages

📦 @my-app/ui:
  ✅ Installed 28 packages

📦 @my-app/api:
  ✅ Installed 56 packages

✅ All workspaces installed successfully
```
:::
== tab "Execute arbitrary command"
```bash
mip workspaces exec "echo 'Hello from workspace'"
```

**Example output:**
```
🔧 Executing: echo 'Hello from workspace' in 3 workspaces...

📦 @my-app/core:
  Hello from workspace

📦 @my-app/ui:
  Hello from workspace

📦 @my-app/api:
  Hello from workspace
```
:::
== tab "No workspaces"
```bash
mip workspaces list
```

**Example output:**
```
ℹ️ No workspaces defined in mip.yml

💡 Add to mip.yml:
  workspaces:
    - packages/*
```
:::

## Common errors

::: callout warning "❌ No mip.yml found" icon:alert-triangle
**Cause:** You are not in the root of a monorepository.

**Solution:**
1. Navigate to the project root with `mip.yml`.
2. Add a `workspaces` section to `mip.yml`.
:::

::: callout warning "ℹ️ No workspaces defined" icon:info
**Cause:** No `workspaces` section in `mip.yml`.

**Solution:**
1. Add to `mip.yml`:
   ```yaml
   workspaces:
     - packages/*
   ```
2. Create folders with `mip.yml` in each workspace.
:::

::: callout warning "❌ No workspace found" icon:alert-circle
**Cause:** The `workspaces` patterns did not find any valid workspaces.

**Solution:**
1. Check that the folders exist.
2. Make sure each folder has `mip.yml`.
3. Check the pattern correctness.
:::

::: callout tip "💡 Tip" icon:lightbulb
`mip workspaces` is a powerful tool for:
- **Monorepositories** — managing multiple packages from one point.
- **CI/CD** — parallel installation and testing of all components.
- **Development** — quickly running scripts across all packages.

**Best practices:**
1. Use the same structure for all workspaces.
2. Define root scripts for common tasks.
3. Use `workspaces run test` in CI instead of separate commands.
:::

## Related commands

- [mip install](/commands/install) — install dependencies (in the root project).
- [mip run](/commands/run) — run scripts (in the root project).
- [mip list](/commands/list) — view installed packages.

::: collapsible "🧠 How does workspace discovery work?"
Workspace discovery algorithm:

1. **Read patterns** — from the `workspaces` section in the root `mip.yml`.

2. **Process each pattern:**
   - If the pattern contains `*`:
     ```javascript
     // Example: "packages/*"
     const baseDir = pattern.split('*')[0]; // "packages/"
     const dirs = fs.readdirSync(baseDir);
     for (const dir of dirs) {
       const fullPath = path.join(baseDir, dir);
       if (fs.statSync(fullPath).isDirectory()) {
         const pkgPath = path.join(fullPath, 'mip.yml');
         if (fs.existsSync(pkgPath)) {
           workspaceDirs.push(fullPath);
         }
       }
     }
     ```
   - If the pattern has no `*`:
     ```javascript
     // Example: "libs/shared"
     const fullPath = path.join(cwd, pattern);
     if (fs.existsSync(fullPath) && fs.existsSync(path.join(fullPath, 'mip.yml'))) {
       workspaceDirs.push(fullPath);
     }
     ```

3. **Result** — an array of paths to folders with `mip.yml`.

**Note:** Discovery only goes one level deep. For recursive discovery, use separate patterns.
:::
