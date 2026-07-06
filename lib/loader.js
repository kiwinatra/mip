/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const fs = require('fs');
const path = require('path');
const Module = require('module');

// ==========================================
// КЕШ ДЛЯ МАНИФЕСТА
// ==========================================

const manifestCache = new Map();
const MANIFEST_TTL = 5000; // 5 секунд

function getCacheKey(cwd) {
  return cwd;
}

function isCacheValid(cwd) {
  const key = getCacheKey(cwd);
  const cached = manifestCache.get(key);
  if (!cached) return false;
  return (Date.now() - cached.timestamp) < MANIFEST_TTL;
}

function invalidateManifest(cwd = process.cwd()) {
  const key = getCacheKey(cwd);
  manifestCache.delete(key);
}

// ==========================================
// ХУК ДЛЯ require()
// ==========================================

function setupLoader() {
  const manifestPath = path.join(process.cwd(), '.mip', 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return;
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    return;
  }

  if (global.__mip_loader_installed) {
    return;
  }
  global.__mip_loader_installed = true;

  const originalRequire = Module.prototype.require;

  Module.prototype.require = function (id) {
    if (manifest && manifest[id]) {
      const pkgPath = manifest[id].path;
      if (fs.existsSync(pkgPath)) {
        try {
          return originalRequire.call(this, pkgPath);
        } catch {
          return originalRequire.call(this, id);
        }
      }
    }
    return originalRequire.call(this, id);
  };
}

// ==========================================
// ОСНОВНЫЕ ФУНКЦИИ (С КЕШЕМ)
// ==========================================

function getManifestPath(cwd = process.cwd()) {
  return path.join(cwd, '.mip', 'manifest.json');
}

function loadManifest(cwd = process.cwd()) {
  const key = getCacheKey(cwd);
  
  // Проверяем кеш
  if (isCacheValid(cwd)) {
    return manifestCache.get(key).data;
  }
  
  const manifestPath = getManifestPath(cwd);
  if (!fs.existsSync(manifestPath)) {
    const empty = {};
    manifestCache.set(key, { data: empty, timestamp: Date.now() });
    return empty;
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifestCache.set(key, { data, timestamp: Date.now() });
    return data;
  } catch {
    const empty = {};
    manifestCache.set(key, { data: empty, timestamp: Date.now() });
    return {};
  }
}

function saveManifest(manifest, cwd = process.cwd()) {
  const manifestPath = getManifestPath(cwd);
  const mipDir = path.dirname(manifestPath);
  if (!fs.existsSync(mipDir)) {
    fs.mkdirSync(mipDir, { recursive: true });
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  
  // Инвалидируем кеш
  invalidateManifest(cwd);
}

function addToManifest(name, version, storePath, cwd = process.cwd()) {
  const manifest = loadManifest(cwd);
  manifest[name] = {
    version,
    path: storePath,
    installed: Date.now()
  };
  saveManifest(manifest, cwd);
}

function removeFromManifest(name, cwd = process.cwd()) {
  const manifest = loadManifest(cwd);
  delete manifest[name];
  saveManifest(manifest, cwd);
}

function getPackagePath(name, cwd = process.cwd()) {
  const manifest = loadManifest(cwd);
  return manifest[name]?.path || null;
}

function getInstalledPackages(cwd = process.cwd()) {
  const manifest = loadManifest(cwd);
  return Object.keys(manifest).map(name => ({
    name,
    version: manifest[name].version,
    path: manifest[name].path
  }));
}

// ==========================================
// ЭКСПОРТ
// ==========================================

module.exports = {
  setupLoader,
  getManifestPath,
  loadManifest,
  saveManifest,
  addToManifest,
  removeFromManifest,
  getPackagePath,
  getInstalledPackages,
  invalidateManifest,
};