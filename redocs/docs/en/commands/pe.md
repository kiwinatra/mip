---
title: "mip pe — execute plugin commands"
description: "The pe (plugin-execute) command executes commands registered in MIP plugins."
---

# mip pe

The `pe` (plugin-execute) command is used to execute commands provided by MIP plugins.

---

## Syntax

```bash
mip pe <plugin> <command> [args...]
```

## Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `plugin` | string | ✅ | Plugin name |
| `command` | string | ✅ | Command name within the plugin |
| `args` | array | ❌ | Arguments passed to the command |

---

## Examples

### Basic execution

```bash
mip pe hello hello
```

Output:
```
Hello, world! 👋
```

### With arguments

```bash
mip pe hello hello zshx
```

Output:
```
Hello, zshx! 👋
```

### With multiple arguments

```bash
mip pe my-plugin my-command arg1 arg2 arg3
```

---

## How it works

1. MIP checks whether the specified plugin is activated
2. Checks whether the command exists in the plugin
3. Executes the command with the passed arguments

---

## Errors

### Plugin not found

```bash
mip pe unknown-plugin hello
```

Output:
```
[ERROR] Plugin "unknown-plugin" not found or not activated
[INFO] Available plugins: hello, my-plugin
```

### Command not found

```bash
mip pe hello unknown-command
```

Output:
```
[ERROR] Command "unknown-command" not found in plugin "hello"
[INFO] Available commands: hello, help
```

---

## Related commands

- [mip plugin](/commands/plugin) — manage plugins
