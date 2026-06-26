---
title: "mip exec — execute binaries from dependencies"
description: "The exec command runs executables from installed packages, without installing them globally. It looks up binaries in the manifest and inserts the correct path automatically."
---

# mip exec

::: callout info "What is this?" icon:terminal
`mip exec` runs executable files shipped by your dependencies. It does not require you to install those binaries globally—MIP finds them in the installed packages and executes them.
:::

## Syntax

```bash
mip exec <command> [-- <args>...]
```

## Arguments

- `<command>` — the binary name to run (for example: `jest`, `eslint`, `ts-node`).
- `[-- <args>...]` — optional arguments passed to the binary.

## How it works

1. MIP reads the installed package manifests to find where the requested binary lives.
2. It resolves the correct path for the current project.
3. Then it executes the binary with the provided arguments.

## Examples

::: tabs
== tab "Run a binary"
```bash
mip exec jest
```

Runs Jest from the project dependencies.
:::

== tab "Pass arguments"
```bash
mip exec eslint -- .
```

Executes `eslint` and passes `-- .` as-is.
:::

== tab "Run with a specific package version (if applicable)"
```bash
mip exec <binary>
```

MIP resolves the binary based on the installed packages for the current project.
:::
:::

## Related commands

- [mip run](/commands/run) — run scripts defined in `mip.yml`.
- [mip install](/commands/install) — install dependencies and update `mip.yml`/lockfile.

