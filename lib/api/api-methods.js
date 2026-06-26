/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getPackageInfo } = require('../utils/registry');
const { updateDependencies, removeDependency } = require('../utils/deps');

class ApiMethods {
  constructor() {
    this.cwd = process.cwd();
    this.registeredCommands = new Map();
  }

  // ==========================================
  // РЕГИСТРАЦИЯ КОМАНД ПЛАГИНОВ
  // ==========================================

  registerCommand(commandName, pluginName, handler) {
    if (this.registeredCommands.has(commandName)) {
      console.warn(`[API] Command "${commandName}" already registered by "${this.registeredCommands.get(commandName).pluginName}", overriding...`);
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
  // РАБОТА С ФАЙЛАМИ
  // ==========================================

  getMipJson() {
    const pkgPath = path.join(this.cwd, 'mip.json');
    if (!fs.existsSync(pkgPath)) return null;
    return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  }

  updateMipJson(data) {
    const pkgPath = path.join(this.cwd, 'mip.json');
    fs.writeFileSync(pkgPath, JSON.stringify(data, null, 2));
  }

  getLockfile() {
    const lockPath = path.join(this.cwd, 'mip-lock.json');
    if (!fs.existsSync(lockPath)) return null;
    return JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  }

  updateLockfile(data) {
    const lockPath = path.join(this.cwd, 'mip-lock.json');
    fs.writeFileSync(lockPath, JSON.stringify(data, null, 2));
  }

  // ==========================================
  // РАБОТА С ПАКЕТАМИ
  // ==========================================

  async getPackageInfo(name, version = 'latest') {
    return getPackageInfo(name, version);
  }

  getInstalledPackages() {
    const mipDir = path.join(this.cwd, '.mip');
    if (!fs.existsSync(mipDir)) return [];

    const result = [];
    const dirs = fs.readdirSync(mipDir);
    for (const name of dirs) {
      const versions = fs.readdirSync(path.join(mipDir, name));
      for (const version of versions) {
        result.push({ name, version });
      }
    }
    return result;
  }

  isPackageInstalled(name, version = null) {
    const packages = this.getInstalledPackages();
    return packages.some(p => p.name === name && (version ? p.version === version : true));
  }

  // ==========================================
  // РАБОТА С ЗАВИСИМОСТЯМИ
  // ==========================================

  addDependency(name, version, dev = false) {
    updateDependencies(name, version, dev);
  }

  removeDependency(name) {
    removeDependency(name);
  }

  // ==========================================
  // РАБОТА С КОМАНДАМИ
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
  // РАБОТА С КЭШЕМ
  // ==========================================

  clearCache() {
    const cacheDir = path.join(this.cwd, '.mip', 'cache');
    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
      fs.mkdirSync(cacheDir, { recursive: true });
    }
  }

  getCacheSize() {
    const cacheDir = path.join(this.cwd, '.mip', 'cache');
    if (!fs.existsSync(cacheDir)) return 0;
    return this.getDirSize(cacheDir);
  }

  // ==========================================
  // ВСПОМОГАТЕЛЬНЫЕ
  // ==========================================

  getDirSize(dir) {
    let size = 0;
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

    // Cale thats returning right? /AG 
    // ok i did it
    return size;
  }

  getCwd() {
    return this.cwd;
  }

  setCwd(path) {
    this.cwd = path;
  }

  getVersion() {
    const pkg = require('../../package.json');
    return pkg.version;
  }

  log(message, level = 'info') {
    const prefix = {
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      success: '✅',
      debug: '🔍'
    }[level] || '📌';
    console.log(`${prefix} ${message}`);
  }
}

// ==========================================
// СИНГЛТОН (ГЛАВНОЕ — ОН ОДИН)
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