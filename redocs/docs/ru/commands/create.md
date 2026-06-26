---
title: "mip create — создание нового проекта из шаблона"
description: "Команда create генерирует структуру проекта на основе готовых шаблонов (Node.js, React, CLI, Express) с автоматической установкой зависимостей."
---

# mip create

::: callout info "Что это?" icon:rocket
`mip create` — это быстрый способ начать новый проект. Команда генерирует папку с проектом, создаёт все необходимые файлы на основе выбранного шаблона и автоматически устанавливает зависимости через `mip install`. Это избавляет от ручного копирования boilerplate-кода.
:::

## Синтаксис

```bash
mip create <template> <project-name>
```

## Аргументы

| Имя | Тип | Обязательный | Описание |
|-----|-----|--------------|----------|
| `template` | строка | ✅ | Имя шаблона: `node`, `react`, `cli`, `express` |
| `project-name` | строка | ✅ | Название проекта (будет использовано как имя папки и `name` в `mip.yml`) |

## Доступные шаблоны

| Шаблон | Описание | Устанавливаемые пакеты |
|--------|----------|----------------------|
| `node` | Базовый Node.js проект с `index.js` и скриптами `start`/`dev` | `nodemon` |
| `react` | React-приложение с настроенным Webpack через `react-scripts` | Устанавливается через npm (для совместимости) |
| `cli` | Шаблон для создания CLI-утилит с исполняемым файлом в `bin/` | Нет |
| `express` | Express-сервер с маршрутами и скриптами `start`/`dev` | `express`, `nodemon` |

## Логика работы

1. **Проверка аргументов** — если `template` или `project-name` не указаны, выводится справка.

2. **Загрузка шаблона** — из объекта `templates` выбирается конфигурация для указанного шаблона.

3. **Создание папки проекта** — если папка с таким именем уже существует — операция прерывается.

4. **Генерация файлов** — все файлы из шаблона создаются в папке проекта:
   - Поддерживается подстановка `{{name}}` → заменяется на `project-name`.
   - Вложенные папки создаются рекурсивно.

5. **Установка прав** — для шаблона `cli` файл `bin/cli.js` получает права на исполнение (`chmod 755`).

6. **Установка зависимостей** — если в шаблоне указан список пакетов, выполняется `mip install` для каждого.

## Примеры

::: tabs
== tab "Создание Node.js проекта"
```bash
mip create node my-app
```

**Результат:**
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

**Структура проекта:**
```
my-app/
├── index.js          # Основной файл
├── package.json      # Зависимости и скрипты
├── README.md         # Документация
└── .gitignore        # Игнорируемые файлы
```
:::
== tab "Создание React приложения"
```bash
mip create react my-app
```

**Результат:**
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

**Структура проекта:**
```
my-app/
├── src/
│   ├── App.js        # Главный компонент
│   └── index.js      # Точка входа
├── public/
│   └── index.html    # HTML-шаблон
└── package.json      # Зависимости React
```
:::
== tab "Создание CLI утилиты"
```bash
mip create cli my-tool
```

**Результат:**
```
📦 Creating cli project: my-tool

  ✅ bin/cli.js (executable)
  ✅ package.json
  ✅ README.md

✅ Created! cd my-tool && mip run start
```

**Структура проекта:**
```
my-tool/
├── bin/
│   └── cli.js        # Исполняемый скрипт
├── package.json      # Секция "bin"
└── README.md
```
:::
== tab "Создание Express сервера"
```bash
mip create express my-api
```

**Результат:**
```
📦 Creating express project: my-api

  ✅ app.js
  ✅ package.json

📦 Installing dependencies...
  ✅ express installed
  ✅ nodemon installed

✅ Created! cd my-api && mip run start
```

**Структура проекта:**
```
my-api/
├── app.js            # Express-сервер
└── package.json      # Зависимости и скрипты
```
:::

## Типичные ошибки

::: callout warning "❌ Unknown template" icon:alert-triangle
**Причина:** Указан шаблон, которого нет в списке.

**Решение:** Используйте один из доступных шаблонов: `node`, `react`, `cli`, `express`. Проверьте правильность написания.
:::

::: callout danger "❌ Project already exists" icon:skull
**Причина:** Папка с указанным именем уже существует в текущей директории.

**Решение:**
1. Выберите другое имя для проекта.
2. Либо удалите существующую папку (если она вам не нужна).
3. Либо перейдите в другую директорию.
:::

::: callout tip "💡 Совет" icon:lightbulb
После создания проекта:
- Перейдите в папку проекта: `cd my-app`
- Запустите приложение: `mip run start` (или `mip run dev` для режима разработки с перезагрузкой)

Для React используйте `mip run build` для сборки продакшн-версии.
:::

## Связанные команды

- [mip init](/ru/commands/init) — инициализирует `mip.yml` в существующем проекте.
- [mip install](/ru/commands/install) — устанавливает зависимости в созданном проекте.
- [mip run](/ru/commands/run) — запускает скрипты из `mip.yml`.
