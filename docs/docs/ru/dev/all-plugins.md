---
title: "Всё о плагинах в MIP"
description: "Полное руководство по плагинам: структура, хуки, API, команды, примеры и лучшие практики."
---

# Всё о плагинах в MIP 🧩

Плагины — это способ расширить MIP без изменения основного кода. Они могут:

- Регистрировать свои команды
- Подписываться на события (хуки)
- Читать и изменять конфигурацию проекта
- Работать с установленными пакетами
- Использовать API MIP
- Логировать действия
- И многое другое

---

## 📁 Структура плагина

Минимальный плагин — это папка с двумя файлами:

```
plugins/my-plugin/
├── index.js       # Код плагина
└── package.json   # Метаданные (опционально)
```

### package.json (опционально)

```json
{
  "name": "mip-plugin-my-plugin",
  "version": "1.0.0",
  "description": "My awesome plugin",
  "main": "index.js",
  "dependencies": {}
}
```

### index.js — полная структура

```javascript
module.exports = {
  // ==========================================
  // ОБЯЗАТЕЛЬНО
  // ==========================================
  name: 'my-plugin',           // Уникальное имя
  version: '1.0.0',            // Версия

  // ==========================================
  // КОМАНДЫ (доступны через mip pe)
  // ==========================================
  commands: {
    mycommand: async (args) => {
      console.log('My command executed!');
    },
    help: async () => {
      console.log('Available commands: mycommand');
    },
  },

  // ==========================================
  // ХУКИ (подписка на события MIP)
  // ==========================================
  hooks: {
    beforeInstall: async (pkg, version, options) => {
      console.log(`[my-plugin] Installing ${pkg}@${version}`);
    },
    afterInstall: async (pkgInfo) => {
      console.log(`[my-plugin] Installed ${pkgInfo.name}@${pkgInfo.version}`);
    },
    beforeUninstall: async (pkg, options) => {
      console.log(`[my-plugin] Removing ${pkg}`);
    },
    afterUninstall: async (pkg) => {
      console.log(`[my-plugin] Removed ${pkg}`);
    },
    beforeUpdate: async (pkg, currentVersion, newVersion) => {
      console.log(`[my-plugin] Updating ${pkg} ${currentVersion} -> ${newVersion}`);
    },
    afterUpdate: async (pkg, oldVersion, newVersion) => {
      console.log(`[my-plugin] Updated ${pkg} ${oldVersion} -> ${newVersion}`);
    },
    beforeResolve: async (pkg, versionRange) => {
      console.log(`[my-plugin] Resolving ${pkg}@${versionRange}`);
    },
    afterResolve: async (pkgInfo) => {
      console.log(`[my-plugin] Resolved ${pkgInfo.name}@${pkgInfo.version}`);
    },
    beforeDownload: async (pkg, version, url) => {
      console.log(`[my-plugin] Downloading ${pkg}@${version}`);
    },
    afterDownload: async (pkg, version, size, duration) => {
      console.log(`[my-plugin] Downloaded ${pkg}@${version} (${size} bytes, ${duration}ms)`);
    },
    beforeExtract: async (pkg, version, targetDir) => {
      console.log(`[my-plugin] Extracting ${pkg}@${version} to ${targetDir}`);
    },
    afterExtract: async (pkg, version, targetDir) => {
      console.log(`[my-plugin] Extracted ${pkg}@${version}`);
    },
    beforeCacheRead: async (pkg, version) => {
      console.log(`[my-plugin] Reading cache for ${pkg}@${version}`);
    },
    afterCacheRead: async (pkg, version, data) => {
      console.log(`[my-plugin] Cache read for ${pkg}@${version}`);
    },
    beforeCacheWrite: async (pkg, version, data) => {
      console.log(`[my-plugin] Writing cache for ${pkg}@${version}`);
    },
    afterCacheWrite: async (pkg, version) => {
      console.log(`[my-plugin] Cache written for ${pkg}@${version}`);
    },
    beforeAudit: async (lockData) => {
      console.log(`[my-plugin] Auditing ${Object.keys(lockData.packages || {}).length} packages`);
    },
    afterAudit: async (results) => {
      console.log(`[my-plugin] Found ${results.length} vulnerabilities`);
    },
    beforeCi: async (options) => {
      console.log(`[my-plugin] Running CI install`);
    },
    afterCi: async (installedCount) => {
      console.log(`[my-plugin] CI install complete: ${installedCount} packages`);
    },
    onError: async (err, context) => {
      console.error(`[my-plugin] Error: ${err.message}`);
    },
  },

  // ==========================================
  // ИНИЦИАЛИЗАЦИЯ
  // ==========================================
  init: async ({ api }) => {
    // Регистрация динамических команд
    api.registerCommand('dynamic', 'my-plugin', async (args) => {
      console.log('Dynamic command!', args);
    });

    // Доступ к API
    const version = api.getVersion();
    const cwd = api.getCwd();
    console.log(`[my-plugin] Initialized in ${cwd}, MIP v${version}`);
  },

  // ==========================================
  // УНИЧТОЖЕНИЕ (при деактивации)
  // ==========================================
  destroy: async () => {
    console.log('[my-plugin] Destroyed');
  },
};
```

