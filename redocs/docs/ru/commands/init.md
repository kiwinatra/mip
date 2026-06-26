---
title: "mip init — инициализация нового проекта"
description: "Команда init создаёт структуру нового MIP-проекта: mip.yml, папку .mip с поддиректориями и README.md с инструкциями."
---

# mip init

::: callout info "Что это?" icon:rocket
`mip init` — это первая команда, которую вы запускаете для создания нового MIP-проекта. Она создаёт файл `mip.yml`, настраивает структуру папок и генерирует README-файл с инструкциями по использованию. Всё, что нужно для старта — в одной команде!
:::

## Синтаксис

```bash
mip init
```

## Что создаётся

```
my-project/
├── mip.yml          # Конфигурация проекта в YAML
├── .mip/
│   ├── manifest.json # Манифест установленных пакетов
│   ├── cache/        # Кэш загрузок
│   └── packages/     # Локальные пакеты
└── README.md        # Документация
```

## Пример mip.yml

```yaml
name: my-project
version: 1.0.0
language: en
dependencies: {}
devDependencies: {}
scripts: {}
workspaces: []
```

## Логика работы

1. **Проверка существования `mip.yml`** — если файл уже существует, команда завершается с ошибкой.

2. **Проверка старых конфигов** — если есть `mip.json` или `package.json`, MIP автоматически мигрирует их в `mip.yml`.

3. **Создание `mip.yml`** — автоматически генерируется минимальная конфигурация в YAML-формате:
   ```yaml
   name: имя-папки
   version: 1.0.0
   language: en
   dependencies: {}
   devDependencies: {}
   scripts: {}
   workspaces: []
   ```

4. **Создание `.mip` директории** — структура для хранения кэша и манифеста:
   ```
   .mip/
   ├── manifest.json   # Манифест установленных пакетов
   ├── cache/          # Кэш загрузок
   └── packages/       # Локальные пакеты
   ```

5. **Проверка системной совместимости**:
   - Версия Node.js (рекомендуется v18+).
   - Права на запись в папку `.mip`.

6. **Генерация README.md** — если файла нет, создаётся с базовыми инструкциями.

7. **Вывод итогового отчёта** — показывает структуру проекта и подсказывает следующие шаги.

## Миграция из старых форматов

Если у вас есть `mip.json` или `package.json`, MIP автоматически мигрирует их при первом запуске:

```bash
# Было
mip.json
mip-lock.json

# Стало
mip.yml          # с бэкапом mip.json.backup
mip-lock.yml     # с бэкапом mip-lock.json.backup
```

::: callout tip "💡 Почему YAML?"
YAML читается проще, поддерживает комментарии и удобнее для ручного редактирования. Вы можете добавлять комментарии прямо в `mip.yml`:
```yaml
# Это мой проект
name: my-project
# Версия проекта
version: 1.0.0
```
:::

## Примеры

::: tabs
== tab "Инициализация нового проекта"
```bash
mip init
```

**Вывод:**
```
╔═══════════════════════════════════════════════════════════╗
║                    🚀 MIP INIT STARTED 🚀                  ║
╚═══════════════════════════════════════════════════════════╝

📋 Step 1/4: Creating mip.yml...
  ✅ mip.yml created
     📄 Path: /home/user/my-project/mip.yml
     📦 Name: my-project
     🔢 Version: 1.0.0

📂 Step 2/4: Creating .mip directory...
  ✅ .mip directory created
     📁 Path: /home/user/my-project/.mip

🔧 Step 3/4: Setting up directory structure...
  ✅ Manifest: .mip/manifest.json
  ✅ Cache directory: .mip/cache/
  ✅ Temp directory: .mip/temp/

🔐 Step 4/4: Checking system compatibility...
  ✅ Node.js version: v20.11.0
  ✅ Write permissions: OK

╔═══════════════════════════════════════════════════════════╗
║              ✅ MIP PROJECT INITIALIZED! ✅                ║
╚═══════════════════════════════════════════════════════════╝

📊 Summary:
   📁 Project: my-project
   📂 Location: /home/user/my-project
   🗂️  Structure: .mip/ (cache + packages + temp)
   📄 Config: mip.yml
   📋 Manifest: .mip/manifest.json

💡 Next steps:
   1️⃣  Install packages:  mip install express
   2️⃣  Run scripts:       mip run start
   3️⃣  List packages:     mip list
```
:::
== tab "Повторный запуск"
```bash
mip init
```

**Вывод:**
```
⚠️  mip.yml already exists
```
:::

## Типичные ошибки

::: callout warning "⚠️ mip.yml already exists" icon:alert-triangle
**Причина:** Проект уже инициализирован.

**Решение:**
1. Если вы хотите пересоздать проект — удалите `mip.yml` и `.mip/` вручную, затем запустите `mip init` снова.
2. Если вы просто хотите начать работу — используйте другие команды: `mip install`, `mip list` и т.д.
:::

::: callout warning "⚠️ Node.js version too old" icon:alert-triangle
**Причина:** Установлена устаревшая версия Node.js (ниже v14).

**Решение:**
1. Обновите Node.js до версии 18 или выше.
2. Используйте [nvm](https://github.com/nvm-sh/nvm) для управления версиями.
:::

::: callout tip "💡 Совет" icon:lightbulb
После `mip init` вы можете сразу:
- Установить зависимости: `mip install express`
- Добавить скрипты в `mip.yml`:
  ```yaml
  scripts:
    start: node index.js
    dev: nodemon index.js
  ```
- Запустить скрипт: `mip run start`
:::

## Связанные команды

- [mip create](/ru/commands/create) — создаёт проект из шаблона (node, react, cli, express)
- [mip install](/ru/commands/install) — устанавливает пакеты в созданный проект
- [mip doctor](/ru/commands/doctor) — диагностирует окружение после инициализации
