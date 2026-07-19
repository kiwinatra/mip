# TODO

- [ ] Fix `mip-lang apply` so выбранный язык реально появляется в `mip language` (i18n custom locales)
  - [ ] Update `mip-plugins/mip-lang/index.js`: поправить пути локалей и в `apply()` гарантировать копирование/обновление локали в папку, которую сканит `lib/i18n/index.js`
  - [ ] Update `lib/commands/language.js`: использовать единый источник (lib/i18n) для списка/валидации языков
- [ ] Add/adjust tests if any exist for `apply`/`list/available languages`
- [ ] Run test suite (or targeted mocha tests)

