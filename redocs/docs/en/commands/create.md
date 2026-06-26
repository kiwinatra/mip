---
title: "mip create — create a new project from a template"
description: "The create command generates a project structure based on ready-made templates (Node.js, React, CLI, Express) with automatic dependency installation."
---

# mip create

::: callout info "What is this?" icon:rocket
`mip create` is a fast way to start a new project. It generates a project folder, creates all the required files based on the selected template, and automatically installs dependencies via `mip install`. This saves you from manually copying boilerplate code.
:::

## Syntax

```bash
mip create <template> <project-name>
```

## Arguments

| Name | Type | Required | Description |
|------|------|-----------|-------------|
| `template` | string | ✅ | Template name: `node`, `react`, `cli`, `express` |
| `project-name` | string | ✅ | Project name (used as the folder name and as `name` in `mip.yml`) |

## Available templates

| Template | Description | Installed packages |
|-----------|-------------|---------------------|
| `node` | A basic Node.js project with `index.js` and `start`/`dev` scripts | `nodemon` |
| `react` | A React application with Webpack configured via `react-scripts` | Installed via npm (for compatibility) |
| `cli` | A CLI utility template with an executable file in `bin/` | None |
| `express` | An Express server with routes and `start`/`dev` scripts | `express`, `nodemon` |

## How it works

1. **Validate arguments** — if `template` or `project-name` is missing, it prints help.

2. **Load the template** — selects the configuration from the `templates` object for the provided template name.

3. **Create the project folder** — if a folder with that name already exists, the operation stops.

4. **Generate files** — all template files are created inside the project folder:
   - Supports placeholder substitution `{{name}}` → replaced with `project-name`.
   - Creates nested folders recursively.

5. **Set file permissions** — for the `cli` template, `bin/cli.js` is marked as executable (`chmod 755`).

6. **Install dependencies** — if the template includes a list of packages, it runs `mip install` for each one.

## Examples

::: tabs
== tab "Create a Node.js project"
```bash
mip create node my-app
```

**Result:**
```
📦 Creating node project: my-app

  ✅ index.js
  ✅ package.json
  ✅ README.md
  ✅ .gitignore

📦 Installing dependencies...
  ✅ nodemon installed

✅ Created! cd my-app && mip run start
```

**Project structure:**
```
my-app/
├── index.js          # Main file
├── package.json      # Dependencies and scripts
├── README.md         # Documentation
└── .gitignore        # Ignored files
```
:::

== tab "Create a React application"
```bash
mip create react my-app
```

**Result:**
```
📦 Creating react project: my-app

  ✅ src/App.js
  ✅ src/index.js
  ✅ public/index.html
  ✅ package.json

📦 Installing dependencies... (via npm for compatibility)
  ✅ react installed
  ✅ react-dom installed
  ✅ react-scripts installed

✅ Created! cd my-app && mip run start
```

**Project structure:**
```
my-app/
├── src/
│   ├── App.js        # Main component
│   └── index.js      # Entry point
├── public/
│   └── index.html    # HTML template
└── package.json      # React dependencies
```
:::

== tab "Create a CLI utility"
```bash
mip create cli my-tool
```

**Result:**
```
📦 Creating cli project: my-tool

  ✅ bin/cli.js (executable)
  ✅ package.json
  ✅ README.md

✅ Created! cd my-tool && mip run start
```

**Project structure:**
```
my-tool/
├── bin/
│   └── cli.js        # Executable script
├── package.json      # "bin" section
└── README.md
```
:::

== tab "Create an Express server"
```bash
mip create express my-api
```

**Result:**
```
📦 Creating express project: my-api

  ✅ app.js
  ✅ package.json

📦 Installing dependencies...
  ✅ express installed
  ✅ nodemon installed

✅ Created! cd my-api && mip run start
```

**Project structure:**
```
my-api/
├── app.js            # Express server
└── package.json      # Dependencies and scripts
```
:::

## Common errors

::: callout warning "❌ Unknown template" icon:alert-triangle
**Cause:** You provided a template that doesn’t exist in the list.

**Resolution:** Use one of the available templates: `node`, `react`, `cli`, `express`. Check the spelling.
:::

::: callout danger "❌ Project already exists" icon:skull
**Cause:** A folder with the provided project name already exists in the current directory.

**Resolution:**
1. Choose a different project name.
2. Or delete the existing folder (if you don’t need it).
3. Or switch to another directory.
:::

::: callout tip "💡 Tip" icon:lightbulb
After creating a project:
- Go to the project folder: `cd my-app`
- Start the app: `mip run start` (or `mip run dev` for development with reload)

For React, use `mip run build` to build the production version.
:::

## Related commands

- [mip init](/commands/init) — initializes `mip.yml` in an existing project.
- [mip install](/commands/install) — installs dependencies in the created project.
- [mip run](/commands/run) — runs scripts from `mip.yml`.

