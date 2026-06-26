---
title: "mip repo — interactive GitHub repository browser"
description: "The repo command allows you to browse GitHub repositories directly from the terminal, navigate folders, read READMEs, and download files."
---

# mip repo

::: callout info "What is this?" icon:github
`mip repo` is an interactive file manager for GitHub repositories. You can browse repository contents, navigate folders, read READMEs in full-screen mode, and download files locally — all without cloning the repository. The command uses the GitHub API and supports authentication via `GITHUB_TOKEN` to bypass rate limits.
:::

## Syntax

```bash
mip repo <owner/repo> [--branch <branch>] [--path <download-path>]
```

## Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `owner/repo` | string | ✅ | Repository owner and name (e.g., `kiwinatra/mip`) |

## Options

| Flag | Description |
|------|-------------|
| `--branch` | Branch to browse (default: `main`) |
| `--path` | Path to save downloaded files (default: `download/`) |

## How it works

1. **Connect to GitHub API** — the command uses the public GitHub API to fetch repository contents.

2. **Authentication** — if the `GITHUB_TOKEN` environment variable is set, it is used to increase API rate limits.

3. **Interactive mode** — after entering the repository, an interactive shell opens with the following commands:
   - `ls` — show contents of the current folder.
   - `cd <folder>` — navigate to a folder.
   - `cd ..` — go up one level.
   - `readme` or `cat` — show README in full-screen mode.
   - `get <filename>` — download a file to the local folder.
   - `help` or `?` — show help.
   - `exit` — exit the browser.

## Examples

::: tabs
== tab "Browse mip repository"
```bash
mip repo kiwinatra/mip
```

**Example output:**
```
╔═══════════════════════════════════════════════════════════════════╗
║  mip repo: kiwinatra/mip/                                        ║
╚═══════════════════════════════════════════════════════════════════╝
LICENSE
README.md
lib\
package.json
tests\

Commands: ls | cd <dir> | readme | get <file> | exit
mip repo>
```
:::
== tab "Navigate folders"
```bash
mip repo kiwinatra/mip
mip repo> cd lib
mip repo> ls
mip repo> cd ../tests
```

**Example output:**
```
╔═══════════════════════════════════════════════════════════════════╗
║  mip repo: kiwinatra/mip/tests/                                  ║
╚═══════════════════════════════════════════════════════════════════╝
commands.test.js
install.test.js
utils.test.js
```
:::
== tab "Read README"
```bash
mip repo kiwinatra/mip
mip repo> readme
```

Opens full-screen README viewer:
- `j` / `↓` — scroll down.
- `k` / `↑` — scroll up.
- `PgDn` / `PgUp` — page scroll.
- `q` — exit read mode.
:::
== tab "Download a file"
```bash
mip repo kiwinatra/mip
mip repo> get package.json
```

**Example output:**
```
✅ Saved: package.json -> ./download/package.json
```
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

::: callout warning "❌ File not found" icon:alert-circle
**Cause:** The specified file does not exist in the current folder.

**Solution:**
1. Use `ls` to view available files.
2. Make sure you are in the correct folder.
:::

::: callout tip "💡 Tip" icon:lightbulb
`mip repo` is a powerful tool for:
- **Quickly browsing** repository contents without cloning.
- **Reading documentation** in repositories with large READMEs.
- **Selectively downloading** files (saves time and bandwidth).

For private repositories, set `GITHUB_TOKEN` with read permissions.
:::

## Related commands

- [mip install](/commands/install) — install packages (can be used with GitHub repositories).
- [mip info](/commands/info) — package information from the registry.

::: collapsible "🧠 How does interactive mode work?"
After entering the repository, a **REPL shell** (Read-Eval-Print Loop) opens where you can execute commands:

1. **`ls`** — queries the GitHub API for the current folder contents.
2. **`cd <folder>`** — updates the path and re-queries contents.
3. **`readme`** — searches for README files in the current folder (first looks for `README.md`, then other variants) and opens them in full-screen mode.
4. **`get <file>`** — downloads a file to the folder specified in `--path`.

**Full-screen README mode:**
- Uses the terminal's alternate screen.
- Supports keyboard navigation.
- Automatically adapts to window size.

**README auto-detection:**
The command looks for files in the following order:
1. `README.md`, `README.MD`, `README.rst`, `README.txt`.
2. Any file starting with `readme.`.
3. Any file with `.md` extension.
:::

::: collapsible "🔧 Using the GitHub API"
`mip repo` uses the **GitHub REST API** to fetch repository contents:

**Endpoint:**
```
GET /repos/{owner}/{repo}/contents/{path}
```

**Authentication:**
```bash
export GITHUB_TOKEN=your_personal_access_token
```

**Rate limits:**
- **Unauthenticated:** 60 requests/hour.
- **Authenticated:** 5000 requests/hour.

**Response format:**
```json
[
  {
    "name": "README.md",
    "path": "README.md",
    "type": "file",
    "content": "base64...",
    "encoding": "base64"
  },
  {
    "name": "lib",
    "path": "lib",
    "type": "dir"
  }
]
```

**Note:** File contents come in Base64 format and are decoded on the fly.
:::
