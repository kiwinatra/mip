---
title: "mip language — manage interface language"
description: "The language command allows you to view and change the language of MIP messages in the current project."
---

# mip language

::: callout info "What is this?" icon:globe
`mip language` is a command for managing the MIP interface language within the current project. MIP supports multi-language and automatically adapts message output to the language specified in `mip.yml`. This is convenient for teams with different preferences and for projects where localization matters.
:::

## Syntax

```bash
mip language [lang]
```

## Arguments

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `lang` | string | ❌ | Language code (e.g., `en`, `ru`, `de`). If not specified — shows the current language. |

## Available languages

| Code | Language |
|------|----------|
| `en` | English (default) |
| `ru` | Русский |
| `de` | Deutsch |

## How it works

1. **Determine current language** — MIP checks settings in the following order:
   - Language from `mip.yml` (the `language` field).
   - System language (if not specified in the project).
   - `en` (if unable to determine).

2. **Show current language** — if `lang` is not specified, the command displays the current language and the list of available ones.

3. **Set new language** — if a language code is provided:
   - Checks whether the language is supported.
   - Updates `mip.yml` (adds or updates the `language` field).
   - Displays confirmation of successful language change.

## Examples

::: tabs
== tab "View current language"
```bash
mip language
```

**Example output:**
```
🌐 Current language: en
📋 Available languages: en, ru, de
```
:::
== tab "Change language to Russian"
```bash
mip language ru
```

**Example output:**
```
✅ Language set to: ru
```

After this, all MIP commands will output messages in Russian.
:::
== tab "Change language to German"
```bash
mip language de
```

**Example output:**
```
✅ Language set to: de
```
:::
== tab "Change to unsupported language"
```bash
mip language fr
```

**Example output:**
```
❌ Invalid language: fr
📋 Available languages: en, ru, de
```
:::

## Common errors

::: callout warning "❌ Invalid language" icon:alert-triangle
**Cause:** A language code that is not supported was specified.

**Solution:**
1. Use one of the available languages: `en`, `ru`, `de`.
2. Check the spelling of the language code.
:::

::: callout info "💡 Tip" icon:lightbulb
- The language is saved **per project** (in `mip.yml`), not globally. This allows different projects to use different languages.
- If you want to change the language globally — change your system settings or the `LANG` environment variable.
- For new projects, the default language is determined from system settings.
:::

## Related commands

- [mip init](/commands/init) — creates a new project with the language specified in `mip.yml`.
- [mip info](/commands/info) — outputs package information in the selected language.

::: collapsible "🧠 How does multi-language work in MIP?"
MIP uses a **two-level localization system**:

1. **Project level** — the language is stored in `mip.yml` (the `language` field). This language is used for all commands within the project.

2. **System level** — if no language is specified in the project, MIP looks at the system `LANG` or `LC_ALL` variable.

**Priority:**
```
Language in mip.yml > System LANG variable > en (default)
```

**Translations:**
All MIP messages are stored in localization files:
```
lib/i18n/
├── en.json  # English
├── ru.json  # Russian
└── de.json  # German
```

Each file contains key-value pairs for all command messages:
```json
{
  "commands.install.installing": "Installing {package}...",
  "commands.install.installed": "✅ {package} installed"
}
```

When changing the language via `mip language`, only the field in `mip.yml` is updated, and the system picks up the new language on the next command execution.
:::

::: collapsible "🔧 Adding new languages"
If you want to add support for a new language:

1. Create a file in `lib/i18n/<lang>.json`.
2. Copy the structure from an existing file.
3. Translate all messages to the new language.
4. Add the language code to the `languages` array in `lib/i18n/index.js`.
5. Done! The language is now available via `mip language <lang>`.

**Important:** When adding a new language, make sure all messages are translated. Missing translations will fall back to English.
:::
