/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                                                                     │
 * │   ███╗   ███╗██╗██████╗                                             │
 * │   ████╗ ████║██║██╔══██╗                                            │
 * │   ██╔████╔██║██║██████╔╝                                            │
 * │   ██║╚██╔╝██║██║██╔═══╝                                             │
 * │   ██║ ╚═╝ ██║██║██║                                                 │
 * │   ╚═╝     ╚═╝╚═╝╚═╝                                                 │
 * │                                                                     │
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │                                                                     │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * │                                                                     │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const fs = require('fs');
const path = require('path');

const { languages } = require('./languages');

// Важно для Windows-бинарника (pkg): чтобы не зависеть от fs-путей внутри снапшота,
// загружаем локали напрямую через require (pkg упаковывает их как модули).
const LOCALES = {
  en: require('./locales/en.json'),
  ru: require('./locales/ru.json'),
  es: require('./locales/es.json'),
  fr: require('./locales/fr.json'),
  de: require('./locales/de.json'),
  it: require('./locales/it.json'),
  pt: require('./locales/pt.json'),
  zh: require('./locales/zh.json'),
  ja: require('./locales/ja.json'),
  ko: require('./locales/ko.json')
};


function safeReadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const v = vars[key];
    return v === undefined || v === null ? '' : String(v);
  });
}

function createTranslator(dict, fallbackDict) {
  return function t(key, vars) {
    const raw = dict && Object.prototype.hasOwnProperty.call(dict, key)
      ? dict[key]
      : fallbackDict && Object.prototype.hasOwnProperty.call(fallbackDict, key)
        ? fallbackDict[key]
        : undefined;

    if (raw === undefined) return key;
    return interpolate(String(raw), vars);
  };
}

function loadLocale(lang) {
  const safeLang = languages.includes(lang) ? lang : 'en';

  // Primary: embedded via require (works in pkg)
  if (LOCALES[safeLang]) return LOCALES[safeLang];

  // Fallback: filesystem (dev mode)
  try {
    const baseDir = path.join(__dirname, 'locales');
    const filePath = path.join(baseDir, `${safeLang}.json`);
    const dict = safeReadJson(filePath);
    return dict || {};
  } catch {
    return {};
  }
}


function loadLangForCwd(cwd = process.cwd()) {
  const pkgPath = path.join(cwd, 'mip.json');
  const config = safeReadJson(pkgPath) || {};
  const lang = config.language || 'en';
  return languages.includes(lang) ? lang : 'en';
}

const cache = new Map();

function getI18n(lang) {
  const safeLang = languages.includes(lang) ? lang : 'en';
  if (cache.has(safeLang)) return cache.get(safeLang);

  const fallbackLang = 'en';
  const dict = loadLocale(safeLang);
  const fallbackDict = loadLocale(fallbackLang);

  const t = createTranslator(dict, fallbackDict);

  const api = {
    lang: safeLang,
    t
  };

  cache.set(safeLang, api);
  return api;
}

module.exports = {
  languages,
  loadLangForCwd,
  getI18n
};
