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
        if (process.env.DEBUG) {
          console.log(`[i18n] Loaded custom language: ${lang} from plugin ${plugin}`);
        }
      } catch (err) {
        console.log(`[i18n] Failed to load custom locale ${lang} from ${plugin}: ${err.message}`);
      }
    }
  }
}

function getLanguages() {
  return [...languages, ...customLanguages];
}

// ==========================================
// ANSI-коды напрямую (без chalk!)
// ==========================================

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  blink: '\x1b[5m',
  inverse: '\x1b[7m',
  hidden: '\x1b[8m',
  strikethrough: '\x1b[9m',
  
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  
  blackBright: '\x1b[90m',
  redBright: '\x1b[91m',
  greenBright: '\x1b[92m',
  yellowBright: '\x1b[93m',
  blueBright: '\x1b[94m',
  magentaBright: '\x1b[95m',
  cyanBright: '\x1b[96m',
  whiteBright: '\x1b[97m',
  
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

function parseColors(text) {
  if (!text) return text;
  if (typeof text !== 'string') return text;
  
  let result = text;
  
  // Заменяем все теги на ANSI-коды
  const tags = {
    'reset': ANSI.reset,
    'bold': ANSI.bold,
    'dim': ANSI.dim,
    'italic': ANSI.italic,
    'underline': ANSI.underline,
    'blink': ANSI.blink,
    'inverse': ANSI.inverse,
    'hidden': ANSI.hidden,
    'strikethrough': ANSI.strikethrough,
    
    'black': ANSI.black,
    'red': ANSI.red,
    'green': ANSI.green,
    'yellow': ANSI.yellow,
    'blue': ANSI.blue,
    'magenta': ANSI.magenta,
    'cyan': ANSI.cyan,
    'white': ANSI.white,
    'gray': ANSI.gray,
    
    'blackBright': ANSI.blackBright,
    'redBright': ANSI.redBright,
    'greenBright': ANSI.greenBright,
    'yellowBright': ANSI.yellowBright,
    'blueBright': ANSI.blueBright,
    'magentaBright': ANSI.magentaBright,
    'cyanBright': ANSI.cyanBright,
    'whiteBright': ANSI.whiteBright,
    
    'bgBlack': ANSI.bgBlack,
    'bgRed': ANSI.bgRed,
    'bgGreen': ANSI.bgGreen,
    'bgYellow': ANSI.bgYellow,
    'bgBlue': ANSI.bgBlue,
    'bgMagenta': ANSI.bgMagenta,
    'bgCyan': ANSI.bgCyan,
    'bgWhite': ANSI.bgWhite,
  };
  
  for (const [tag, code] of Object.entries(tags)) {
    // Открывающий тег
    result = result.replace(new RegExp(`\\{${tag}\\}`, 'g'), code);
    // Закрывающий тег
    result = result.replace(new RegExp(`\\{/${tag}\\}`, 'g'), ANSI.reset);
  }
  
  return result;
}

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
    const raw =
      dict && Object.prototype.hasOwnProperty.call(dict, key)
        ? dict[key]
        : fallbackDict && Object.prototype.hasOwnProperty.call(fallbackDict, key)
          ? fallbackDict[key]
          : undefined;

    if (raw === undefined) return key;
    const interpolated = interpolate(String(raw), vars);
    return parseColors(interpolated);
  };
}

function loadLocale(lang) {
  const allLanguages = getLanguages();
  const safeLang = allLanguages.includes(lang) ? lang : 'en';

  if (customLocales[safeLang]) {
    if (process.env.DEBUG) {
      console.log(`[i18n] Using custom language: ${safeLang}`);
    }
    return customLocales[safeLang];
  }

  if (LOCALES[safeLang]) {
    return LOCALES[safeLang];
  }

  return LOCALES['en'];
}

function loadLangForCwd(cwd = process.cwd()) {
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

module.exports = {
  languages: getLanguages,
  loadLangForCwd,
  getI18n,
  loadCustomLocales,
  customLocales,
  customLanguages,
};