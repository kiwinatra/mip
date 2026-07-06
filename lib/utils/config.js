/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// ==========================================
// КЕШ
// ==========================================

const configCache = new Map();
const CONFIG_TTL = 5000; // 5 секунд

function getCacheKey(cwd) {
  return cwd;
}

function isCacheValid(cwd) {
  const key = getCacheKey(cwd);
  const cached = configCache.get(key);
  if (!cached) return false;
  return (Date.now() - cached.timestamp) < CONFIG_TTL;
}

function invalidateCache(cwd = process.cwd()) {
  const key = getCacheKey(cwd);
  configCache.delete(key);
}

// ==========================================
// ОСНОВНЫЕ ФУНКЦИИ (С КЕШЕМ)
// ==========================================

function detectConfig(cwd = process.cwd()) {
  const ymlPath = path.join(cwd, 'mip.yml');
  if (fs.existsSync(ymlPath)) {
    try {
      return { path: ymlPath, format: 'yaml', content: yaml.load(fs.readFileSync(ymlPath, 'utf8')) };
    } catch {}
  }
  
  const jsonPath = path.join(cwd, 'mip.json');
  if (fs.existsSync(jsonPath)) {
    try {
      return { path: jsonPath, format: 'json', content: JSON.parse(fs.readFileSync(jsonPath, 'utf8')) };
    } catch {}
  }
  
  const npmPath = path.join(cwd, 'package.json');
  if (fs.existsSync(npmPath)) {
    try {
      return { path: npmPath, format: 'npm', content: JSON.parse(fs.readFileSync(npmPath, 'utf8')) };
    } catch {}
  }
  
  return null;
}

function readConfig(cwd = process.cwd()) {
  const key = getCacheKey(cwd);
  
  // Проверяем кеш
  if (isCacheValid(cwd)) {
    return configCache.get(key).data;
  }
  
  const config = detectConfig(cwd);
  if (!config) {
    configCache.set(key, { data: null, timestamp: Date.now() });
    return null;
  }
  
  configCache.set(key, { data: config.content, timestamp: Date.now() });
  return config.content;
}

function writeConfig(content, cwd = process.cwd()) {
  const ymlPath = path.join(cwd, 'mip.yml');
  fs.writeFileSync(ymlPath, yaml.dump(content, { indent: 2 }));
  invalidateCache(cwd);
  return ymlPath;
}

function getDependencies(cwd = process.cwd()) {
  const config = readConfig(cwd);
  if (!config) return { dependencies: {}, devDependencies: {} };
  return {
    dependencies: config.dependencies || {},
    devDependencies: config.devDependencies || {}
  };
}

function getScripts(cwd = process.cwd()) {
  const config = readConfig(cwd);
  if (!config) return {};
  return config.scripts || {};
}

function addDependency(name, version, isDev = false, cwd = process.cwd()) {
  const config = readConfig(cwd);
  if (!config) return;
  const key = isDev ? 'devDependencies' : 'dependencies';
  if (!config[key]) config[key] = {};
  config[key][name] = version;
  writeConfig(config, cwd);
}

function removeDependency(name, cwd = process.cwd()) {
  const config = readConfig(cwd);
  if (!config) return;
  if (config.dependencies) delete config.dependencies[name];
  if (config.devDependencies) delete config.devDependencies[name];
  writeConfig(config, cwd);
}

// ==========================================
// МИГРАЦИЯ (С КЕШЕМ)
// ==========================================

function migrateToYaml(cwd = process.cwd()) {
  const config = detectConfig(cwd);
  if (!config) return null;
  
  if (config.format === 'yaml') return config.path;
  
  const ymlPath = path.join(cwd, 'mip.yml');
  const content = config.content;
  
  const ymlContent = {
    name: content.name || path.basename(cwd),
    version: content.version || '1.0.0',
    language: content.language || 'en',
    dependencies: content.dependencies || {},
    devDependencies: content.devDependencies || {},
    scripts: content.scripts || {},
    workspaces: content.workspaces || []
  };
  
  fs.writeFileSync(ymlPath, yaml.dump(ymlContent, { indent: 2 }));
  
  const backupPath = config.path + '.backup';
  fs.copyFileSync(config.path, backupPath);
  
  // Инвалидируем кеш
  invalidateCache(cwd);
  
  if (process.env.DEBUG) {
    console.log(`✅ Migrated ${path.basename(config.path)} → mip.yml`);
    console.log(`💡 Old file saved as ${path.basename(config.path)}.backup`);
  }
  
  return ymlPath;
}

function migrateLockfile(cwd = process.cwd()) {
  const jsonLockPath = path.join(cwd, 'mip-lock.json');
  const yamlLockPath = path.join(cwd, 'mip-lock.yml');
  
  if (fs.existsSync(yamlLockPath)) {
    return yamlLockPath;
  }
  
  if (!fs.existsSync(jsonLockPath)) {
    return null;
  }
  
  try {
    const lockData = JSON.parse(fs.readFileSync(jsonLockPath, 'utf8'));
    fs.writeFileSync(yamlLockPath, yaml.dump(lockData, { indent: 2 }));
    
    const backupPath = jsonLockPath + '.backup';
    fs.copyFileSync(jsonLockPath, backupPath);
    
    if (process.env.DEBUG) {
      console.log(`✅ Migrated mip-lock.json → mip-lock.yml`);
      console.log(`💡 Old lockfile saved as mip-lock.json.backup`);
    }
    
    return yamlLockPath;
  } catch (err) {
    console.log(`⚠️ Failed to migrate lockfile: ${err.message}`);
    return null;
  }
}

// ==========================================
// ЭКСПОРТ
// ==========================================

module.exports = {
  detectConfig,
  readConfig,
  writeConfig,
  getDependencies,
  getScripts,
  addDependency,
  removeDependency,
  migrateToYaml,
  migrateLockfile,
  invalidateCache,
};