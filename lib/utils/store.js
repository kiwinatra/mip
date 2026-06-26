const fs = require('fs');
const path = require('path');
const os = require('os');

// ==========================================
// ПУТИ
// ==========================================

function getGlobalStorePath() {
  const home = os.homedir();
  const storePath = path.join(home, '.mip', 'store');
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
};  