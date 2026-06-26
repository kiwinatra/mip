---
title: "Архитектура MIP"
description: "Как устроен MIP внутри: модули, потоки данных, файловая структура, ядро и API плагинов."
---

# Архитектура MIP

MIP — минималистичный пакетный менеджер с модульной архитектурой. Всё заточено под простоту и расширяемость.

---

## 📁 Структура проекта

```
mip/
├── bin/
│   └── mip.js                 # Точка входа. Парсит process.argv и вызывает команды
├── lib/
│   ├── api/                   # API для плагинов
│   │   ├── api-methods.js     # Методы, доступные плагинам
│   │   ├── config-handler.js  # Работа с конфигами плагинов
│   │   ├── hooks.js           # Система хуков
│   │   └── plugin-manager.js  # Управление плагинами
│   ├── commands/              # Все встроенные команды
│   │   ├── install.js
│   │   ├── init.js
│   │   ├── audit.js
│   │   └── ...
│   ├── core/                  # Основная логика
│   │   ├── resolver.js        # Разрешение зависимостей
│   │   ├── parallel-download.js # Параллельная загрузка
│   │   ├── super-cache.js     # Кэширование
│   │   ├── dedupe.js          # Дедупликация
│   │   ├── peer-resolver.js   # Peer-зависимости
│   │   ├── auditor.js         # Аудит безопасности
│   │   ├── workspace.js       # Монорепозитории
│   │   └── ...
│   ├── i18n/                  # Интернационализация
│   │   ├── index.js
│   │   ├── languages.js
│   │   └── locales/           # en.yml, ru.yml, ...
│   ├── ui/
│   │   └── cli.js             # Прогресс-бары, цветной вывод
│   └── utils/                 # Вспомогательные утилиты
│       ├── config.js          # Работа с mip.yml и lock-файлами
│       ├── registry.js        # Работа с npm реестром
│       ├── store.js           # Глобальный кэш (~/.mip/store/)
│       ├── http2-agent.js     # HTTP/2 клиент
│       ├── stream-extract.js  # Распаковка tarball
│       └── ...
└── package.json
```

---

## 🔄 Поток данных: установка пакета

```
1. Пользователь: mip install express
2. bin/mip.js → commands/install.js
3. install.js → utils/registry.js (получить информацию о пакете)
4. install.js → core/resolver.js (построить дерево зависимостей)
5. install.js → utils/store.js (проверить глобальный кэш)
6. install.js → core/parallel-download.js (скачать пакеты)
7. install.js → core/super-cache.js (проверить/сохранить в кэш)
8. install.js → utils/stream-extract.js (распаковать в ~/.mip/store/)
9. install.js → utils/config.js (обновить mip-lock.yml)
10. install.js → обновить манифест .mip/manifest.json
11. install.js → создать симлинк в node_modules/
12. Готово! ✅
```

---

## 🧩 Ключевые компоненты

### `utils/config.js` — работа с конфигами

Универсальный загрузчик, поддерживающий `mip.yml`, `mip.json` и `package.json`.

```javascript
const config = require('../utils/config');

// Автоматическое определение формата
const cfg = config.detectConfig();
const conf = config.readConfig();

// Сохранение в YAML
config.writeConfig({ name: 'my-project' });
```

### `utils/store.js` — глобальный кэш

Управляет хранением пакетов в `~/.mip/store/`.

```javascript
const store = require('../utils/store');

// Проверка наличия пакета
if (store.isPackageInStore('lodash', '4.17.21')) {
  // Используем из кэша
}

// Путь к пакету
const path = store.getPackageStorePath('lodash', '4.17.21');
```

### `core/resolver.js` — разрешение зависимостей

Строит дерево зависимостей. Кэширует результаты.

```javascript
const resolver = new DependencyResolver();
const tree = await resolver.resolveVersion('express', 'latest');
// Возвращает: { name, version, dependencies: { ... } }
```

### `core/parallel-download.js` — параллельная загрузка

Скачивает до 10 пакетов одновременно. Использует HTTP/2.

```javascript
const downloader = new ParallelDownloader();
const packages = await downloader.downloadPackages(tree);
```

### `core/super-cache.js` — трёхуровневый кэш

1. In-memory (LRU, 1000 элементов)
2. Диск (`.mip/cache/`)
3. In-flight (дедупликация параллельных запросов)