---

## 🛠️ API: что доступно плагинам

В `init()` и `hooks` плагин получает объект `api` с методами:

| Метод | Описание | Пример |
|-------|----------|--------|
| `api.registerCommand(name, plugin, handler)` | Регистрирует команду | `api.registerCommand('hello', 'my', async () => { ... })` |
| `api.getMipJson()` | Читает `mip.json` | `const config = api.getMipJson()` |
| `api.updateMipJson(data)` | Обновляет `mip.json` | `api.updateMipJson({ ...config, version: '2.0.0' })` |
| `api.getLockfile()` | Читает `mip-lock.json` | `const lock = api.getLockfile()` |
| `api.updateLockfile(data)` | Обновляет `mip-lock.json` | `api.updateLockfile({ ...lock, packages: {} })` |
| `api.getPackageInfo(name, version)` | Информация о пакете | `const info = await api.getPackageInfo('lodash', 'latest')` |
| `api.getInstalledPackages()` | Список установленных пакетов | `const pkgs = api.getInstalledPackages()` |
| `api.isPackageInstalled(name, version)` | Проверка установки | `if (api.isPackageInstalled('lodash')) { ... }` |
| `api.addDependency(name, version, dev)` | Добавляет зависимость | `api.addDependency('lodash', '^4.17.0', false)` |
| `api.removeDependency(name)` | Удаляет зависимость | `api.removeDependency('lodash')` |
| `api.runCommand(command, args)` | Выполняет MIP-команду | `api.runCommand('install', ['lodash'])` |
| `api.exec(command, options)` | Выполняет shell-команду | `api.exec('echo "Hello"')` |
| `api.getCacheSize()` | Размер кэша | `const size = api.getCacheSize()` |
| `api.clearCache()` | Очищает кэш | `api.clearCache()` |
| `api.getCwd()` | Текущая директория | `const cwd = api.getCwd()` |
| `api.getVersion()` | Версия MIP | `const version = api.getVersion()` |
| `api.log(message, level)` | Логирование | `api.log('Hello', 'info')` |

---

## 📦 Примеры плагинов

### 1. Плагин-калькулятор

```javascript
module.exports = {
  name: 'calc',
  version: '1.0.0',

  commands: {
    calc: async (args) => {
      const a = parseFloat(args[0]);
      const op = args[1];
      const b = parseFloat(args[2]);

      if (isNaN(a) || isNaN(b)) {
        console.log('❌ Введите числа');
        return;
      }

      const operations = {
        '+': (a, b) => a + b,
        '-': (a, b) => a - b,
        '*': (a, b) => a * b,
        '/': (a, b) => a / b,
      };

      if (!operations[op]) {
        console.log(`❌ Неизвестная операция: ${op}`);
        return;
      }

      if (op === '/' && b === 0) {
        console.log('❌ На ноль делить нельзя!');
        return;
      }

      console.log(`${a} ${op} ${b} = ${operations[op](a, b)}`);
    },
    help: async () => {
      console.log('Использование: mip pe calc <число> <операция> <число>');
      console.log('Операции: + - * /');
    },
  },

  init: async ({ api }) => {
    console.log('[calc] Калькулятор загружен!');
  },
};
```

### 2. Плагин-логгер

```javascript
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'logger',
  version: '1.0.0',

  hooks: {
    beforeInstall: async (pkg, version) => {
      this.log(`INSTALL: ${pkg}@${version}`);
    },
    afterInstall: async (pkgInfo) => {
      this.log(`INSTALLED: ${pkgInfo.name}@${pkgInfo.version}`);
    },
    onError: async (err) => {
      this.log(`ERROR: ${err.message}`);
    },
  },

  init: async ({ api }) => {
    this.logFile = path.join(api.getCwd(), 'mip.log');
    this.log('LOG: Plugin initialized');
    console.log('[logger] Логирование в mip.log');
  },

  log: (message) => {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(this.logFile, `[${timestamp}] ${message}\n`);
  },
};
```

### 3. Плагин-аудитор

