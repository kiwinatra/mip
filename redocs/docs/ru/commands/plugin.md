---
title: "mip plugin — управление плагинами"
description: "Управление плагинами в MIP: создание, компиляция, активация, выполнение команд."
---

# mip plugin

MIP имеет встроенную систему плагинов. Плагины позволяют расширять функциональность MIP без изменения основного кода.

---

## Структура плагина

Минимальный плагин выглядит так:

```javascript
module.exports = {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'My plugin',

  // Команды плагина
  commands: {
    hello: async (args) => {
      console.log('Hello, world!');
    },
  },

  // Хуки
  hooks: {
    beforeInstall: async (pkg, version) => {
      console.log(`[my-plugin] Installing ${pkg}@${version}`);
    },
  },

  // Инициализация
  init: async ({ api }) => {
    console.log('[my-plugin] Initialized');
  },

  // Уничтожение
  destroy: async () => {
    console.log('[my-plugin] Destroyed');
  },
};
```

---

## Команды

### `mip plugin create <name>`

Создаёт новый плагин в папке `plugins/`:

```bash
mip plugin create my-plugin
```

**Структура:**
```
plugins/my-plugin/
├── index.js       # Код плагина
├── package.json   # Зависимости
├── README.md      # Документация
└── .gitignore     # Игнорируемые файлы
```

---

### `mip plugin compile <name>`

Компилирует плагин и сохраняет его в кэш MIP:

```bash
mip plugin compile my-plugin
```

Плагин сохраняется в `~/.mip_cache/plugins/my-plugin/`.

---

### `mip plugin activate <name>`

Активирует плагин. Плагин загружается и становится доступным:

```bash
mip plugin activate my-plugin
```

Активированные плагины загружаются при каждом запуске MIP.

---

### `mip plugin deactivate <name>`

Деактивирует плагин:

```bash
mip plugin deactivate my-plugin
```

---

### `mip plugin list`

Показывает все установленные плагины и их статус:

```bash
mip plugin list
```

Пример вывода:
```
[INFO] Installed plugins (2):
---
  ACTIVE  hello@1.0.0
         /home/user/.mip_cache/plugins/hello
  inactive  my-plugin@1.0.0
         /home/user/.mip_cache/plugins/my-plugin
---
```

---

### `mip plugin remove <name>`

Удаляет плагин (из кэша и из проекта):

```bash
mip plugin remove my-plugin
```

---

### `mip plugin cleanall`

Полностью очищает всё: кэш, реестр, папку `plugins/`:

```bash
mip plugin cleanall
```

---

## Выполнение команд плагина

### `mip pe <plugin> <command> [args...]`

Выполняет команду плагина:

```bash
# Выполнить команду hello из плагина hello
mip pe hello hello

# С аргументами
mip pe hello hello world
```

---

## Создание плагина с нуля

### 1. Создаём плагин

```bash
mip plugin create hello
```

### 2. Редактируем `plugins/hello/index.js`

```javascript
module.exports = {
  name: 'hello',
  version: '1.0.0',

  commands: {
    hello: async (args) => {
      const name = args[0] || 'world';
      console.log(`Hello, ${name}! 👋`);
    },
    help: async () => {
      console.log(`
hello commands:
  hello <name>  - Say hello
  help          - Show this help
`);
    },
  },

  hooks: {
    beforeInstall: async (pkg, version) => {
      console.log(`[hello] Installing ${pkg}@${version}`);
    },
    afterInstall: async (pkgInfo) => {
      console.log(`[hello] Installed ${pkgInfo.name}`);
    },
    onError: async (err) => {
      console.error(`[hello] Error: ${err.message}`);
    },
  },

  init: async ({ api }) => {
    console.log('[hello] Initialized');
  },

  destroy: async () => {
    console.log('[hello] Destroyed');
  },
};
```

### 3. Компилируем и активируем

```bash
mip plugin compile hello
mip plugin activate hello
```

### 4. Проверяем

```bash
mip pe hello hello
# Hello, world! 👋

mip pe hello hello zshx
# Hello, zshx! 👋

mip pe hello help
# Показывает справку
```

---

## Хуки

Плагины могут подписываться на события MIP:

| Хук | Когда вызывается |
|-----|------------------|
| `beforeInstall` | Перед установкой пакета |
| `afterInstall` | После установки пакета |
| `beforeUninstall` | Перед удалением пакета |
| `afterUninstall` | После удаления пакета |
| `beforeUpdate` | Перед обновлением пакета |
| `afterUpdate` | После обновления пакета |
| `beforeResolve` | Перед резолвингом зависимости |
| `afterResolve` | После резолвинга |
| `beforeDownload` | Перед загрузкой tarball |
| `afterDownload` | После загрузки |
| `beforeExtract` | Перед распаковкой |
| `afterExtract` | После распаковки |
| `beforeCacheRead` | Перед чтением из кэша |
| `afterCacheRead` | После чтения из кэша |
| `beforeCacheWrite` | Перед записью в кэш |
| `afterCacheWrite` | После записи в кэш |
| `beforeAudit` | Перед аудитом |
| `afterAudit` | После аудита |
| `beforeCi` | Перед CI-установкой |
| `afterCi` | После CI-установки |
| `onError` | При ошибке |

---

## Связанные команды

- [mip plugin](/commands/plugin) — управление плагинами
- [mip pe](/commands/pe) — выполнение команд плагинов
