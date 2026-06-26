/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

class HooksManager {
  constructor() {
    // Все хуки, которые есть в системе
    this.hooks = {
      // Установка
      beforeInstall: [],
      afterInstall: [],
      beforeUninstall: [],
      afterUninstall: [],
      beforeUpdate: [],
      afterUpdate: [],

      // Резолвинг
      beforeResolve: [],
      afterResolve: [],

      // Загрузка
      beforeDownload: [],
      afterDownload: [],

      // Распаковка
      beforeExtract: [],
      afterExtract: [],

      // Кэш
      beforeCacheRead: [],
      afterCacheRead: [],
      beforeCacheWrite: [],
      afterCacheWrite: [],

      // Аудит
      beforeAudit: [],
      afterAudit: [],

      // CI
      beforeCi: [],
      afterCi: [],

      // Ошибки
      onError: [],

      // Жизненный цикл
      onPluginLoad: [],
      onPluginUnload: [],
    };

    this.plugins = new Map();
  }

  // Зарегистрировать хук
  registerHook(hookName, pluginName, fn) {
    if (!this.hooks[hookName]) {
      console.warn(`[Hooks] Unknown hook: ${hookName}`);
      return;
    }
    this.hooks[hookName].push({ pluginName, fn });
    console.log(`[Hooks] Registered hook "${hookName}" for plugin "${pluginName}"`);
  }

  // Удалить все хуки плагина
  unregisterHooks(pluginName) {
    let count = 0;
    for (const hookName of Object.keys(this.hooks)) {
      const before = this.hooks[hookName].length;
      this.hooks[hookName] = this.hooks[hookName].filter(
        h => h.pluginName !== pluginName
      );
      count += before - this.hooks[hookName].length;
    }
    if (count > 0) {
      console.log(`[Hooks] Removed ${count} hooks for plugin "${pluginName}"`);
    }
  }

  // Вызвать хук
  async callHook(hookName, ...args) {
    const fns = this.hooks[hookName] || [];
    if (fns.length === 0) return [];

    const results = [];
    for (const { pluginName, fn } of fns) {
      try {
        const result = await fn(...args);
        results.push({ pluginName, result });
      } catch (err) {
        console.error(`[Hooks] Plugin "${pluginName}" error in "${hookName}":`, err.message);
      }
    }
    return results;
  }

  // Вызвать хук с возможностью прервать выполнение
  async callHookWithBreak(hookName, ...args) {
    const fns = this.hooks[hookName] || [];
    if (fns.length === 0) return true;

    for (const { pluginName, fn } of fns) {
      try {
        const result = await fn(...args);
        if (result === false) {
          console.log(`[Hooks] Plugin "${pluginName}" broke execution in "${hookName}"`);
          return false;
        }
      } catch (err) {
        console.error(`[Hooks] Plugin "${pluginName}" error in "${hookName}":`, err.message);
        return false;
      }
    }
    return true;
  }

  // ==========================================
  // ОТДЕЛЬНЫЕ ХУКИ ДЛЯ КОМАНД
  // ==========================================

  // Установка
  async beforeInstall(pkg, version, options) {
    return this.callHookWithBreak('beforeInstall', pkg, version, options);
  }

  async afterInstall(pkgInfo, options) {
    return this.callHook('afterInstall', pkgInfo, options);
  }

  async beforeUninstall(pkg, options) {
    return this.callHookWithBreak('beforeUninstall', pkg, options);
  }

  async afterUninstall(pkg) {
    return this.callHook('afterUninstall', pkg);
  }

  async beforeUpdate(pkg, current, latest) {
    return this.callHookWithBreak('beforeUpdate', pkg, current, latest);
  }

  async afterUpdate(pkg, old, latest) {
    return this.callHook('afterUpdate', pkg, old, latest);
  }

  // Резолвинг
  async beforeResolve(pkg, range) {
    return this.callHookWithBreak('beforeResolve', pkg, range);
  }

  async afterResolve(pkgInfo) {
    return this.callHook('afterResolve', pkgInfo);
  }

  // Загрузка
  async beforeDownload(pkg, version, url) {
    return this.callHookWithBreak('beforeDownload', pkg, version, url);
  }

  async afterDownload(pkg, version, size, duration) {
    return this.callHook('afterDownload', pkg, version, size, duration);
  }

  // Распаковка
  async beforeExtract(pkg, version, targetDir) {
    return this.callHookWithBreak('beforeExtract', pkg, version, targetDir);
  }

  async afterExtract(pkg, version, targetDir) {
    return this.callHook('afterExtract', pkg, version, targetDir);
  }

  // Кэш
  async beforeCacheRead(pkg, version) {
    return this.callHookWithBreak('beforeCacheRead', pkg, version);
  }

  async afterCacheRead(pkg, version, data) {
    return this.callHook('afterCacheRead', pkg, version, data);
  }

  async beforeCacheWrite(pkg, version, data) {
    return this.callHookWithBreak('beforeCacheWrite', pkg, version, data);
  }

  async afterCacheWrite(pkg, version) {
    return this.callHook('afterCacheWrite', pkg, version);
  }

  // Аудит
  async beforeAudit(lockData) {
    return this.callHookWithBreak('beforeAudit', lockData);
  }

  async afterAudit(results) {
    return this.callHook('afterAudit', results);
  }

  // CI
  async beforeCi(options) {
    return this.callHookWithBreak('beforeCi', options);
  }

  async afterCi(installedCount) {
    return this.callHook('afterCi', installedCount);
  }

  // Ошибки
  async onError(err, context) {
    return this.callHook('onError', err, context);
  }

  // Жизненный цикл
  async onPluginLoad(plugin) {
    this.plugins.set(plugin.name, plugin);
    return this.callHook('onPluginLoad', plugin);
  }

  async onPluginUnload(plugin) {
    this.plugins.delete(plugin.name);
    return this.callHook('onPluginUnload', plugin);
  }

  // ==========================================
  // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
  // ==========================================

  getHooks(hookName) {
    return this.hooks[hookName] || [];
  }

  hasHooks(hookName) {
    return (this.hooks[hookName] || []).length > 0;
  }

  getPlugins() {
    return Array.from(this.plugins.keys());
  }

  getPlugin(name) {
    return this.plugins.get(name) || null;
  }

  clear() {
    for (const hookName of Object.keys(this.hooks)) {
      this.hooks[hookName] = [];
    }
    this.plugins.clear();
    console.log('[Hooks] All hooks cleared');
  }

  // Статистика
  getStats() {
    const stats = {};
    for (const [name, hooks] of Object.entries(this.hooks)) {
      stats[name] = hooks.length;
    }
    return {
      totalHooks: Object.values(this.hooks).reduce((sum, h) => sum + h.length, 0),
      plugins: this.plugins.size,
      hooks: stats,
    };
  }
}

// ==========================================
// СИНГЛТОН
// ==========================================

let instance = null;

function getHooksManager() {
  if (!instance) {
    instance = new HooksManager();
  }
  return instance;
}

// ==========================================
// ЭКСПОРТ
// ==========================================

module.exports = {
  HooksManager,
  getHooksManager,
};