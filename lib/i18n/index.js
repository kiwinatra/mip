/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
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
  ko: require('./locales/ko.json'),
};

// ==========================================
// КАСТОМНЫЕ ЯЗЫКИ ИЗ ПЛАГИНОВ
// ==========================================

let customLocales = {};
let customLanguages = [];
let customLoaded = false;

function loadCustomLocales(cwd = process.cwd()) {
  if (customLoaded) return;
  customLoaded = true;

  const pluginsDir = path.join(cwd, 'plugins');
  if (!fs.existsSync(pluginsDir)) return;

  const plugins = fs.readdirSync(pluginsDir);
  for (const plugin of plugins) {
    const langDir = path.join(pluginsDir, plugin, 'locales');
    if (!fs.existsSync(langDir)) continue;

    const files = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const lang = path.basename(file, '.json');
      try {
        const content = JSON.parse(fs.readFileSync(path.join(langDir, file), 'utf8'));
        customLocales[lang] = content;
        if (!customLanguages.includes(lang)) {
          customLanguages.push(lang);
        }
        // 🔥 ЛОГ ТОЛЬКО В DEBUG
        if (process.env.DEBUG) {
          console.log(`[i18n] Loaded custom language: ${lang} from plugin ${plugin}`);
        }
      } catch (err) {
        // Ошибки загрузки показываем всегда (это важно)
        console.log(`[i18n] Failed to load custom locale ${lang} from ${plugin}: ${err.message}`);
      }
    }
  }
}

function getLanguages() {
  return [...languages, ...customLanguages];
}

// ==========================================
// ОСНОВНЫЕ ФУНКЦИИ
// ==========================================

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
    // Сначала ищем в основном словаре
    const raw =
      dict && Object.prototype.hasOwnProperty.call(dict, key)
        ? dict[key]
        : fallbackDict && Object.prototype.hasOwnProperty.call(fallbackDict, key)
          ? fallbackDict[key]
          : undefined;

    if (raw === undefined) return key;
    return interpolate(String(raw), vars);
  };
}

function loadLocale(lang) {
  const allLanguages = getLanguages();
  const safeLang = allLanguages.includes(lang) ? lang : 'en';

  // 🔥 ПРИОРИТЕТ 1: кастомный язык из плагина
  if (customLocales[safeLang]) {
    // 🔥 ЛОГ ТОЛЬКО В DEBUG
    if (process.env.DEBUG) {
      console.log(`[i18n] Using custom language: ${safeLang}`);
    }
    return customLocales[safeLang];
  }

  // 🔥 ПРИОРИТЕТ 2: встроенный язык
  if (LOCALES[safeLang]) {
    return LOCALES[safeLang];
  }

  // 🔥 ПРИОРИТЕТ 3: fallback
  return LOCALES['en'];
}

function loadLangForCwd(cwd = process.cwd()) {
  // Пробуем прочитать mip.yml
  const ymlPath = path.join(cwd, 'mip.yml');
  if (fs.existsSync(ymlPath)) {
    try {
      const yaml = require('js-yaml');
      const config = yaml.load(fs.readFileSync(ymlPath, 'utf8'));
      if (config && config.language) {
        const normalized = config.language.toLowerCase();
        const allLanguages = getLanguages();
        if (allLanguages.includes(normalized)) {
          return normalized;
        }
      }
    } catch {}
  }

  // Пробуем mip.json (обратная совместимость)
  const jsonPath = path.join(cwd, 'mip.json');
  const config = safeReadJson(jsonPath) || {};
  const lang = config && typeof config.language === 'string' ? config.language : 'en';
  const normalized = lang.toLowerCase();
  const allLanguages = getLanguages();
  return allLanguages.includes(normalized) ? normalized : 'en';
}

const cache = new Map();

function getI18n(lang) {
  const allLanguages = getLanguages();
  const safeLang = allLanguages.includes(lang) ? lang : 'en';
  
  if (cache.has(safeLang)) return cache.get(safeLang);

  const fallbackLang = 'en';
  const dict = loadLocale(safeLang);
  const fallbackDict = loadLocale(fallbackLang);

  const t = createTranslator(dict, fallbackDict);

  const api = {
    lang: safeLang,
    t,
  };

  cache.set(safeLang, api);
  return api;
}

// ==========================================
// ЭКСПОРТ
// ==========================================

module.exports = {
  languages: getLanguages,
  loadLangForCwd,
  getI18n,
  loadCustomLocales,
  customLocales,
  customLanguages,
};