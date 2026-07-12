/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const { searchPackages } = require('../utils/registry');
const { loadLangForCwd, getI18n } = require('../i18n');
const features = require('../utils/features');
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
  const mipFeatures = features.loadFeatures(process.cwd());

  // Проверка включена ли команда
  if (mipFeatures['search.enabled'] === false) {
    console.log('ℹ️ Search command is disabled (search.enabled: false)');
    return;
  }

  // Проверяем флаг --clear-cache
  if (query === '--clear-cache' || query === '--cc') {
    clearSearchCache();
    return;
  }

  if (!query) {
    console.log(t('commands.search.usage'));
    return;
  }

  // Проверка interactive
  if (mipFeatures['interactive.promptOnSearch'] !== false) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question(`🔍 Search for "${query}"? (Y/n) `, resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') {
      console.log('❌ Cancelled');
      return;
    }
  }

  // Проверка кэша (если включен)
  const useCache = mipFeatures['search.cache'] !== false;
  const cacheTTL = mipFeatures['search.cacheTTL'] || 300; // секунды

  if (useCache) {
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
  }

  console.log(t('commands.search.searching', { query }));

  try {
    const limit = mipFeatures['search.limit'] || 20;
    const results = await searchPackages(query, limit);

    if (results.length === 0) {
      console.log(t('commands.search.no_packages'));
      return;
    }

    // Сохраняем в кэш
    if (useCache) {
      saveToCache(query, results);
    }

    console.log(t('commands.search.found_title', { count: results.length }));

    const showDescription = mipFeatures['search.showDescription'] !== false;
    const showKeywords = mipFeatures['search.showKeywords'] || false;
    const showDate = mipFeatures['search.showDate'] || false;

    results.forEach((pkg, i) => {
      const icon = i === results.length - 1 ? '└──' : '├──';
      console.log(`${icon} ${pkg.name}@${pkg.version}`);
      
      if (showDescription && pkg.description) {
        console.log(
          `    📝 ${pkg.description.substring(0, 70)}${pkg.description.length > 70 ? '...' : ''}`
        );
      }
      
      if (showKeywords && pkg.keywords && pkg.keywords.length > 0) {
        console.log(`    🏷️  ${pkg.keywords.slice(0, 5).join(', ')}`);
      }
      
      if (showDate && pkg.date) {
        console.log(`    📅 ${new Date(pkg.date).toLocaleDateString()}`);
      }
      
      console.log('');
    });

    console.log(`💾 Cached for ${cacheTTL} seconds`);
  } catch (error) {
    console.error(t('commands.search.failed', { message: error.message }));
  }
}

module.exports = { search };