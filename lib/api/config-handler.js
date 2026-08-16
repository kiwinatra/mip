/*
 * Minimal Package Manager
 * https://github.com/kiwinatra/mip
 * MIT License · Copyright (c) 2026 kiwinatra
 */

const fs = require('fs');
const path = require('path');

function _Metatags() {
    return {
        description: "Handles Mip-plugin config.",
        version: "2.1.1",
        lastUpdate: "Fixes for mip-lang"
    }
}

class ConfigHandler {
  constructor() {
    this.cwd = process.cwd();
    this.configPath = path.join(this.cwd, 'mip.json');
    this.config = null;
    this.pluginConfigs = new Map();
    this.envPrefix = 'MIP_PLUGIN_';
    this.load();
  }

  /**
   * Loads and parses the mip.json manifest.
   * Creates default config when manifest is missing.
   * Plugin section is initialized to prevent null reference errors.
   * 
   * @returns {void}
   */
  load() {
    if (!fs.existsSync(this.configPath)) {
      this.config = {
        name: path.basename(this.cwd),
        version: '1.0.0',
        dependencies: {},
        devDependencies: {},
        plugins: {}
      };
      return;
    }

    try {
      this.config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      if (!this.config.plugins) {
        this.config.plugins = {};
      }
      this.parsePluginConfigs();
    } catch (err) {
      console.error(`Failed to load mip.json: ${err.message}`);
      this.config = {
        plugins: {}
      };
    }
  }

  /**
   * Retrieves plugin configuration with memoization.
   * First call caches the config, subsequent calls return cached version
   * to avoid repeated parsing and environment merging overhead.
   * 
   * @param {string} pluginName - Plugin identifier
   * @returns {Object} Plugin configuration object
   */
  getPluginConfig(pluginName) {
    if (this.pluginConfigs.has(pluginName)) {
      return this.pluginConfigs.get(pluginName);
    }

    const config = this.config?.plugins?.[pluginName] || {};
    this.pluginConfigs.set(pluginName, config);
    return config;
  }

  /**
   * Updates plugin configuration and persists to disk.
   * Invalidates cached version to maintain consistency.
   * 
   * @param {string} pluginName - Plugin identifier
   * @param {Object} config - Complete configuration object to store
   * @returns {void}
   */
  setPluginConfig(pluginName, config) {
    if (!this.config.plugins) {
      this.config.plugins = {};
    }
    this.config.plugins[pluginName] = config;
    this.pluginConfigs.set(pluginName, config);
    this.save();
  }

  /**
   * Removes plugin configuration entirely from manifest.
   * 
   * @param {string} pluginName - Plugin identifier to remove
   * @returns {void}
   */
  removePluginConfig(pluginName) {
    if (this.config.plugins && this.config.plugins[pluginName]) {
      delete this.config.plugins[pluginName];
      this.pluginConfigs.delete(pluginName);
      this.save();
    }
  }

  /**
   * Toggles plugin activation state.
   * Enabled flag defaults to true when not explicitly set.
   * 
   * @param {string} pluginName - Plugin identifier
   * @param {boolean} enabled - New activation state
   * @returns {void}
   */
  setPluginEnabled(pluginName, enabled) {
    const config = this.getPluginConfig(pluginName);
    config.enabled = enabled;
    this.setPluginConfig(pluginName, config);
  }

  /**
   * Checks if plugin is enabled.
   * Treats missing enabled property as true (opt-out model).
   * 
   * @param {string} pluginName - Plugin identifier
   * @returns {boolean} Whether plugin is active
   */
  isPluginEnabled(pluginName) {
    const config = this.getPluginConfig(pluginName);
    return config.enabled !== false;
  }

  /**
   * Reads environment variable with plugin prefix.
   * Follows convention: MIP_PLUGIN_<KEY> where KEY is normalized to uppercase.
   * 
   * @param {string} key - Configuration key
   * @returns {string|null} Environment value or null if not set
   */
  getEnv(key) {
    const envKey = `${this.envPrefix}${key.toUpperCase()}`;
    return process.env[envKey] || null;
  }

  /**
   * Collects all environment variables belonging to a specific plugin.
   * Pattern: MIP_PLUGIN_<PLUGIN_NAME>_<KEY>
   * Strips prefix and normalizes keys to lowercase.
   * 
   * @param {string} pluginName - Plugin identifier
   * @returns {Object} Key-value pairs from environment
   */
  getPluginEnv(pluginName) {
    const result = {};
    const prefix = `${this.envPrefix}${pluginName.toUpperCase()}_`;
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(prefix)) {
        const shortKey = key.slice(prefix.length).toLowerCase();
        result[shortKey] = value;
      }
    }
    return result;
  }

  /**
   * Parses all plugin configurations and merges with environment variables.
   * Environment variables take precedence over manifest values.
   * Performs type coercion: 'true'/'false' strings become booleans,
   * numeric strings become numbers.
   * 
   * @returns {void}
   */
  parsePluginConfigs() {
    this.pluginConfigs.clear();

    if (!this.config.plugins) return;

    for (const [name, config] of Object.entries(this.config.plugins)) {
      const envConfig = this.getPluginEnv(name);
      const merged = { ...config };

      for (const [key, value] of Object.entries(envConfig)) {
        if (value === 'true') merged[key] = true;
        else if (value === 'false') merged[key] = false;
        else if (!isNaN(value)) merged[key] = Number(value);
        else merged[key] = value;
      }

      this.pluginConfigs.set(name, merged);
    }
  }

  /**
   * Persists current configuration to disk with pretty-printing.
   * 
   * @returns {void}
   */
  save() {
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
  }

  getConfig() {
    return this.config;
  }

  /**
   * Retrieves a configuration value with fallback.
   * Nullish coalescing operator handles undefined/null properly.
   * 
   * @param {string} key - Configuration key
   * @param {any} [defaultValue=null] - Fallback value
   * @returns {any} Configuration value or default
   */
  get(key, defaultValue = null) {
    return this.config?.[key] ?? defaultValue;
  }

  /**
   * Sets a configuration value and persists immediately.
   * 
   * @param {string} key - Configuration key
   * @param {any} value - Value to store
   * @returns {void}
   */
  set(key, value) {
    this.config[key] = value;
    this.save();
  }

  /**
   * Validates plugin configuration against a schema.
   * Supports required fields and type checking.
   * Throws early during validation to prevent runtime errors from invalid configs.
   * 
   * @param {string} pluginName - Plugin identifier
   * @param {Object} schema - Validation rules mapping keys to {required, type}
   * @returns {boolean} True when validation passes
   * @throws {Error} When validation fails with descriptive message
   */
  validatePluginConfig(pluginName, schema) {
    const config = this.getPluginConfig(pluginName);

    for (const [key, validator] of Object.entries(schema)) {
      const value = config[key];
      if (validator.required && (value === undefined || value === null)) {
        throw new Error(`Missing required config: ${key}`);
      }
      if (validator.type && value !== undefined && value !== null) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== validator.type) {
          throw new Error(`Config ${key} must be ${validator.type}, got ${actualType}`);
        }
      }
    }

    return true;
  }
}

/**
 * Singleton factory maintaining a single config handler instance.
 * Prevents multiple independent config loads and cache desynchronization.
 * 
 * @returns {ConfigHandler} The singleton instance
 */
let instance = null;

function getConfigHandler() {
  if (!instance) {
    instance = new ConfigHandler();
  }
  return instance;
}

module.exports = {
  ConfigHandler,
  getConfigHandler
};