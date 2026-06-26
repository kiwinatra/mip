---
title: "Конфигурация MIP"
description: "Настройка mip.yml: зависимости, скрипты, язык, workspaces."
---

# Конфигурация MIP ⚙️

MIP использует файл `mip.yml` для хранения конфигурации проекта. Вот полный справочник по всем полям.

---

## 📁 Файл `mip.yml`

Создаётся автоматически при `mip init`. Можно редактировать вручную.

### Полный пример

```yaml
name: my-project
version: 1.0.0
language: en

dependencies:
  express: ^4.18.0
  lodash: ^4.17.21

devDependencies:
  jest: ^29.7.0
  eslint: ^8.56.0

scripts:
  start: node index.js
  dev: nodemon index.js
  test: jest
  build: webpack --mode production

workspaces:
  - packages/*
  - apps/*

plugins:
  logger:
    enabled: true
    logFile: mip.log
  notifier:
    enabled: false
    webhook: https://example.com/webhook
```

---

## 📋 Поля

### `name` — имя проекта

**Тип:** строка  
**Обязательное:** да  
**Пример:** `my-project`

Имя проекта. Используется в README и при создании плагинов.

---

### `version` — версия проекта

**Тип:** строка  
**Обязательное:** да  
**Пример:** `1.0.0`

Версия проекта в формате semver.

---

### `language` — язык интерфейса

**Тип:** строка  
**Обязательное:** нет (по умолчанию `en`)  
**Пример:** `ru`

Язык сообщений MIP. Доступные значения: `en`, `ru`, `es`, `fr`, `de`, `it`, `pt`, `zh`, `ja`, `ko`.

```bash
mip language ru
```

---

### `dependencies` — зависимости

**Тип:** объект  
**Обязательное:** нет  
**Пример:** `express: ^4.18.0`

Пакеты, необходимые для работы приложения.

---

### `devDependencies` — зависимости для разработки

**Тип:** объект  
**Обязательное:** нет  
**Пример:** `jest: ^29.7.0`

Пакеты, необходимые только для разработки (тесты, линтеры, сборка).

---

### `scripts` — скрипты

**Тип:** объект  
**Обязательное:** нет  
**Пример:** `start: node index.js`

Пользовательские скрипты. Запускаются через `mip run <name>`.

**Стандартные скрипты:**
- `start` — запуск приложения
- `dev` — режим разработки (с перезагрузкой)
- `test` — запуск тестов
- `build` — сборка проекта
- `lint` — проверка кода

---

### `workspaces` — монорепозитории

**Тип:** массив строк  
**Обязательное:** нет  
**Пример:** `["packages/*", "apps/*"]`

Список паттернов для поиска воркспейсов (монорепозиториев). Поддерживаются `*`.

Подробнее: [mip workspaces](/ru/commands/workspaces).

---

### `plugins` — конфигурация плагинов

**Тип:** объект  
**Обязательное:** нет  
**Пример:** `logger: { enabled: true, logFile: "mip.log" }`

Конфигурация плагинов MIP. Каждый ключ — имя плагина, значение — его настройки.

**Стандартные поля:**
- `enabled` — включён ли плагин
- Остальные поля — специфичны для каждого плагина

---

## 🔧 Добавление зависимостей

### Вручную

Добавь в `mip.yml`:

```yaml
dependencies:
  axios: ^1.6.0
```

### Через CLI

```bash
mip install axios
```

### С сохранением в devDependencies

```bash
mip install jest --save-dev
```

### Без сохранения

```bash
mip install nodemon --no-save
```

---

## 📜 Добавление скриптов

### Вручную

```yaml
scripts:
  start: node index.js
  dev: nodemon index.js
```

### Запуск

```bash
mip run start
mip run dev
```

---

## 🌍 Смена языка

### Через CLI

```bash
mip language ru
```

### Вручную

```yaml
language: ru
```

### Доступные языки

| Код | Язык |
|-----|------|
| `en` | English |
| `ru` | Русский |
| `es` | Español |
| `fr` | Français |
| `de` | Deutsch |
| `it` | Italiano |
| `pt` | Português |
| `zh` | 中文 |
| `ja` | 日本語 |
| `ko` | 한국어 |

---

## 🧩 Настройка workspaces

### Добавление

```yaml
workspaces:
  - packages/*
  - apps/*
  - libs/shared
```

### Поддерживаемые паттерны

| Паттерн | Описание |
|---------|----------|
| `packages/*` | Все папки внутри `packages/` |
| `apps/*` | Все папки внутри `apps/` |
| `libs/shared` | Конкретная папка |

### Команды

```bash
mip workspaces list
mip workspaces run test
mip workspaces install
```

---

## 🔌 Настройка плагинов

### Добавление конфига

```yaml
plugins:
  logger:
    enabled: true
    logFile: mip.log
  notifier:
    enabled: false
    webhook: https://example.com/webhook
```

### Включение/отключение

```bash
mip plugin enable logger
mip plugin disable notifier
```

---

## 🔄 Миграция из `mip.json` или `package.json`

При первом запуске MIP автоматически мигрирует старые конфиги:

```bash
# Было
mip.json
mip-lock.json

# Стало
mip.yml          # с бэкапом mip.json.backup
mip-lock.yml     # с бэкапом mip-lock.json.backup
```

Старые файлы сохраняются как `.backup` на случай отката. (Функция в бете)

---

## 💡 Лучшие практики

1. **Всегда коммить `mip-lock.yml`** — гарантирует воспроизводимость
2. **Используй `--save-dev`** — для инструментов разработки
3. **Не коммить `.mip/`** — добавь в `.gitignore`
4. **Используй конкретные версии** в `mip-lock.yml`
5. **Обновляй `language`** — если нужны переводы
6. **Добавляй комментарии в `mip.yml`** — YAML это позволяет!

---

## 🔗 Связанные страницы

- [mip init](/ru/commands/init) — создание `mip.yml`
- [mip install](/ru/commands/install) — добавление зависимостей
- [mip run](/ru/commands/run) — запуск скриптов
- [mip workspaces](/ru/commands/workspaces) — монорепозитории
- [mip language](/ru/commands/language) — смена языка
