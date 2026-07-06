/*
 * Minimal Package Manager
 * https://github.com/kiwinatra/mip
 * MIT License · Copyright (c) 2026 kiwinatra
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ApiMethods {
  constructor() {
    this.cwd = process.cwd();
    this.registeredCommands = new Map();
    
    // Кеш для ленивой загрузки
    this._cache = {
      registry: null,
      deps: null,
      mipJson: null,
      lockfile: null,
      dirSize: new Map()
    };
  }

  // ==========================================
  // КОМАНДЫ (БЫСТРЫЕ, БЕЗ ЗАВИСИМОСТЕЙ)
  // ==========================================

  registerCommand(commandName, pluginName, handler) {
    if (this.registeredCommands.has(commandName)) {
      console.warn(
        `[API] Command "${commandName}" already registered by "${
          this.registeredCommands.get(commandName).pluginName
        }", overriding...`
      );
    }
    this.registeredCommands.set(commandName, { pluginName, handler });
    console.log(`[API] Command "${commandName}" registered by plugin "${pluginName}"`);
  }

  getRegisteredCommands() {
    return this.registeredCommands;
  }

  async runRegisteredCommand(commandName, args) {
    const entry = this.registeredCommands.get(commandName);
    if (!entry) {
      throw new Error(`Command "${commandName}" not found`);
    }
    return entry.handler(args);
  }

  // ==========================================
  // КОНФИГ И LOCKFILE (С КЕШЕМ)
  // ==========================================

  getMipJson() {
    if (this._cache.mipJson !== null) {
      return this._cache.mipJson;
    }
    
    const pkgPath = path.join(this.cwd, 'mip.json');
    if (!fs.existsSync(pkgPath)) {
      this._cache.mipJson = null;
      return null;
    }
    
    try {
      this._cache.mipJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      return this._cache.mipJson;
    } catch (e) {
      this._cache.mipJson = null;
      return null;
    }
  }

  updateMipJson(data) {
    const pkgPath = path.join(this.cwd, 'mip.json');
    fs.writeFileSync(pkgPath, JSON.stringify(data, null, 2));
    this._cache.mipJson = data; // Обновляем кеш
  }

  getLockfile() {
    if (this._cache.lockfile !== null) {
      return this._cache.lockfile;
    }
    
    const lockPath = path.join(this.cwd, 'mip-lock.json');
    if (!fs.existsSync(lockPath)) {
      this._cache.lockfile = null;
      return null;
    }
    
    try {
      this._cache.lockfile = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      return this._cache.lockfile;
    } catch (e) {
      this._cache.lockfile = null;
      return null;
    }
  }

  updateLockfile(data) {
    const lockPath = path.join(this.cwd, 'mip-lock.json');
    fs.writeFileSync(lockPath, JSON.stringify(data, null, 2));
    this._cache.lockfile = data;
  }

  // ==========================================
  // ПАКЕТЫ (ЛЕНИВАЯ ЗАГРУЗКА)
  // ==========================================

  get _registry() {
    if (!this._cache.registry) {
      this._cache.registry = require('../utils/registry');
    }
    return this._cache.registry;
  }

  get _deps() {
    if (!this._cache.deps) {
      this._cache.deps = require('../utils/deps');
    }
    return this._cache.deps;
  }

  async getPackageInfo(name, version = 'latest') {
    return this._registry.getPackageInfo(name, version);
  }

  addDependency(name, version, dev = false) {
    this._deps.updateDependencies(name, version, dev);
    this._cache.mipJson = null; // Инвалидируем кеш
  }

  removeDependency(name) {
    this._deps.removeDependency(name);
    this._cache.mipJson = null;
  }

  // ==========================================
  // УСТАНОВЛЕННЫЕ ПАКЕТЫ (БЫСТРЫЙ ПОИСК)
  // ==========================================

  getInstalledPackages() {
    const mipDir = path.join(this.cwd, '.mip');
    if (!fs.existsSync(mipDir)) return [];

    const result = [];
    try {
      const dirs = fs.readdirSync(mipDir);
      for (const name of dirs) {
        const versionPath = path.join(mipDir, name);
        if (fs.statSync(versionPath).isDirectory()) {
          const versions = fs.readdirSync(versionPath);
          for (const version of versions) {
            result.push({ name, version });
          }
        }
      }
    } catch (e) {
      return [];
    }
    return result;
  }

  isPackageInstalled(name, version = null) {
    const packages = this.getInstalledPackages();
    return packages.some(p => p.name === name && (version ? p.version === version : true));
  }

  // ==========================================
  // РАЗМЕР ДИРЕКТОРИИ (С КЕШЕМ)
  // ==========================================

  getDirSize(dir) {
    // Проверяем кеш
    if (this._cache.dirSize.has(dir)) {
      return this._cache.dirSize.get(dir);
    }

    let size = 0;
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const p = path.join(dir, file);
        const stat = fs.statSync(p);
        if (stat.isDirectory()) {
          size += this.getDirSize(p);
        } else {
          size += stat.size;
        }
      }
    } catch (e) {
      // Игнорируем ошибки доступа
    }

    // Сохраняем в кеш (ограничиваем размер)
    if (this._cache.dirSize.size > 1000) {
      // Если кеш переполнен, очищаем половину
      const keys = Array.from(this._cache.dirSize.keys());
      for (let i = 0; i < keys.length / 2; i++) {
        this._cache.dirSize.delete(keys[i]);
      }
    }
    this._cache.dirSize.set(dir, size);
    return size;
  }

  getCacheSize() {
    const cacheDir = path.join(this.cwd, '.mip', 'cache');
    if (!fs.existsSync(cacheDir)) return 0;
    return this.getDirSize(cacheDir);
  }

  clearCache() {
    const cacheDir = path.join(this.cwd, '.mip', 'cache');
    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    // Очищаем кеш размеров
    this._cache.dirSize.clear();
  }

  // ==========================================
  // СИСТЕМНЫЕ МЕТОДЫ
  // ==========================================

  getCwd() {
    return this.cwd;
  }

  setCwd(path) {
    this.cwd = path;
    // Инвалидируем кеш при смене директории
    this._cache.mipJson = null;
    this._cache.lockfile = null;
    this._cache.dirSize.clear();
  }

  getVersion() {
    const pkg = require('../../package.json');
    return pkg.version;
  }

  // ==========================================
  // SHELL КОМАНДЫ
  // ==========================================

  runCommand(command, args = []) {
    const cmd = `mip ${command} ${args.join(' ')}`;
    execSync(cmd, { stdio: 'inherit', cwd: this.cwd });
  }

  exec(command, options = {}) {
    return execSync(command, {
      cwd: this.cwd,
      stdio: 'pipe',
      encoding: 'utf-8',
      ...options
    });
  }

  // ==========================================
  // ЛОГГИРОВАНИЕ (ОПТИМИЗИРОВАННОЕ)
  // ==========================================

  log(message, level = 'info') {
    // Если DEBUG не включен — пропускаем debug сообщения
    if (level === 'debug' && !process.env.DEBUG) {
      return;
    }

    const prefix = {
      info: '[INFO]',
      warn: '[WARN]',
      error: '[ERROR]',
      success: '[YES]',
      debug: '[DEBUG]'
    }[level] || '[PIN]';
    console.log(`${prefix} ${message}`);
  }
}

// ==========================================
// СИНГЛТОН
// ==========================================

let instance = null;

function getApiMethods() {
  if (!instance) {
    instance = new ApiMethods();
  }
  return instance;
}

module.exports = {
  ApiMethods,
  getApiMethods,
};