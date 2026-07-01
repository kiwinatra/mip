/*
 * Minimal Package Manager
 * https://github.com/kiwinatra/mip
 * MIT License · Copyright (c) 2026 kiwinatra
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { getHooksManager } = require('./hooks');
const { getApiMethods } = require('./api-methods');
const { getConfigHandler } = require('./config-handler');

let pluginManagerInstance = null;

class PluginManager {
  constructor() {
    if (pluginManagerInstance) {
      return pluginManagerInstance;
    }

    this.plugins = new Map();
    this.hooks = getHooksManager();
    this.api = getApiMethods();
    this.config = getConfigHandler();
    this.pluginDir = path.join(process.cwd(), 'plugins');
    this.loaded = false;

    pluginManagerInstance = this;
  }

  /**
   * Discovers and loads all available plugins from two sources:
   * 1. Global cache registry (user-installed plugins)
   * 2. Project-local plugins directory
   * 
   * Global plugins loaded first to allow project plugins to override
   * commands or behavior if needed.
   * 
   * @returns {void}
   */
  loadAll() {
    if (this.loaded) return;

    const home = os.homedir();
    const registryPath = path.join(home, '.mip_cache', 'plugins', 'registry.json');
    
    if (fs.existsSync(registryPath)) {
      try {
        const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
        for (const p of registry.plugins) {
          if (p.active) {
            const indexPath = path.join(p.path, 'index.js');
            if (fs.existsSync(indexPath)) {
              try {
                const plugin = require(indexPath);
                this.register(plugin);
                if (process.env.DEBUG) {
                  console.log(`[PluginManager] Loaded from cache: ${p.name}`);
                }
              } catch (err) {
                if (process.env.DEBUG) {
                  console.log(`[PluginManager] Failed to load ${p.name}: ${err.message}`);
                }
              }
            }
          }
        }
      } catch (err) {
        if (process.env.DEBUG) {
          console.log(`[PluginManager] Failed to load registry: ${err.message}`);
        }
      }
    }

    if (!fs.existsSync(this.pluginDir)) {
      fs.mkdirSync(this.pluginDir, { recursive: true });
      this.loaded = true;
      return;
    }

    const files = fs.readdirSync(this.pluginDir);
    for (const file of files) {
      if (file.endsWith('.js')) {
        const pluginPath = path.join(this.pluginDir, file);
        this.loadPlugin(pluginPath);
      }
    }

    this.loaded = true;
  }

  /**
   * Loads a single plugin from a filesystem path.
   * 
   * @param {string} pluginPath - Absolute path to plugin index.js
   * @returns {void}
   */
  loadPlugin(pluginPath) {
    try {
      const plugin = require(pluginPath);
      this.register(plugin);
    } catch (err) {
      if (process.env.DEBUG) {
        console.error(`Failed to load plugin ${pluginPath}: ${err.message}`);
      }
    }
  }

  /**
   * Registers a plugin instance into the system.
   * Performs validation, configuration loading, hook registration,
   * command registration, and initialization in strict order.
   * 
   * Registration flow:
   * 1. Validate plugin structure (name required)
   * 2. Check if plugin is enabled in config (opt-out model)
   * 3. Validate plugin configuration against its schema
   * 4. Register hooks (before init - allows hooks to affect init)
   * 5. Initialize plugin with API and config
   * 6. Register plugin commands (after init - commands may depend on init state)
   * 7. Trigger onPluginLoad lifecycle event
   * 
   * @param {Object} plugin - Plugin module export
   * @param {string} plugin.name - Unique plugin identifier
   * @param {string} [plugin.version] - Plugin version for debugging
   * @param {Object} [plugin.schema] - Configuration validation rules
   * @param {Object} [plugin.hooks] - Map of hook names to handler functions
   * @param {Function} [plugin.init] - Async initialization function
   * @param {Object} [plugin.commands] - Map of command names to handlers
   * @param {Function} [plugin.destroy] - Cleanup function for unload
   * @returns {void}
   * @throws {Error} When plugin lacks required fields or registration fails
   */
  register(plugin) {
    if (!plugin.name) {
      throw new Error('Plugin must have a name');
    }

    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" already registered`);
    }

    if (!this.config.isPluginEnabled(plugin.name)) {
      if (process.env.DEBUG) {
        console.log(`Plugin "${plugin.name}" is disabled in config`);
      }
      return;
    }

    if (plugin.schema) {
      try {
        this.config.validatePluginConfig(plugin.name, plugin.schema);
      } catch (err) {
        console.error(`Plugin "${plugin.name}" config validation failed: ${err.message}`);
        return;
      }
    }

    const config = this.config.getPluginConfig(plugin.name);

    this.plugins.set(plugin.name, {
      plugin,
      config,
      enabled: true,
    });

    if (plugin.hooks) {
      for (const [hookName, fn] of Object.entries(plugin.hooks)) {
        this.hooks.registerHook(hookName, plugin.name, fn);
      }
    }

    if (typeof plugin.init === 'function') {
      try {
        plugin.init({
          api: this.api,
          config: config,
          hooks: this.hooks,
        });
      } catch (err) {
        console.error(`Plugin "${plugin.name}" init error: ${err.message}`);
        this.plugins.delete(plugin.name);
        return;
      }
    }

    if (plugin.commands) {
      for (const [cmdName, cmdFn] of Object.entries(plugin.commands)) {
        this.api.registerCommand(cmdName, plugin.name, cmdFn);
        if (process.env.DEBUG) {
          console.log(`[PluginManager] Registered command: ${plugin.name} ${cmdName}`);
        }
      }
    }

    this.hooks.onPluginLoad(plugin);
    
    if (process.env.DEBUG) {
      console.log(`✅ Plugin loaded: ${plugin.name} v${plugin.version || '1.0.0'}`);
    }
  }

  /**
   * Gracefully unloads a plugin.
   * Invokes destroy hook, removes all hooks, and clears plugin references
   * in reverse order of initialization.
   * 
   * @param {string} pluginName - Plugin identifier
   * @returns {void}
   * @throws {Error} When plugin is not found
   */
  unregister(pluginName) {
    if (!this.plugins.has(pluginName)) {
      throw new Error(`Plugin "${pluginName}" not found`);
    }

    const { plugin } = this.plugins.get(pluginName);

    if (typeof plugin.destroy === 'function') {
      try {
        plugin.destroy();
      } catch (err) {
        console.error(`Plugin "${pluginName}" destroy error: ${err.message}`);
      }
    }

    this.hooks.unregisterHooks(pluginName);
    this.hooks.onPluginUnload(plugin);
    this.plugins.delete(pluginName);

    if (process.env.DEBUG) {
      console.log(`✅ Plugin unloaded: ${pluginName}`);
    }
  }

  /**
   * Enables a disabled plugin without requiring a restart.
   * Updates both in-memory state and persisted configuration.
   * 
   * @param {string} pluginName - Plugin identifier
   * @returns {void}
   * @throws {Error} When plugin is not found
   */
  enable(pluginName) {
    if (!this.plugins.has(pluginName)) {
      throw new Error(`Plugin "${pluginName}" not found`);
    }
    this.config.setPluginEnabled(pluginName, true);
    this.plugins.get(pluginName).enabled = true;
    if (process.env.DEBUG) {
      console.log(`✅ Plugin enabled: ${pluginName}`);
    }
  }

  /**
   * Disables an enabled plugin without unloading it.
   * Commands from disabled plugins become unavailable.
   * 
   * @param {string} pluginName - Plugin identifier
   * @returns {void}
   * @throws {Error} When plugin is not found
   */
  disable(pluginName) {
    if (!this.plugins.has(pluginName)) {
      throw new Error(`Plugin "${pluginName}" not found`);
    }
    this.config.setPluginEnabled(pluginName, false);
    this.plugins.get(pluginName).enabled = false;
    if (process.env.DEBUG) {
      console.log(`✅ Plugin disabled: ${pluginName}`);
    }
  }

  getPlugin(name) {
    return this.plugins.get(name)?.plugin || null;
  }

  getPlugins() {
    return Array.from(this.plugins.values()).map(({ plugin }) => plugin);
  }

  getEnabledPlugins() {
    return Array.from(this.plugins.values())
      .filter(({ enabled }) => enabled)
      .map(({ plugin }) => plugin);
  }

  getPluginConfig(name) {
    return this.plugins.get(name)?.config || null;
  }

  /**
   * Registers a new command dynamically on an already-loaded plugin.
   * Useful for plugins that need to register commands asynchronously
   * after initialization completes.
   * 
   * @param {string} pluginName - Plugin identifier
   * @param {string} commandName - Command identifier
   * @param {Function} handler - Command execution function
   * @returns {void}
   * @throws {Error} When plugin is not found
   */
  createCommand(pluginName, commandName, handler) {
    const plugin = this.getPlugin(pluginName);
    if (!plugin) {
      throw new Error(`Plugin "${pluginName}" not found`);
    }

    if (!plugin.commands) {
      plugin.commands = {};
    }

    plugin.commands[commandName] = handler;
    if (process.env.DEBUG) {
      console.log(`✅ Plugin "${pluginName}" registered command: ${commandName}`);
    }
  }

  /**
   * Executes a command registered by a plugin.
   * 
   * @param {string} pluginName - Plugin identifier
   * @param {string} commandName - Command identifier
   * @param {...any} args - Arguments to pass to the command handler
   * @returns {Promise<any>} Command execution result
   * @throws {Error} When plugin or command is not found
   */
  async runCommand(pluginName, commandName, ...args) {
    const plugin = this.getPlugin(pluginName);
    if (!plugin) {
      throw new Error(`Plugin "${pluginName}" not found`);
    }

    if (!plugin.commands || !plugin.commands[commandName]) {
      throw new Error(`Command "${commandName}" not found in plugin "${pluginName}"`);
    }

    return plugin.commands[commandName](...args);
  }

  /**
   * Aggregates plugin statistics for monitoring and debugging.
   * 
   * @returns {Object} Plugin stats including total, enabled, disabled, and names
   */
  getStats() {
    const total = this.plugins.size;
    const enabled = this.getEnabledPlugins().length;
    const disabled = total - enabled;

    return {
      total,
      enabled,
      disabled,
      names: Array.from(this.plugins.keys()),
    };
  }
}

/**
 * Singleton factory maintaining a single plugin manager instance.
 * Ensures plugins are discovered and loaded exactly once per process lifecycle.
 * 
 * @returns {PluginManager} The singleton instance
 */
function getPluginManager() {
  if (!pluginManagerInstance) {
    pluginManagerInstance = new PluginManager();
    pluginManagerInstance.loadAll();
  }
  return pluginManagerInstance;
}

module.exports = {
  PluginManager,
  getPluginManager,
};