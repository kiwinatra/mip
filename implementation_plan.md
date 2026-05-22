# Implementation Plan

[Overview]
Внести в проект все оптимизации из MIP-OPTIMIZATION.md: ускорить resolveVersion, распараллелить resolve/install, перейти на streaming download/extract и улучшить работу lockfile и SuperCache.

Поддерживается цель: уменьшить CPU/IO узкие места при `mip install` за счёт кэширования отсортированных версий, батчинга in-flight resolve зависимостей, устранения RAM-heavy буферизации tarball, ускорения lookup в lockfile до O(1), а также улучшения SuperCache (разделение metadata/artifacts, TTL/cleanup и атомарность).

На текущем этапе внедрение начато (часть пунктов 1 и 5). Далее будет продолжено строго по MIP-OPTIMIZATION.md в логическом порядке, чтобы минимизировать конфликты и регрессии.

[Types]
Изменений в типизации на уровне TypeScript нет. Будут добавлены структуры данных (Map-кэши, индексы lockfile, лимитированные очереди задач) на уровне JS.

[Files]
Модифицируются `lib/core/resolver.js`, `lib/core/parallel-download.js`, `lib/utils/cahce.js`, `lib/core/locker.js`, `lib/commands/install.js`, `lib/core/super-cache.js`, возможно `lib/core/fast-resolver.js` и/или утилиты для лимитирования/стриминга.

Новые файлы (при необходимости): утилита для лимитера ( если нельзя добавлять зависимости ), например `lib/utils/limit.js`, и/или промежуточные адаптеры streaming.

[Functions]
- `DependencyResolver.resolveVersion` — кэш сортировок per package name + батчирование in-flight resolve зависимостей с лимитом параллелизма.
- `ParallelDownloader.downloadPackage/downloadPackages` — переход на streaming (от HTTP response stream к extractor stream) и настройка лимитов.
- `extractPackage` в `lib/utils/cahce.js` — убрать tmp-file/buffer по умолчанию, оставить fallback.
- `LockfileManager.getInstalledVersion` — O(1) lookup через индекс `name -> version`.
- `install/actuallyInstallPackage` в `lib/commands/install.js` — async FS (вместо sync), skip-install по integrity/sha и батч установку зависимостей с контролем параллелизма.
- `SuperCache.get/set` — split metadata/artifacts, атомарные записи, cleanup/TTL.

[Classes]
- `DependencyResolver` — добавление кэшей.
- `ParallelDownloader` — добавление настройки потоков/лимитов.
- `LockfileManager` (locker) — добавление индекса.
- `SuperCache` — добавление разделённых кешей и инфраструктуры cleanup.

[Dependencies]
В идеале добавить `p-limit` (или реализовать лимитер локально, если зависимости нельзя). Для streaming потребуется `tar` (уже есть dependency в `stream-extract`).

[Testing]
Прогнать существующие тесты и добавить тесты на:
- корректность resolveVersion для latest/range,
- отсутствие последовательного узкого места на resolve,
- streaming path корректно извлекает пакет и создаёт `package.json` в target,
- skip-install с lockfile integrity не вызывает extract повторно.

[Implementation Order]
1) Завершить внедрение пунктов 3–4 (streaming download/extract) в `parallel-download.js` и `cahce.js`.
2) Ускорить пункты 6–7 (корректный skip-install и async I/O) в `install.js`.
3) Внести пункт 10 (parallelism при установке) в `install.js`.
4) Внести пункт 8 (SuperCache split + TTL/cleanup) в `super-cache.js`.
5) Внести пункт 9 (ускорение рекурсивного DAG install/reparse) в `install.js`/resolver.
6) Прогнать тесты и исправить регрессии.

