---
title: "Разработчикам"
description: "Всё, что нужно знать разработчику о MIP — архитектура, добавление команд, тестирование и хуки."
---

# Разработчикам

Этот раздел для тех, кто хочет **понять, как работает MIP**, и начать вносить изменения.

---

## 📚 Содержание

| Раздел | О чём |
|--------|-------|
| [Архитектура MIP](/ru/dev/architecture) | Как устроен проект: модули, потоки данных, файловая структура |
| [Добавление команд](/ru/dev/adding-commands) | Два способа создать команду: через fork (встроенная) или через плагин |
| [Хуки и плагины](/ru/dev/hooks) | Как расширить функциональность MIP |

---

## 🚀 Быстрый старт для разработчика

```bash
# Клонируй репозиторий
git clone https://github.com/kiwinatra/mip
cd mip

# Установи зависимости
npm install

# Собери проект
npm run build

# Запусти тесты (если есть)
npm test
```

---

## 🧩 Ключевые компоненты

| Компонент | Файл | Что делает |
|-----------|------|------------|
| **CLI** | `bin/mip.js` | Точка входа, парсит команды, вызывает обработчики |
| **Команды** | `lib/commands/*.js` | Логика каждой команды (install, audit, ci и т.д.) |
| **Ядро** | `lib/core/*.js` | Основная логика: резолвинг, загрузка, кэширование |
| **Утилиты** | `lib/utils/*.js` | Вспомогательные функции: реестр, конфиги, распаковка |
| **i18n** | `lib/i18n/*.js` | Интернационализация: переводы, загрузка языка |
| **API** | `lib/api/*.js` | API для плагинов: хуки, регистрация команд |

---

## 📁 Структура проекта

```
mip/
├── bin/
│   └── mip.js                 # Точка входа
├── lib/
│   ├── api/                   # API для плагинов
│   ├── commands/              # Все встроенные команды
│   ├── core/                  # Ядро (резолвинг, загрузка, кэш)
│   ├── i18n/                  # Переводы (10 языков)
│   ├── ui/                    # Прогресс-бары, цветной вывод
│   ├── utils/                 # Вспомогательные функции
│   └── index.js               # Прокси-экспорты
├── tests/                     # Тесты
├── docs/                      # Документация
└── package.json
```

---

## 🌍 Интернационализация

MIP поддерживает 10 языков: `en`, `ru`, `es`, `fr`, `de`, `it`, `pt`, `zh`, `ja`, `ko`.

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
    running: "🚀 Запуск моей команды..."
```

---

## 📦 Добавление команды

### Способ 1: Встроенная команда (fork)

Подходит только для команд, которые должны быть частью ядра MIP.

1. Создай файл в `lib/commands/`
2. Добавь в `bin/mip.js`
3. Добавь переводы в `locales/*.yml`

### Способ 2: Команда плагина (рекомендуемый)

Подходит для всех пользовательских команд.

1. Создай плагин: `mip plugin create my-plugin`
2. Зарегистрируй команду через `api.registerCommand()` в `init()`
3. Скомпилируй и активируй

📖 Подробнее: [Добавление команд](/ru/dev/adding-commands)

---

## 🔌 Хуки и плагины

Плагины могут подписываться на события MIP:

```javascript
module.exports = {
  name: 'my-plugin',
  hooks: {
    beforeInstall: async (pkg, version) => {
      console.log(`Installing ${pkg}@${version}`);
    },
    afterInstall: async (pkgInfo) => {
      console.log(`Installed ${pkgInfo.name}`);
    },
    onError: async (err) => {
      console.error(`Error: ${err.message}`);
    },
  },
};
```

📖 Подробнее: [Хуки и плагины](/ru/dev/hooks)

---

## 🛠️ Полезные команды для разработки

```bash
# Сборка
npm run build

# Запуск в режиме разработки
node bin/mip.js <command>

# Логи с отладкой
DEBUG=1 node bin/mip.js <command>

# Очистка кэша
mip cache clean
```

---

## 📚 Полезные ссылки

- [Исходный код](https://github.com/kiwinatra/mip)
- [Сообщить о проблеме](https://github.com/kiwinatra/mip/issues)
- [Лицензия MIT](https://github.com/kiwinatra/mip/blob/main/LICENSE)

---

## ❓ Вопросы?

Если есть вопросы по разработке — открывай issue или пиши в обсуждения. 🚀
  