---
title: "Быстрый старт"
description: "Установка MIP и создание первого проекта за 5 минут."
---

# Быстрый старт 🚀

Установи MIP и создай первый проект за 5 минут.

---

## 📦 Установка MIP

### 1. Клонируй репозиторий

```bash
git clone https://github.com/kiwinatra/mip
cd mip
```

### 2. Установи зависимости

```bash
npm install
```

### 3. Собери проект

```bash
npm run build
```

### 4. Добавь в PATH (опционально)

Сборщик предложит добавить папку с бинарниками в `PATH`:

```bash
export PATH="$PATH:$(pwd)/bin"
```

Или добавь в `~/.zshrc` / `~/.bashrc`:

```bash
echo 'export PATH="$PATH:~/Desktop/mip/bin"' >> ~/.zshrc
source ~/.zshrc
```

Теперь `mip` доступен из любой папки.

---

## 🏗️ Создание проекта

### 1. Создай папку проекта

```bash
mkdir my-project
cd my-project
```

### 2. Инициализируй проект

```bash
mip init
```

MIP создаст:

```
my-project/
├── mip.yml          # Конфигурация проекта в YAML
├── .mip/            # Директория для кэша и манифеста
└── README.md        # Документация
```

::: tip "💡 Что такое mip.yml?"
`mip.yml` — это новый формат конфигурации на YAML. Он читается проще, поддерживает комментарии и приятнее для ручного редактирования, чем JSON.
:::

### 3. Посмотри `mip.yml`

```yaml
name: my-project
version: 1.0.0
language: en
dependencies: {}
devDependencies: {}
scripts: {}
workspaces: []
```

---

## 📦 Установка пакетов

### Установи Express

```bash
mip install express
```

Вывод:
```
📦 Installing express...
✅ express installed
```

### Проверь `mip.yml`

```yaml
dependencies:
  express: ^4.18.0
```

### Установи пакет для разработки

```bash
mip install nodemon --save-dev
```

### Установи всё из `mip.yml`

```bash
mip install
```

---

## 📜 Скрипты

### Добавь скрипты в `mip.yml`

```yaml
scripts:
  start: node index.js
  dev: nodemon index.js
```

### Запусти скрипт

```bash
mip run start
mip run dev
```

---

## 📂 Структура проекта

```
my-project/
├── mip.yml          # Конфигурация в YAML
├── mip-lock.yml     # Зафиксированные версии
├── .mip/
│   ├── manifest.json # Манифест установленных пакетов
│   ├── cache/        # Кэш загрузок
│   └── packages/     # Локальные пакеты
└── node_modules/     # Симлинки на глобальный кэш
```

---

## 🧪 Проверка

### Просмотр установленных пакетов

```bash
mip list
```

### Проверка устаревших пакетов

```bash
mip outdated
```

### Аудит безопасности

```bash
mip audit
```

---

## 🗑️ Очистка

### Очистка кэша

```bash
mip cache clean
```

### Очистка глобального кэша

```bash
mip cache clean --global
```

### Удаление пакета

```bash
mip uninstall express
```

---

## 🎉 Готово!

Ты установил MIP и создал первый проект. Дальше:

- [Конфигурация](/ru/setup/configuration) — настройка `mip.yml`
- [Команды](/ru/commands/install) — все команды MIP
- [Плагины](/ru/commands/plugin) — расширение MIP

---

## 🔗 Связанные страницы

- [Установка](/ru/setup) — полный гайд по установке
- [Конфигурация](/ru/setup/configuration) — настройка проекта
- [mip init](/ru/commands/init) — создание проекта
- [mip install](/ru/commands/install) — установка пакетов
