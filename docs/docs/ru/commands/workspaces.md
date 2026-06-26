---
title: "mip workspaces — управление монорепозиториями"
description: "Команда workspaces позволяет управлять несколькими пакетами в одном репозитории, выполняя команды во всех воркспейсах одновременно."
---

# mip workspaces

::: callout info "Что это?" icon:folders
`mip workspaces` — это команда для работы с **монорепозиториями** (монорепо). Она позволяет управлять несколькими пакетами в одном репозитории, выполняя команды (установка, запуск скриптов, выполнение команд) во всех воркспейсах одновременно. Это удобно для проектов с несколькими взаимосвязанными пакетами, библиотеками или микросервисами.
:::

## Синтаксис

```bash
mip workspaces <action> [arg]
```

## Аргументы

| Имя | Тип | Обязательный | Описание |
|-----|-----|--------------|----------|
| `action` | строка | ✅ | Действие: `list`, `run`, `install`, `exec` |
| `arg` | строка | ❌ | Аргумент для действия (например, имя скрипта для `run`) |

## Доступные действия

| Действие | Описание |
|----------|----------|
| `list` | Показывает список всех воркспейсов с их именами, версиями и путями |
| `run <script>` | Запускает указанный скрипт во всех воркспейсах (если он определён) |
| `install` | Устанавливает зависимости во всех воркспейсах |
| `exec <command>` | Выполняет произвольную команду во всех воркспейсах |

## Настройка воркспейсов

В корневом `mip.yml` добавьте секцию `workspaces`:

```yaml
name: my-monorepo
workspaces:
  - packages/*
  - apps/*
  - libs/shared
```

**Поддерживаемые паттерны:**
- `packages/*` — все папки внутри `packages/`.
- `apps/*` — все папки внутри `apps/`.
- `libs/shared` — конкретная папка.

## Логика работы

1. **Чтение корневого `mip.yml`** — загружает список паттернов воркспейсов.

2. **Поиск воркспейсов** — для каждого паттерна:
   - Если есть `*` — сканируются все подпапки на наличие `mip.yml`.
   - Если нет `*` — проверяется конкретная папка.

3. **Выполнение действия** — в зависимости от `action`:
   - **`list`** — выводит список найденных воркспейсов.
   - **`run`** — выполняет `mip run <script>` в каждом воркспейсе.
   - **`install`** — выполняет `mip install` в каждом воркспейсе.
   - **`exec`** — выполняет произвольную команду в каждом воркспейсе.

## Примеры

::: tabs
== tab "Список воркспейсов"
```bash
mip workspaces list
```

**Пример вывода:**
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
== tab "Запуск скрипта во всех воркспейсах"
```bash
mip workspaces run test
```

**Пример вывода:**
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
== tab "Установка зависимостей во всех воркспейсах"
```bash
mip workspaces install
```

**Пример вывода:**
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
== tab "Выполнение произвольной команды"
```bash
mip workspaces exec "echo 'Hello from workspace'"
```

**Пример вывода:**
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
== tab "Нет воркспейсов"
```bash
mip workspaces list
```

**Пример вывода:**
```
ℹ️ No workspaces defined in mip.yml

💡 Add to mip.yml:
  workspaces:
    - packages/*
```
:::

## Типичные ошибки

::: callout warning "❌ No mip.yml found" icon:alert-triangle
**Причина:** Вы находитесь не в корне монорепозитория.

**Решение:**
1. Перейдите в корень проекта с `mip.yml`.
2. Добавьте секцию `workspaces` в `mip.yml`.
:::

::: callout warning "ℹ️ No workspaces defined" icon:info
**Причина:** В `mip.yml` нет секции `workspaces`.

**Решение:**
1. Добавьте в `mip.yml`:
   ```yaml
   workspaces:
     - packages/*
   ```
2. Создайте папки с `mip.yml` в каждом воркспейсе.
:::

::: callout warning "❌ No workspace found" icon:alert-circle
**Причина:** Паттерны в `workspaces` не нашли ни одного валидного воркспейса.

**Решение:**
1. Проверьте, что папки существуют.
2. Убедитесь, что в каждой папке есть `mip.yml`.
3. Проверьте правильность паттернов.
:::

::: callout tip "💡 Совет" icon:lightbulb
`mip workspaces` — это мощный инструмент для:
- **Монорепозиториев** — управление несколькими пакетами из одной точки.
- **CI/CD** — параллельная установка и тестирование всех компонентов.
- **Разработки** — быстрый запуск скриптов во всех пакетах.

**Лучшие практики:**
1. Используйте одинаковую структуру для всех воркспейсов.
2. Определите корневые скрипты для общих задач.
3. Используйте `workspaces run test` в CI вместо отдельных команд.
:::

## Связанные команды

- [mip install](/ru/commands/install) — установка зависимостей (в корневом проекте).
- [mip run](/ru/commands/run) — запуск скриптов (в корневом проекте).
- [mip list](/ru/commands/list) — просмотр установленных пакетов.

::: collapsible "🧠 Как работает поиск воркспейсов?"
Алгоритм поиска воркспейсов:

1. **Чтение паттернов** — из секции `workspaces` в корневом `mip.yml`.

2. **Обработка каждого паттерна:**
   - Если паттерн содержит `*`:
     ```javascript
     // Пример: "packages/*"
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
   - Если паттерн без `*`:
     ```javascript
     // Пример: "libs/shared"
     const fullPath = path.join(cwd, pattern);
     if (fs.existsSync(fullPath) && fs.existsSync(path.join(fullPath, 'mip.yml'))) {
       workspaceDirs.push(fullPath);
     }
     ```

3. **Результат** — массив путей к папкам с `mip.yml`.

**Важно:** Поиск происходит только на один уровень вложенности. Для рекурсивного поиска используйте отдельные паттерны.
:::
