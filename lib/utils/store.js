const fs = require('fs');
const path = require('path');
const os = require('os');
const features = require('./features'); // 👈 ДОБАВИТЬ

// ==========================================
// ПУТИ
// ==========================================

function getGlobalStorePath() {
  // 👇 ДОБАВИТЬ: ПРОВЕРКА КАСТОМНОГО ПУТИ ИЗ ФИЧ
  const mipFeatures = features.loadFeatures(process.cwd());
  const customPath = mipFeatures['cache.path'];
  
  let storePath;
  if (customPath) {
    // Заменяем ~ на домашнюю директорию
    const resolvedPath = customPath.replace('~', os.homedir());
    storePath = path.join(resolvedPath, 'store');
  } else {
    const home = os.homedir();
    storePath = path.join(home, '.mip', 'store');
  }
  
  if (!fs.existsSync(storePath)) {
    fs.mkdirSync(storePath, { recursive: true });
  }
  return storePath;
}

function getPackageStorePath(name, version) {
  const storePath = getGlobalStorePath();
  return path.join(storePath, name, version);
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
// СТАТИСТИКА
// ==========================================

function getStoreSize() {
  const storePath = getGlobalStorePath();
  let size = 0;
  if (fs.existsSync(storePath)) {
    const files = fs.readdirSync(storePath);
    for (const file of files) {
      const filePath = path.join(storePath, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        size += getDirSize(filePath);
      } else {
        size += stat.size;
      }
    }
  }
  return size;
}

function getDirSize(dir) {
  let size = 0;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const p = path.join(dir, file);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      size += getDirSize(p);
    } else {
      size += stat.size;
    }
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
}

// 👇 ДОБАВИТЬ: ФУНКЦИЯ ДЛЯ ПРОВЕРКИ РАЗМЕРА КЕША
function getStoreSizeWithLimit() {
  const size = getStoreSize();
  const mipFeatures = features.loadFeatures(process.cwd());
  const maxSizeMB = mipFeatures['cache.maxSize'] || 500;
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

// 👇 ДОБАВИТЬ: ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ
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
  getStoreSizeWithLimit, // 👈 ДОБАВИТЬ
  formatBytes, // 👈 ДОБАВИТЬ
};