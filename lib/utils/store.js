const fs = require('fs');
const path = require('path');
const os = require('os');

// ==========================================
// КЕШ ДЛЯ ПУТЕЙ
// ==========================================

const pathCache = new Map();
const storeSizeCache = new Map();
const STORE_SIZE_TTL = 10000; // 10 секунд

function getCacheKey(name, version) {
  return `${name}/${version}`;
}

// ==========================================
// ПУТИ
// ==========================================

function getGlobalStorePath() {
  // Пытаемся получить из кеша
  const cacheKey = 'global_store_path';
  if (pathCache.has(cacheKey)) {
    return pathCache.get(cacheKey);
  }

  let storePath;
  try {
    // Пробуем прочитать кастомный путь из фич (если есть)
    const features = require('./features');
    const mipFeatures = features.loadFeatures(process.cwd());
    const customPath = mipFeatures['cache.path'];
    
    if (customPath) {
      const resolvedPath = customPath.replace('~', os.homedir());
      storePath = path.join(resolvedPath, 'store');
    } else {
      const home = os.homedir();
      storePath = path.join(home, '.mip', 'store');
    }
  } catch {
    // Если features не загрузились — используем стандартный путь
    const home = os.homedir();
    storePath = path.join(home, '.mip', 'store');
  }
  
  if (!fs.existsSync(storePath)) {
    fs.mkdirSync(storePath, { recursive: true });
  }
  
  pathCache.set(cacheKey, storePath);
  return storePath;
}

function getPackageStorePath(name, version) {
  const cacheKey = getCacheKey(name, version);
  if (pathCache.has(cacheKey)) {
    return pathCache.get(cacheKey);
  }
  
  const storePath = getGlobalStorePath();
  const pkgPath = path.join(storePath, name, version);
  pathCache.set(cacheKey, pkgPath);
  return pkgPath;
}

// ==========================================
// ПРОВЕРКА СУЩЕСТВОВАНИЯ
// ==========================================

function isPackageInStore(name, version) {
  const pkgPath = getPackageStorePath(name, version);
  return fs.existsSync(pkgPath) && fs.existsSync(path.join(pkgPath, 'package.json'));
}

// ==========================================
// ПОЛУЧЕНИЕ ПУТИ
// ==========================================

function getPackageStorePathOrNull(name, version) {
  const pkgPath = getPackageStorePath(name, version);
  if (isPackageInStore(name, version)) {
    return pkgPath;
  }
  return null;
}

// ==========================================
// СОХРАНЕНИЕ ПАКЕТА
// ==========================================

function savePackageToStore(name, version, data) {
  const pkgPath = getPackageStorePath(name, version);
  fs.mkdirSync(pkgPath, { recursive: true });
  
  // data — это buffer из tarball
  // Нужно распаковать в pkgPath
  return pkgPath;
}

// ==========================================
// СТАТИСТИКА (С КЕШЕМ)
// ==========================================

function getStoreSize() {
  const cacheKey = 'store_size';
  const cached = storeSizeCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < STORE_SIZE_TTL)) {
    return cached.size;
  }
  
  const storePath = getGlobalStorePath();
  let size = 0;
  
  if (fs.existsSync(storePath)) {
    const files = fs.readdirSync(storePath);
    for (const file of files) {
      const filePath = path.join(storePath, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          size += getDirSize(filePath);
        } else {
          size += stat.size;
        }
      } catch {
        // Игнорируем ошибки доступа
      }
    }
  }
  
  storeSizeCache.set(cacheKey, { size, timestamp: Date.now() });
  return size;
}

function getDirSize(dir) {
  // Проверяем кеш для этой директории
  const cacheKey = `dirsize_${dir}`;
  const cached = storeSizeCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < STORE_SIZE_TTL)) {
    return cached.size;
  }
  
  let size = 0;
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const p = path.join(dir, file);
      try {
        const stat = fs.statSync(p);
        if (stat.isDirectory()) {
          size += getDirSize(p);
        } else {
          size += stat.size;
        }
      } catch {
        // Игнорируем ошибки доступа
      }
    }
  } catch {
    // Если папка не читается — возвращаем 0
  }
  
  // Кешируем только если не слишком много записей
  if (storeSizeCache.size < 1000) {
    storeSizeCache.set(cacheKey, { size, timestamp: Date.now() });
  }
  
  return size;
}

// ==========================================
// ОЧИСТКА
// ==========================================

function clearStore() {
  const storePath = getGlobalStorePath();
  if (fs.existsSync(storePath)) {
    fs.rmSync(storePath, { recursive: true, force: true });
    fs.mkdirSync(storePath, { recursive: true });
  }
  
  // Очищаем кеш
  pathCache.clear();
  storeSizeCache.clear();
}

// ==========================================
// ФУНКЦИЯ ДЛЯ ПРОВЕРКИ РАЗМЕРА КЕША
// ==========================================

function getStoreSizeWithLimit() {
  const size = getStoreSize();
  let maxSizeMB = 500;
  
  try {
    const features = require('./features');
    const mipFeatures = features.loadFeatures(process.cwd());
    maxSizeMB = mipFeatures['cache.maxSize'] || 500;
  } catch {
    maxSizeMB = 500;
  }
  
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  return {
    size,
    sizeFormatted: formatBytes(size),
    maxSize: maxSizeMB,
    maxSizeFormatted: formatBytes(maxSizeBytes),
    isExceeded: size > maxSizeBytes,
    exceededBy: size > maxSizeBytes ? formatBytes(size - maxSizeBytes) : null
  };
}

// ==========================================
// ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ
// ==========================================

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ==========================================
// ЭКСПОРТ
// ==========================================

module.exports = {
  getGlobalStorePath,
  getPackageStorePath,
  isPackageInStore,
  getPackageStorePathOrNull,
  savePackageToStore,
  getStoreSize,
  clearStore,
  getStoreSizeWithLimit,
  formatBytes,
};