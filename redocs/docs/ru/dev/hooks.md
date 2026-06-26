---
title: "Хуки и плагины в MIP"
description: "Как расширить MIP с помощью хуков и плагинов — точки входа, API, примеры."
---

# Хуки и плагины в MIP

MIP имеет встроенную систему хуков и плагинов, которая позволяет расширять функциональность без изменения основного кода.

---

## 🧩 Что такое хуки?

Хуки — это места в коде MIP, где можно вставить свою логику. Плагины подписываются на хуки и выполняют код в нужные моменты.

**Пример:** плагин может выполнить код **перед** установкой пакета или **после** аудита.

---

## 📋 Полный список хуков

### Установка

| Хук | Когда вызывается | Аргументы |
|-----|------------------|-----------|
| `beforeInstall` | Перед установкой пакета | `(pkg, version, options)` |
| `afterInstall` | После установки пакета | `(pkgInfo)` |
| `beforeUninstall` | Перед удалением пакета | `(pkg, options)` |
| `afterUninstall` | После удаления пакета | `(pkg)` |
| `beforeUpdate` | Перед обновлением | `(pkg, currentVersion, newVersion)` |
| `afterUpdate` | После обновления | `(pkg, oldVersion, newVersion)` |

### Резолвинг

| Хук | Когда вызывается | Аргументы |
|-----|------------------|-----------|
| `beforeResolve` | Перед резолвингом версии | `(pkg, versionRange)` |
| `afterResolve` | После резолвинга | `(pkgInfo)` |

### Загрузка и распаковка

| Хук | Когда вызывается | Аргументы |
|-----|------------------|-----------|
| `beforeDownload` | Перед загрузкой tarball | `(pkg, version, url)` |
| `afterDownload` | После загрузки | `(pkg, version, size, duration)` |
| `beforeExtract` | Перед распаковкой | `(pkg, version, targetDir)` |
| `afterExtract` | После распаковки | `(pkg, version, targetDir)` |

### Кэш

| Хук | Когда вызывается | Аргументы |
|-----|------------------|-----------|
| `beforeCacheRead` | Перед чтением из кэша | `(pkg, version)` |
| `afterCacheRead` | После чтения | `(pkg, version, data)` |
| `beforeCacheWrite` | Перед записью в кэш | `(pkg, version, data)` |
| `afterCacheWrite` | После записи | `(pkg, version)` |

### Аудит и CI

| Хук | Когда вызывается | Аргументы |
|-----|------------------|-----------|
| `beforeAudit` | Перед аудитом | `(lockData)` |
| `afterAudit` | После аудита | `(results)` |
| `beforeCi` | Перед CI-установкой | `(options)` |
| `afterCi` | После CI-установки | `(installedCount)` |

### Ошибки

| Хук | Когда вызывается | Аргументы |
|-----|------------------|-----------|
| `onError` | При ошибке в любой команде | `(err, context)` |

---

## 🔌 Как использовать хуки в плагине

### Пример: плагин-логгер

```javascript
// plugins/logger/index.js
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'logger',
  version: '1.0.0',

  hooks: {
    beforeInstall: async (pkg, version) => {
      console.log(`[logger] Installing ${pkg}@${version}`);
      this.log(`INSTALL: ${pkg}@${version}`);
    },

    afterInstall: async (pkgInfo) => {
      console.log(`[logger] Installed ${pkgInfo.name}@${pkgInfo.version}`);
      this.log(`INSTALLED: ${pkgInfo.name}@${pkgInfo.version}`);
    },

    onError: async (err) => {
      console.error(`[logger] Error: ${err.message}`);
      this.log(`ERROR: ${err.message}`);
    },
  },

  init: async ({ api }) => {
    this.logFile = path.join(process.cwd(), 'mip-install.log');
    console.log('[logger] Logger plugin initialized');
  },

  log: (message) => {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(this.logFile, `[${timestamp}] ${message}\n`);
  },
};
```

---

## 🛠️ API для плагинов

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
| `api.exec(command, options)` | Выполнить shell-команду |

---

## 📦 Пример: плагин-аудитор

```javascript
// plugins/auditor/index.js
module.exports = {
  name: 'auditor',
  version: '1.0.0',

  hooks: {
    beforeAudit: async (lockData) => {
      console.log('[auditor] Starting audit...');
      const total = Object.keys(lockData.packages || {}).length;
      console.log(`[auditor] Scanning ${total} packages`);
    },

    afterAudit: async (results) => {
      const critical = results.filter(r => r.severity === 'critical').length;
      const high = results.filter(r => r.severity === 'high').length;
      
      console.log(`[auditor] Critical: ${critical}, High: ${high}`);
      
      if (critical > 0) {
        console.log('[auditor] ⚠️ Critical vulnerabilities found!');
      }
    },
  },

  init: async ({ api }) => {
    console.log('[auditor] Auditor plugin loaded');
  },
};
```

---

## 🚀 Как создать и использовать плагин

### 1. Создай плагин

```bash
mip plugin create logger
```

### 2. Вставь код выше в `plugins/logger/index.js`

### 3. Скомпилируй и активируй

```bash
mip plugin compile logger
mip plugin activate logger
```

### 4. Проверь

```bash
mip install lodash
```

Вывод:
```
[logger] Installing lodash@latest
[logger] Installed lodash
```

---

## 📂 Где лежат хуки в коде

| Хук | Файл |
|-----|------|
| `beforeInstall` | `lib/commands/install.js` |
| `afterInstall` | `lib/commands/install.js` |
| `beforeResolve` | `lib/core/resolver.js` |
| `afterResolve` | `lib/core/resolver.js` |
| `beforeDownload` | `lib/core/parallel-download.js` |
| `afterDownload` | `lib/core/parallel-download.js` |
| `beforeAudit` | `lib/commands/audit.js` |
| `afterAudit` | `lib/commands/audit.js` |
| `onError` | `lib/commands/*.js` |

---

## 🧪 Тестирование плагинов

```bash
# Создать плагин
mip plugin create test-plugin

# Добавить хуки в index.js

# Скомпилировать
mip plugin compile test-plugin

# Активировать
mip plugin activate test-plugin

# Проверить работу (установить пакет)
mip install lodash

# Посмотреть логи
cat mip-install.log
```

---

## Связанные страницы

- [Добавление команд](/ru/dev/adding-commands) — как создать команду
- [Архитектура MIP](/ru/dev/architecture) — устройство проекта
- [mip plugin](/ru/commands/plugin) — управление плагинами
