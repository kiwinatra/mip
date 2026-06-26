---
title: "mip repo — interactive TUI for GitHub repositories"
description: "The repo command opens a TUI file manager for browsing GitHub repositories, viewing contents, and downloading files."
---

# mip repo

::: callout info "What is this?" icon:github
`mip repo` is an interactive TUI file manager for browsing GitHub repositories. Unlike a simple CLI version, the TUI provides two panels: a file manager on the left and a content viewer on the right. You can navigate folders, read READMEs, and download files in a convenient interface.
:::

## Syntax

```bash
mip repo <owner/repo> [--branch <branch>] [--downloadPath <path>]
```

## Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `owner/repo` | string | ✅ | Repository owner and name (e.g., `kiwinatra/mip`) |

## Options

| Flag | Description |
|------|-------------|
| `--branch` | Branch to browse (default: `main`) |
| `--downloadPath` | Path to save downloaded files (default: `download/`) |

## TUI Controls

### Navigation

| Key | Action |
|-----|--------|
| `Tab` | Switch focus between left and right panels |
| `j` / `↓` | Move down (left panel) or scroll down (right panel) |
| `k` / `↑` | Move up (left panel) or scroll up (right panel) |
| `Enter` | Open folder or file (in left panel) |
| `q` / `Ctrl+C` | Exit TUI |

### Commands (entered at the bottom)

| Command | Description |
|---------|-------------|
| `help` | Show help |
| `ls` | Reload current folder |
| `cd <dir>` | Navigate to a folder |
| `cd ..` | Go up one level |
| `view <file>` | Open a file in the right panel |
| `get <file>` | Download a file to `downloadPath` |
| `exit` or `q` | Exit TUI |

## How it works

1. **Connect to GitHub API** — the command uses the GitHub API to fetch repository contents.

2. **Two-panel interface**:
   - **Left panel** — file manager (folders and files).
   - **Right panel** — content of the selected file or README.

3. **Automatic README opening** — when entering a folder, README is automatically displayed on the right (if available).

4. **Interactive commands** — entered at the bottom line, executed without reloading the interface.

## Examples

::: tabs
== tab "Launch TUI"
```bash
mip repo kiwinatra/mip
```

Opens TUI with two panels:
```
┌────────────────────────────────────────────────────────────────┐
│ mip kiwinatra/mip                              [q] exit       │
├────────────────────────────────┬───────────────────────────────┤
│ 📁 .                          │ # README.md                   │
├────────────────────────────────┼───────────────────────────────┤
│ ▶ 📁 lib                      │ # MIP - Minimal Package...   │
│   📄 LICENSE                  │                               │
│   📄 README.md                │ MIP is a minimal package...  │
│   📄 package.json             │                               │
│   📁 tests                    │ ## Installation              │
│                               │ ```bash                      │
│                               │ npm install -g mip           │
│                               │ ```                          │
├────────────────────────────────┴───────────────────────────────┤
│ mip:>                                                         │
└────────────────────────────────────────────────────────────────┘
```
:::
== tab "Navigate folders"
In TUI:
1. Use `j`/`k` to select the `lib` folder.
2. Press `Enter` — the `lib` folder opens.
3. The right panel automatically shows README from the `lib` folder (if available).
:::
== tab "View a file"
In TUI:
1. Select a file (e.g., `package.json`) with `j`/`k`.
2. Press `Enter` — the file content appears in the right panel.
:::
== tab "Download a file"
In TUI:
1. Switch to command input mode (press `Tab` if needed).
2. Enter: `get package.json`
3. The file is saved to the `download/` folder.
:::
== tab "Use with token"
```bash
export GITHUB_TOKEN=ghp_xxxxx
mip repo kiwinatra/mip
```
:::

## Common errors

::: callout warning "❌ Repository not found" icon:alert-triangle
**Cause:** Invalid owner or repository name.

**Solution:**
1. Check the spelling: `owner/repo`.
2. Make sure the repository is public (or you have access).
:::

::: callout warning "❌ API rate limit exceeded" icon:alert-circle
**Cause:** GitHub API rate limit exceeded (60 requests/hour for unauthenticated users).

**Solution:**
1. Set `GITHUB_TOKEN` to increase the limit to 5000 requests/hour.
2. Wait an hour for the limit to reset.
:::

::: callout tip "💡 Tip" icon:lightbulb
`mip repo` in TUI mode is ideal for:
- **Quick navigation** through a repository without cloning.
- **Reading documentation** in a convenient interface.
- **Selectively downloading** files.

**TUI vs regular mode:**
| Mode | Feature |
|------|---------|
| TUI (default) | Two panels, interactive navigation |

For private repositories, set `GITHUB_TOKEN` with read permissions.
:::

## Related commands

- [mip install](/commands/install) — install packages (can be used with GitHub repositories).
- [mip info](/commands/info) — package information from the registry.
