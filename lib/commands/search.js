/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const { searchPackages } = require('../utils/registry');
const { loadLangForCwd, getI18n } = require('../i18n');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==========================================
// КЭШИРОВАНИЕ
// ==========================================

const CACHE_DIR = path.join(process.cwd(), '.mip', 'cache', 'search');
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

function getCacheKey(query) {
  return crypto.createHash('md5').update(query.toLowerCase().trim()).digest('hex');
}

function getCachePath(key) {
  return path.join(CACHE_DIR, `${key}.json`);
}

function getCachedResult(query) {
  const key = getCacheKey(query);
  const cachePath = getCachePath(key);

  if (!fs.existsSync(cachePath)) return null;

  try {
    const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    const age = Date.now() - data.timestamp;

    if (age > CACHE_TTL) {
      // Кэш устарел
      fs.unlinkSync(cachePath);
      return null;
    }

    return data.results;
  } catch {
    return null;
  }
}

function saveToCache(query, results) {
  const key = getCacheKey(query);
  const cachePath = getCachePath(key);

  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }

    fs.writeFileSync(
      cachePath,
      JSON.stringify({
        timestamp: Date.now(),
        query: query,
        results: results,
      })
    );
  } catch {
    // Молча игнорируем ошибки кэширования
  }
}

function clearSearchCache() {
  if (fs.existsSync(CACHE_DIR)) {
    const files = fs.readdirSync(CACHE_DIR);
    for (const file of files) {
      fs.unlinkSync(path.join(CACHE_DIR, file));
    }
    console.log('🧹 Search cache cleared');
  }
}

// ==========================================
// ОСНОВНАЯ ФУНКЦИЯ
// ==========================================

async function search(query) {
  const { t } = getI18n(loadLangForCwd(process.cwd()));

  // Проверяем флаг --clear-cache
  if (query === '--clear-cache' || query === '--cc') {
    clearSearchCache();
    return;
  }

  if (!query) {
    console.log(t('commands.search.usage'));
    return;
  }

  // 🔥 ПРОВЕРЯЕМ КЭШ
  const cached = getCachedResult(query);
  if (cached) {
    console.log(t('commands.search.cached', { query }));
    console.log(t('commands.search.found_title', { count: cached.length }));

    cached.forEach((pkg, i) => {
      const icon = i === cached.length - 1 ? '└──' : '├──';
      console.log(`${icon} ${pkg.name}@${pkg.version}`);
      if (pkg.description) {
        console.log(
          `    📝 ${pkg.description.substring(0, 70)}${pkg.description.length > 70 ? '...' : ''}`
        );
      }
      console.log('');
    });
    return;
  }

  console.log(t('commands.search.searching', { query }));

  try {
    const results = await searchPackages(query, 20);

    if (results.length === 0) {
      console.log(t('commands.search.no_packages'));
      return;
    }

    // 🔥 СОХРАНЯЕМ В КЭШ
    saveToCache(query, results);

    console.log(t('commands.search.found_title', { count: results.length }));

    results.forEach((pkg, i) => {
      const icon = i === results.length - 1 ? '└──' : '├──';
      console.log(`${icon} ${pkg.name}@${pkg.version}`);
      if (pkg.description) {
        console.log(
          `    📝 ${pkg.description.substring(0, 70)}${pkg.description.length > 70 ? '...' : ''}`
        );
      }
      console.log('');
    });

    console.log(`💾 Cached for 5 minutes`);
  } catch (error) {
    console.error(t('commands.search.failed', { message: error.message }));
  }
}

module.exports = { search };