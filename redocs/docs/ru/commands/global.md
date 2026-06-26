---
title: "mip global — управление глобальными пакетами"
description: "Команда global позволяет устанавливать, удалять и просматривать пакеты, установленные глобально для использования из любого места в системе."
---

# mip global

::: callout info "Что это?" icon:globe
`mip global` — это команда для управления **глобально установленными пакетами**. В отличие от обычной установки (которая использует глобальный кэш и симлинки в проекте), глобальная установка помещает пакеты в `~/.mip/global/` и делает их бинарники доступными из любого места через командную строку. Это удобно для инструментов, которые вы используете во всех проектах, например, тестовых раннеров, линтеров или генераторов кода.
:::

## Синтаксис

```bash
mip global <action> [package-name]
```

## Аргументы

| Имя | Тип | Обязательный | Описание |
|-----|-----|--------------|----------|
| `action` | строка | ✅ | Действие: `install`, `uninstall`, `list` |
| `package-name` | строка | ❌ | Имя пакета (требуется для `install` и `uninstall`) |

## Доступные действия

| Действие | Описание |
|----------|----------|
| `install` | Устанавливает пакет глобально, автоматически добавляет бинарник в PATH |
| `uninstall` | Удаляет глобально установленный пакет |
| `list` | Показывает список всех глобально установленных пакетов |

## Логика работы

### `install`
1. Создаёт глобальную директорию `~/.mip/global/` (если её нет).
2. Переходит в эту директорию.
3. Если `mip.json` отсутствует — создаёт его через `mip init`.
4. Устанавливает указанный пакет через `mip install`.
5. Удаляет временный `mip.json` (если он был создан).
6. Проверяет, добавлена ли глобальная папка (`~/.mip/global/node_modules/.bin`) в PATH.
7. Если нет — добавляет в `.zshrc` или `.bashrc`.

### `uninstall`
1. Удаляет папку пакета из `~/.mip/global/node_modules/`.
2. Сообщает об успешном удалении или об отсутствии пакета.

### `list`
1. Сканирует папку `~/.mip/global/node_modules/`.
2. Выводит список всех установленных пакетов (исключая служебные).

## Примеры

::: tabs
== tab "Установка глобального пакета"
```bash
mip global install eslint
```

**Пример вывода:**
```
🌍 Installing eslint globally...
✅ Added to PATH in /home/user/.zshrc
🔄 Run: source /home/user/.zshrc
✅ eslint installed globally
📁 Location: /home/user/.mip/global/node_modules/.bin/eslint
```

Теперь можно использовать `eslint` из любого места:
```bash
eslint --fix src/
```
:::
== tab "Установка нескольких пакетов"
```bash
mip global install jest typescript nodemon
```

**Пример вывода:**
```
🌍 Installing jest globally...
✅ jest installed globally
🌍 Installing typescript globally...
✅ typescript installed globally
🌍 Installing nodemon globally...
✅ nodemon installed globally
```
:::
== tab "Список глобальных пакетов"
```bash
mip global list
```

**Пример вывода:**
```
🌍 Globally installed packages:

  • eslint
  • jest
  • typescript
  • nodemon

📊 Total: 4
```
:::
== tab "Удаление глобального пакета"
```bash
mip global uninstall eslint
```

**Пример вывода:**
```
🗑️ Uninstalling eslint globally...
✅ eslint removed globally
```
:::
== tab "Попытка удалить несуществующий пакет"
```bash
mip global uninstall some-package
```

**Пример вывода:**
```
🗑️ Uninstalling some-package globally...
❌ some-package not found globally
```
:::

## Типичные ошибки

::: callout warning "⚠️ Package not found" icon:alert-triangle
**Причина:** Указанный пакет не существует в реестре.

**Решение:**
1. Проверьте правильность написания имени пакета.
2. Убедитесь, что пакет доступен в реестре: `mip search <package-name>`
:::

::: callout info "🔄 PATH not updated" icon:info
**Причина:** Глобальная папка не добавлена в PATH.

**Решение:**
После установки команда пытается добавить PATH автоматически. Если это не сработало — добавьте вручную:
```bash
echo 'export PATH="$PATH:~/.mip/global/node_modules/.bin"' >> ~/.zshrc
source ~/.zshrc
```
:::

::: callout tip "💡 Совет" icon:lightbulb
**Когда использовать глобальную установку:**
- Инструменты, которые вы используете **во всех проектах** (например, `eslint`, `prettier`, `jest`).
- CLI-утилиты, которые должны быть доступны из любого места (например, `create-react-app`, `vue-cli`).

**Когда НЕ использовать глобальную установку:**
- Зависимости, которые специфичны для одного проекта.
- Пакеты, которые могут конфликтовать по версиям в разных проектах.

**Лучшая практика:** Для проектов лучше использовать локальные установки (`mip install`), а глобальные — только для универсальных инструментов.
:::

## Связанные команды

- [mip install](/ru/commands/install) — локальная установка в текущий проект.
- [mip list](/ru/commands/list) — показывает локально установленные пакеты.
- [mip doctor](/ru/commands/doctor) — диагностика окружения (проверяет PATH).

::: collapsible "🧠 Где хранятся глобальные пакеты?"
```
~/.mip/
├── global/
│   ├── node_modules/
│   │   ├── eslint/
│   │   ├── jest/
│   │   └── .bin/
│   │       ├── eslint        ← ссылка на исполняемый файл
│   │       └── jest          ← ссылка на исполняемый файл
│   └── mip.json (временный)
└── store/                     (глобальный кэш пакетов)
```

**Структура:**
- `~/.mip/global/` — корень глобального окружения.
- `node_modules/` — установленные пакеты.
- `.bin/` — исполняемые файлы (добавляются в PATH).

**Важно:** Глобальные пакеты **не зависят** от локального `mip.yml` и не учитываются в `mip-lock.yml`.
:::