```javascript
module.exports = {
  name: 'auditor',
  version: '1.0.0',

  hooks: {
    beforeAudit: async (lockData) => {
      const total = Object.keys(lockData.packages || {}).length;
      this.totalPackages = total;
      console.log(`[auditor] Сканирую ${total} пакетов...`);
    },
    afterAudit: async (results) => {
      const critical = results.filter(r => r.severity === 'critical').length;
      const high = results.filter(r => r.severity === 'high').length;

      console.log(`[auditor] Critical: ${critical}, High: ${high}`);

      if (critical > 0 || high > 0) {
        console.log('[auditor] ⚠️ Найдены уязвимости!');
      }
    },
  },

  init: async ({ api }) => {
    console.log('[auditor] Аудитор загружен');
  },
};
```

### 4. Плагин-экспортёр

```javascript
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'exporter',
  version: '1.0.0',

  commands: {
    export: async (args) => {
      const api = this.api;
      const lock = api.getLockfile();
      const mip = api.getMipJson();

      const data = {
        project: mip.name,
        version: mip.version,
        dependencies: Object.keys(lock?.packages || {}).length,
        packages: lock?.packages || {},
      };

      const outputFile = args[0] || 'export.json';
      fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
      console.log(`✅ Экспорт в ${outputFile}`);
    },
  },

  init: async ({ api }) => {
    this.api = api;
    console.log('[exporter] Плагин загружен');
  },
};
```

### 5. Плагин-очистка кэша

```javascript
module.exports = {
  name: 'cleaner',
  version: '1.0.0',

  commands: {
    clean: async (args) => {
      const api = this.api;
      const size = api.getCacheSize();
      console.log(`📦 Размер кэша: ${(size / 1024 / 1024).toFixed(2)} MB`);

      if (args.includes('--force')) {
        api.clearCache();
        console.log('✅ Кэш очищен');
      } else {
        console.log('💡 Используйте --force для очистки');
      }
    },
  },

  init: async ({ api }) => {
    this.api = api;
    console.log('[cleaner] Плагин загружен');
  },
};
```

---

## 🚀 Команды для управления плагинами

```bash
# Создать плагин
mip plugin create my-plugin

# Скомпилировать
mip plugin compile my-plugin

# Активировать
mip plugin activate my-plugin

# Посмотреть список
mip plugin list

# Деактивировать
mip plugin deactivate my-plugin

# Удалить
mip plugin remove my-plugin

# Очистить всё
mip plugin cleanall

# Выполнить команду плагина
mip pe my-plugin my-command arg1 arg2

# Выполнить команду плагина (сокращённо)
mip pe my-plugin my-command
```

---

## 🧪 Тестирование плагинов

### Тестирование изолированно

```javascript
// tests/plugin.test.js
const plugin = require('../plugins/my-plugin/index');

describe('my-plugin', () => {
  test('plugin has name', () => {
    expect(plugin.name).toBe('my-plugin');
  });

  test('plugin has commands', () => {
    expect(plugin.commands).toBeDefined();
  });

  test('command works', async () => {
    const spy = jest.spyOn(console, 'log');
    await plugin.commands.mycommand(['test']);
    expect(spy).toHaveBeenCalledWith('My command executed!');
    spy.mockRestore();
  });
});
```

### Интеграционный тест

```javascript
// tests/integration/plugin.test.js
const { getPluginManager } = require('../lib/api/plugin-manager');

describe('plugin integration', () => {
  test('plugin loaded correctly', () => {
    const pm = getPluginManager();
    const plugin = pm.getPlugin('my-plugin');
    expect(plugin).toBeDefined();
    expect(plugin.name).toBe('my-plugin');
  });
});
```

---

## 📊 Сравнение: встроенная команда vs плагин

| Характеристика | Встроенная команда (fork) | Плагин |
|----------------|---------------------------|--------|
| **Сложность** | Править `bin/mip.js` | Просто создать файл |
| **Обновление** | Пересобирать MIP | Перекомпилить плагин |
| **Распространение** | Только через форк | Можно распространять отдельно |
| **i18n** | ✅ Поддерживается | ❌ Нет (свои переводы) |
| **Хуки** | ❌ Нет | ✅ Есть (хуки) |
| **API** | ❌ Нет | ✅ Есть (api методы) |
| **Изоляция** | В коде MIP | Отдельная папка |
| **Ошибки** | Ломают MIP | Ломают только плагин |

---

## 📚 Связанные страницы

- [mip plugin](/commands/plugin) — управление плагинами
- [mip pe](/commands/pe) — выполнение команд плагинов
- [Хуки и плагины](/dev/hooks) — расширение функциональности
- [Добавление команд](/dev/adding-commands) — два способа добавить команду
