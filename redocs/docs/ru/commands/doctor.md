---
title: "mip doctor — диагностика окружения и проекта"
description: "Команда doctor проверяет состояние вашего окружения: версии Node.js и MIP, наличие Git, доступ к реестру, права на запись и корректность настроек PATH."
---

# mip doctor

::: callout info "Что это?" icon:stethoscope
`mip doctor` — это диагностическая утилита, которая проверяет ваше окружение на наличие потенциальных проблем. Она анализирует версии инструментов, доступность сети, права доступа и конфигурацию PATH, помогая быстро выявить и исправить распространённые проблемы перед установкой пакетов.
:::

## Синтаксис

```bash
mip doctor
```

## Логика работы

1. **Проверка Node.js** — анализирует текущую версию Node.js. Рекомендуемая версия — **v18 или выше**.

2. **Проверка MIP** — выводит текущую установленную версию MIP.

3. **Проверка глобального кэша** (`~/.mip/`) — проверяет существование и размер глобального хранилища.

4. **Проверка конфигурации** — проверяет наличие `mip.yml` и выводит количество зависимостей, скриптов и workspaces.

5. **Проверка манифеста** — проверяет `.mip/manifest.json` и целостность путей к пакетам.

6. **Проверка локального `.mip/`** — проверяет наличие локального кэша.

7. **Проверка PATH** — убеждается, что глобальные бинарники MIP (`~/.mip/global/node_modules/.bin`) добавлены в `PATH`.

8. **Проверка Git** — проверяет наличие Git (необходим для работы с GitHub-пакетами).

9. **Проверка сети** — пытается достичь реестра npm (`registry.npmjs.org`).

10. **Проверка диска** — проверяет права на запись во временную директорию.

11. **Вывод отчёта** — показывает все найденные проблемы и даёт рекомендации по их исправлению.

## Примеры

::: tabs
== tab "Здоровое окружение"
```bash
mip doctor
```

**Пример вывода:**
```
🔍 Running diagnostics...

✅ Node.js v20.11.0
✅ mip v2.0
✅ ~/.mip exists
✅ Global store: 42.50 MB
✅ Config: mip.yml
   📦 3 dependencies
   📜 2 scripts
   📁 1 workspace(s)
✅ Manifest: 3 package(s) installed
   ✅ All package paths exist
✅ Local .mip exists
✅ Global bin in PATH
✅ Git installed
✅ Network: npm registry reachable
✅ Disk writeable

📊 Summary: 0 warning(s)

✨ System is healthy!
```
:::
== tab "Проблемное окружение"
```bash
mip doctor
```

**Пример вывода:**
```
🔍 Running diagnostics...

⚠️ Node.js v12.22.0 (recommended: v18+)
✅ mip v2.0
⚠️ ~/.mip directory missing (will be created on first install)
ℹ️ No config file found (mip.yml, mip.json, or package.json)
⚠️ Global bin not in PATH: /home/user/.mip/global/node_modules/.bin
⚠️ Git not found (required for GitHub packages)
⚠️ Cannot reach npm registry (check network)
✅ Disk writeable

📊 Summary: 5 warning(s)

Issues found:

  ⚠️ Node.js v12.22.0 (recommended: v18+)
  ⚠️ ~/.mip directory missing
  ⚠️ Global bin not in PATH
  ⚠️ Git not found
  ⚠️ Cannot reach npm registry

💡 Fix suggestions:
  • Add to ~/.zshrc or ~/.bashrc:
    export PATH="$PATH:/home/user/.mip/global/node_modules/.bin"
  • Install git: https://git-scm.com/
  • Run "mip init" to create a config file
```
:::

## Типичные ошибки

::: callout warning "⚠️ Node.js version too old" icon:alert-triangle
**Причина:** Установлена устаревшая версия Node.js (ниже v14).

**Решение:**
1. Используйте [nvm](https://github.com/nvm-sh/nvm) для установки актуальной версии:
   ```bash
   nvm install 20
   nvm use 20
   ```
2. Или скачайте свежую версию с [nodejs.org](https://nodejs.org/).
:::

::: callout warning "⚠️ Global bin not in PATH" icon:alert-circle
**Причина:** Глобальные бинарники MIP не добавлены в переменную окружения `PATH`.

**Решение:** Добавьте в ваш `~/.zshrc` или `~/.bashrc`:
```bash
export PATH="$PATH:~/.mip/global/node_modules/.bin"
```
После этого перезагрузите оболочку: `source ~/.zshrc`
:::

::: callout danger "⚠️ Cannot reach npm registry" icon:skull
**Причина:** Проблемы с сетью или недоступность реестра npm.

**Решение:**
1. Проверьте интернет-соединение.
2. Проверьте настройки прокси.
3. Попробуйте временно отключить VPN/брандмауэр.
4. Убедитесь, что DNS работает корректно.
:::

::: callout warning "⚠️ Git not found" icon:git-branch
**Причина:** Git не установлен или не добавлен в `PATH`.

**Решение:**
- **Linux/Mac:** `sudo apt install git` или `brew install git`
- **Windows:** Скачайте с [git-scm.com](https://git-scm.com/)
:::

## Связанные команды

- [mip install](/ru/commands/install) — установка зависимостей (после проверки doctor).
- [mip cache clean](/ru/commands/cache) — очистка кэша, если возникли проблемы с диском.
- [mip ci](/ru/commands/ci) — установка в CI/CD (doctor помогает предварительно проверить окружение).

::: collapsible "🧠 Почему doctor важен?"
`mip doctor` — это **первая линия обороны** от типичных проблем:

1. **Экономит время** — вместо того чтобы гадать, почему не работает установка, вы получаете чёткий диагноз.
2. **Предотвращает ошибки** — многие проблемы (например, устаревшая версия Node.js) приводят к странным ошибкам, которые сложно интерпретировать.
3. **Упрощает онбординг** — новым разработчикам достаточно запустить `mip doctor`, чтобы понять, что нужно настроить в их окружении.

**Совет:** Добавьте `mip doctor` в ваш `README.md` как первый шаг после клонирования репозитория.
:::
