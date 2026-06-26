---
title: "Добавление команд в MIP"
description: "Как создать и зарегистрировать новую команду в MIP — два способа: встроенная команда (fork) и плагин."
---

# Добавление команд в MIP

В MIP есть два способа добавить команду:

1. **Встроенная команда (fork)** — через `bin/mip.js` (для ядра MIP)
2. **Команда плагина** — через `api.registerCommand()` (рекомендуемый для расширений)

---

## Способ 1: Встроенная команда (через fork)

Подходит только для команд, которые должны быть частью самого MIP. Например, `install`, `init`, `audit`.

### 1. Создай файл в `lib/commands/`

```javascript
// lib/commands/my-command.js
const { loadLangForCwd, getI18n } = require('../i18n');

async function myCommand(arg, options = {}) {
  const { t } = getI18n(loadLangForCwd(process.cwd()));
  
  console.log(t('commands.my_command.running'));
  console.log(`Arg: ${arg}`);
  
  if (options.verbose) {
    console.log('Verbose mode enabled');
  }
  
  console.log(t('commands.my_command.done'));
}

module.exports = { myCommand };
```

### 2. Добавь в `bin/mip.js`

В `switch (command)` добавь новый `case`:

```javascript
case 'my-command': {
  const { myCommand } = require('../lib/commands/my-command');
  const args = process.argv.slice(3);
  
  await myCommand(args[0], {
    verbose: args.includes('--verbose') || args.includes('-v'),
    force: args.includes('--force') || args.includes('-f'),
  });
  break;
}
```

### 3. Добавь в справку

В `showHelp()` добавь описание:

```javascript
console.log(`
Commands:
  init                    Create a new project
  install <pkg>           Install a package
  my-command <arg>        My custom command
  // ...
`);
```

### 4. Добавь переводы (i18n)

В `lib/i18n/locales/ru.json`:

```json
{
  "commands": {
    "my_command": {
      "running": "🚀 Запуск моей команды...",
      "done": "✅ Готово!",
      "usage": "📋 Использование: mip my-command <arg> [--verbose]"
    }
  }
}
```

В `en.json`:

```json
{
  "commands": {
    "my_command": {
      "running": "🚀 Running my command...",
      "done": "✅ Done!",
      "usage": "📋 Usage: mip my-command <arg> [--verbose]"
    }
  }
}
```

### 5. Пересобери MIP

```bash
npm run build
mip my-command test --verbose
```

---

## Способ 2: Команда плагина (рекомендуемый)

Подходит для всех пользовательских команд. Команды регистрируются динамически через API плагинов.

### 1. Создай плагин

```bash
mip plugin create my-plugin
```

### 2. Отредактируй `plugins/my-plugin/index.js`

```javascript
module.exports = {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'My plugin with custom commands',

  commands: {
    'my-command': async (args) => {
      const name = args[0] || 'world';
      console.log(`Hello, ${name}! 👋`);
    },
    'my-info': async () => {
      console.log('My plugin v1.0.0');
      console.log('Available commands: my-command <name>, my-info');
    },
  },

  init: async ({ api }) => {
    // Альтернативный способ — динамическая регистрация
    api.registerCommand('my-dynamic', 'my-plugin', async (args) => {
      console.log('Dynamic command!', args);
    });
    
    console.log('[my-plugin] Initialized');
  },

  hooks: {
    beforeInstall: async (pkg, version) => {
      console.log(`[my-plugin] Installing ${pkg}@${version}`);
    },
  },

  destroy: async () => {
    console.log('[my-plugin] Destroyed');
  },
};
```

### 3. Скомпилируй и активируй

```bash
mip plugin compile my-plugin
mip plugin activate my-plugin
```

### 4. Используй

```bash
# Команда из commands: {}
mip pe my-plugin my-command
mip pe my-plugin my-command zshx
mip pe my-plugin my-info

# Динамическая команда из init()
mip pe my-plugin my-dynamic arg1 arg2
```

---

## Сравнение способов

| Характеристика | Fork (встроенная) | Плагин |
|----------------|-------------------|--------|
| **Сложность** | Нужно править код MIP | Работает изолированно |
| **Обновление** | Пересобирать MIP | Просто перекомпилить плагин |
| **Распространение** | Только через форк MIP | Можно распространять отдельно |
| **i18n** | Поддерживается | Нет (плагины сами управляют) |
| **Рекомендация** | Для ядра MIP | Для всего остального |

---

## API для плагинов

В `init()` плагин получает объект `api` с методами:

| Метод | Описание |
|-------|----------|
| `api.registerCommand(name, plugin, handler)` | Регистрирует команду |
| `api.getMipJson()` | Читает `mip.yml` |
| `api.updateMipJson(data)` | Обновляет `mip.yml` |
| `api.getLockfile()` | Читает `mip-lock.yml` |
| `api.updateLockfile(data)` | Обновляет `mip-lock.yml` |
| `api.getPackageInfo(name, version)` | Получает информацию о пакете |
| `api.getInstalledPackages()` | Список установленных пакетов |
| `api.log(message, level)` | Логирование |
| `api.getVersion()` | Версия MIP |

---

## Связанные страницы

- [mip plugin](/ru/commands/plugin) — управление плагинами
- [mip pe](/ru/commands/pe) — выполнение команд плагинов
- [Архитектура MIP](/ru/dev/architecture) — устройство проекта