### `core/peer-resolver.js` — peer-зависимости

По умолчанию пропускает предупреждения. С флагом `--show-peer-warnings` показывает и спрашивает.

---

## 🌍 Интернационализация (i18n)

Поддерживается 10 языков: `en`, `ru`, `es`, `fr`, `de`, `it`, `pt`, `zh`, `ja`, `ko`.

**Как использовать в коде:**

```javascript
const { loadLangForCwd, getI18n } = require('../i18n');

async function myCommand() {
  const { t } = getI18n(loadLangForCwd(process.cwd()));
  console.log(t('commands.my_command.running'));
}
```

**Как добавить перевод:**

В `lib/i18n/locales/ru.yml`:

```yaml
commands:
  my_command:
    running: "🚀 Запуск..."
```

---

## 🔌 Плагины и API

### Система плагинов

Плагины живут в `plugins/` и компилируются в `~/.mip_cache/plugins/`.

**Структура плагина:**

```javascript
module.exports = {
  name: 'my-plugin',
  version: '1.0.0',

  commands: {
    hello: async (args) => console.log('Hello!'),
  },

  hooks: {
    beforeInstall: async (pkg) => console.log(`Installing ${pkg}`),
  },

  init: async ({ api }) => {
    console.log('Plugin initialized');
  },
};
```

### API методы для плагинов

| Метод | Описание |
|-------|----------|
| `api.registerCommand(name, plugin, handler)` | Регистрация команды |
| `api.getMipJson()` | Читает `mip.yml` |
| `api.updateMipJson(data)` | Обновляет `mip.yml` |
| `api.getLockfile()` | Читает `mip-lock.yml` |
| `api.getPackageInfo(name, version)` | Информация о пакете |
| `api.getInstalledPackages()` | Список установленных пакетов |
| `api.log(message, level)` | Логирование |

---

## 📂 Файловая система

```
~/.mip/
├── store/                 # Глобальный кэш
│   ├── lodash/
│   │   └── 4.17.21/
│   │       ├── package.json
│   │       └── index.js
│   └── express/
│       └── 4.18.2/
│           ├── package.json
│           └── lib/
└── global/                # Глобальные пакеты

project/
├── mip.yml                # Конфигурация (YAML)
├── mip-lock.yml           # Lock-файл (YAML)
├── .mip/
│   ├── manifest.json      # Манифест установленных пакетов
│   ├── cache/             # Кэш загрузок
│   └── packages/          # Локальные пакеты (если есть)
└── node_modules/          # Симлинки на глобальный кэш
```

---

## 🛠️ Утилиты (utils/)

| Файл | Назначение |
|------|------------|
| `config.js` | Работа с `mip.yml`, `mip-lock.yml`, миграция |
| `store.js` | Глобальный кэш (`~/.mip/store/`) |
| `registry.js` | Запросы к npm реестру |
| `http2-agent.js` | HTTP/2 клиент |
| `stream-extract.js` | Распаковка tarball |
| `parallel.js` | Параллельное выполнение задач |

---

## 🔧 Команды

Каждая команда — отдельный файл в `lib/commands/`, экспортирующий асинхронную функцию.

**Стандартный шаблон:**

```javascript
const { loadLangForCwd, getI18n } = require('../i18n');
const config = require('../utils/config');

async function myCommand(options = {}) {
  const { t } = getI18n(loadLangForCwd(process.cwd()));
  const conf = config.readConfig();
  console.log(t('commands.my_command.running'));
}

module.exports = { myCommand };
```

**Регистрация в `bin/mip.js`:**

```javascript
case 'my-command': {
  const { myCommand } = require('../lib/commands/my-command');
  await myCommand({
    verbose: process.argv.includes('--verbose'),
  });
  break;
}
```

---

## 🧪 Как это всё связано

```
bin/mip.js
    ↓
commands/*.js
    ↓
core/*.js  ← → utils/*.js
    ↓
i18n/  ui/  api/
```

**Плагины** подключаются через `api/plugin-manager.js` и могут:
- Регистрировать свои команды
- Вешать хуки на события MIP
- Использовать API методы

---

## Связанные страницы

- [Добавление команд](/ru/dev/adding-commands) — как создать команду
- [Хуки и плагины](/ru/dev/hooks) — расширение функциональности
