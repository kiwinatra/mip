/*
 * Minimal Package Manager
 * https://github.com/kiwinatra/mip
 * MIT License · Copyright (c) 2026 kiwinatra
 */

class HooksManager {
  constructor() {
    this.hooks = {
      beforeInstall: [],
      afterInstall: [],
      beforeUninstall: [],
      afterUninstall: [],
      beforeUpdate: [],
      afterUpdate: [],

      beforeResolve: [],
      afterResolve: [],

      beforeDownload: [],
      afterDownload: [],

      beforeExtract: [],
      afterExtract: [],

      beforeCacheRead: [],
      afterCacheRead: [],
      beforeCacheWrite: [],
      afterCacheWrite: [],

      beforeAudit: [],
      afterAudit: [],

      beforeCi: [],
      afterCi: [],

      onError: [],

      onPluginLoad: [],
      onPluginUnload: [],
    };

    this.plugins = new Map();
  }

  /**
   * Registers a hook function for a specific lifecycle event.
   * Hook execution order follows registration order (first registered, first executed).
   * Unknown hook names trigger a warning but don't throw, allowing forward compatibility.
   * 
   * @param {string} hookName - Lifecycle event identifier
   * @param {string} pluginName - Source plugin for tracking and cleanup
   * @param {Function} fn - Async function to execute
   * @returns {void}
   */
  registerHook(hookName, pluginName, fn) {
    if (!this.hooks[hookName]) {
      console.warn(`[Hooks] Unknown hook: ${hookName}`);
      return;
    }
    this.hooks[hookName].push({ pluginName, fn });
    console.log(`[Hooks] Registered hook "${hookName}" for plugin "${pluginName}"`);
  }

  /**
   * Removes all hooks belonging to a plugin across all hook types.
   * Used during plugin unload to prevent memory leaks and stale callbacks.
   * 
   * @param {string} pluginName - Plugin identifier
   * @returns {void}
   */
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

  /**
   * Invokes all hooks for a given lifecycle event.
   * Executes sequentially (not in parallel) to maintain predictable state transitions.
   * Individual hook failures are caught and logged but don't prevent other hooks from running.
   * 
   * @param {string} hookName - Lifecycle event identifier
   * @param {...any} args - Arguments to pass to each hook function
   * @returns {Promise<Array<{pluginName: string, result: any}>>} Results from all hooks
   */
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

  /**
   * Invokes hooks with early termination capability.
   * Returns false immediately if any hook returns false, acting as a veto mechanism.
   * Hook errors are treated as false (operation blocked) for safety.
   * 
   * @param {string} hookName - Lifecycle event identifier
   * @param {...any} args - Arguments to pass to each hook function
   * @returns {Promise<boolean>} True if all hooks succeed, false if any blocks or errors
   */
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

  /**
   * Wrapper for beforeInstall hook.
   * Blocks installation if any plugin returns false.
   * 
   * @param {string} pkg - Package name
   * @param {string} version - Target version
   * @param {Object} options - Installation options
   * @returns {Promise<boolean>} Whether to proceed with installation
   */
  async beforeInstall(pkg, version, options) {
    return this.callHookWithBreak('beforeInstall', pkg, version, options);
  }

  /**
   * Wrapper for afterInstall hook.
   * Collects results for audit/logging purposes without blocking.
   * 
   * @param {Object} pkgInfo - Installed package metadata
   * @param {Object} options - Installation options used
   * @returns {Promise<Array>} Hook results
   */
  async afterInstall(pkgInfo, options) {
    return this.callHook('afterInstall', pkgInfo, options);
  }

  async beforeUninstall(pkg, options) {
    return this.callHookWithBreak('beforeUninstall', pkg, options);
  }

  async afterUninstall(pkg) {
    return this.callHook('afterUninstall', pkg);
  }

  /**
   * Wrapper for beforeUpdate hook.
   * Blocks update if any plugin vetoes the version change.
   * 
   * @param {string} pkg - Package name
   * @param {string} current - Current installed version
   * @param {string} latest - Target version
   * @returns {Promise<boolean>} Whether to proceed with update
   */
  async beforeUpdate(pkg, current, latest) {
    return this.callHookWithBreak('beforeUpdate', pkg, current, latest);
  }

  async afterUpdate(pkg, old, latest) {
    return this.callHook('afterUpdate', pkg, old, latest);
  }

  async beforeResolve(pkg, range) {
    return this.callHookWithBreak('beforeResolve', pkg, range);
  }

  async afterResolve(pkgInfo) {
    return this.callHook('afterResolve', pkgInfo);
  }

  async beforeDownload(pkg, version, url) {
    return this.callHookWithBreak('beforeDownload', pkg, version, url);
  }

  async afterDownload(pkg, version, size, duration) {
    return this.callHook('afterDownload', pkg, version, size, duration);
  }

  async beforeExtract(pkg, version, targetDir) {
    return this.callHookWithBreak('beforeExtract', pkg, version, targetDir);
  }

  async afterExtract(pkg, version, targetDir) {
    return this.callHook('afterExtract', pkg, version, targetDir);
  }

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

  async beforeAudit(lockData) {
    return this.callHookWithBreak('beforeAudit', lockData);
  }

  async afterAudit(results) {
    return this.callHook('afterAudit', results);
  }

  async beforeCi(options) {
    return this.callHookWithBreak('beforeCi', options);
  }

  async afterCi(installedCount) {
    return this.callHook('afterCi', installedCount);
  }

  /**
   * Error handling hook that always executes.
   * Does not block operations since the error has already occurred.
   * 
   * @param {Error} err - The caught error
   * @param {Object} context - Execution context when error occurred
   * @returns {Promise<Array>} Hook results
   */
  async onError(err, context) {
    return this.callHook('onError', err, context);
  }

  /**
   * Plugin lifecycle hook triggered after plugin is loaded.
   * Stores plugin reference for future lookups.
   * 
   * @param {Object} plugin - Plugin instance
   * @returns {Promise<Array>} Hook results
   */
  async onPluginLoad(plugin) {
    this.plugins.set(plugin.name, plugin);
    return this.callHook('onPluginLoad', plugin);
  }

  /**
   * Plugin lifecycle hook triggered before plugin is unloaded.
   * Removes plugin reference after all cleanup hooks complete.
   * 
   * @param {Object} plugin - Plugin instance being unloaded
   * @returns {Promise<Array>} Hook results
   */
  async onPluginUnload(plugin) {
    this.plugins.delete(plugin.name);
    return this.callHook('onPluginUnload', plugin);
  }

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

  /**
   * Resets all hooks and plugin registry.
   * Used primarily for testing to ensure clean state between test suites.
   * 
   * @returns {void}
   */
  clear() {
    for (const hookName of Object.keys(this.hooks)) {
      this.hooks[hookName] = [];
    }
    this.plugins.clear();
    console.log('[Hooks] All hooks cleared');
  }

  /**
   * Aggregates hook statistics for debugging and monitoring.
   * 
   * @returns {Object} Summary including total hooks count, plugins count, and per-hook breakdown
   */
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

/**
 * Singleton factory maintaining a single hooks manager instance.
 * Critical because hooks are registered once during plugin initialization
 * and multiple instances would prevent cross-plugin communication.
 * 
 * @returns {HooksManager} The singleton instance
 */
let instance = null;

function getHooksManager() {
  if (!instance) {
    instance = new HooksManager();
  }
  return instance;
}

module.exports = {
  HooksManager,
  getHooksManager,
};