/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const fs = require('fs');
const path = require('path');
const { languages, loadLangForCwd, getI18n, customLanguages } = require('../i18n');
const config = require('../utils/config');

function readConfig(cwd) {
  const cfg = config.detectConfig(cwd);
  if (!cfg) return null;
  return config.readConfig(cwd);
}

function writeConfig(cwd, data) {
  return config.writeConfig(data, cwd);
}

function getAllLangs() {
  // Получаем все языки: встроенные + кастомные
  const allLangs = typeof languages === 'function' ? languages() : languages;
  const custom = typeof customLanguages !== 'undefined' ? customLanguages : [];
  return [...allLangs, ...custom];
}

function formatLangs() {
  // de-duplicate while preserving first-seen order
  const all = getAllLangs();
  const unique = [];
  const seen = new Set();
  for (const l of all) {
    const lang = String(l).toLowerCase();
    if (seen.has(lang)) continue;
    seen.add(lang);
    unique.push(lang);
  }
  return unique.join(', ');
}


async function language(langArg) {
  const cwd = process.cwd();
  const currentLang = loadLangForCwd(cwd);
  const { t } = getI18n(currentLang);

  if (!langArg) {
    const msg = t('commands.language.current', { lang: currentLang });
    const msg2 = t('commands.language.available', { langs: formatLangs() });
    console.log(`${msg}\n${msg2}`);
    return;
  }

  const lang = String(langArg).toLowerCase();
  
  // Проверяем, поддерживается ли язык (встроенный или кастомный)
  const allLangs = typeof languages === 'function' ? languages() : languages;
  const custom = typeof customLanguages !== 'undefined' ? customLanguages : [];
  const all = [...allLangs, ...custom];
  
  if (!all.includes(lang)) {
    console.log(t('commands.language.invalid', { lang }));
    return;
  }

  const configData = readConfig(cwd) || {};
  configData.language = lang;

  if (!configData.dependencies) configData.dependencies = {};
  if (!configData.devDependencies) configData.devDependencies = {};

  writeConfig(cwd, configData);
  console.log(t('commands.language.set_ok', { lang }));
}

module.exports = { language };