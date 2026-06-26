---
title: "mip pe — выполнение команд плагинов"
description: "Команда pe (plugin-execute) выполняет команды, зарегистрированные в плагинах MIP."
---

# mip pe

Команда `pe` (plugin-execute) используется для выполнения команд, которые предоставляют плагины MIP.

---

## Синтаксис

```bash
mip pe <plugin> <command> [args...]
```

## Аргументы

| Имя | Тип | Обязательный | Описание |
|-----|-----|--------------|----------|
| `plugin` | строка | ✅ | Имя плагина |
| `command` | строка | ✅ | Имя команды внутри плагина |
| `args` | массив | ❌ | Аргументы, передаваемые в команду |

---

## Примеры

### Базовое выполнение

```bash
mip pe hello hello
```

Вывод:
```
Hello, world! 👋
```

### С аргументами

```bash
mip pe hello hello zshx
```

Вывод:
```
Hello, zshx! 👋
```

### С несколькими аргументами

```bash
mip pe my-plugin my-command arg1 arg2 arg3
```

---

## Как это работает

1. MIP проверяет, активирован ли указанный плагин
2. Проверяет, существует ли команда в плагине
3. Выполняет команду с переданными аргументами

---

## Ошибки

### Плагин не найден

```bash
mip pe unknown-plugin hello
```

Вывод:
```
[ERROR] Plugin "unknown-plugin" not found or not activated
[INFO] Available plugins: hello, my-plugin
```

### Команда не найдена

```bash
mip pe hello unknown-command
```

Вывод:
```
[ERROR] Command "unknown-command" not found in plugin "hello"
[INFO] Available commands: hello, help
```

---

## Связанные команды

- [mip plugin](/ru/commands/plugin) — управление плагинами
