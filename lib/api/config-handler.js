/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const fs = require('fs');
const path = require('path');

class ConfigHandler {
  constructor() {
    this.cwd = process.cwd();
    this.configPath = path.join(this.cwd, 'mip.json');
    this.config = null;
    this.pluginConfigs = new Map();
    this.envPrefix = 'MIP_PLUGIN_';
    this.load();
  }

  // ==========================================
  // ЗАГРУЗКА КОНФИГА
  // ==========================================

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

  // ==========================================
  // РАБОТА С ПЛАГИНАМИ
  // ==========================================

  // Получить конфиг плагина
  getPluginConfig(pluginName) {
    if (this.pluginConfigs.has(pluginName)) {
      return this.pluginConfigs.get(pluginName);
    }

    const config = this.config?.plugins?.[pluginName] || {};
    this.pluginConfigs.set(pluginName, config);
    return config;
  }

  // Обновить конфиг плагина
  setPluginConfig(pluginName, config) {
    if (!this.config.plugins) {
      this.config.plugins = {};
    }
    this.config.plugins[pluginName] = config;
    this.pluginConfigs.set(pluginName, config);
    this.save();
  }

  // Удалить конфиг плагина
  removePluginConfig(pluginName) {
    if (this.config.plugins && this.config.plugins[pluginName]) {
      delete this.config.plugins[pluginName];
      this.pluginConfigs.delete(pluginName);
      this.save();
    }
  }

  // Включить/выключить плагин
  setPluginEnabled(pluginName, enabled) {
    const config = this.getPluginConfig(pluginName);
    config.enabled = enabled;
    this.setPluginConfig(pluginName, config);
  }

  isPluginEnabled(pluginName) {
    const config = this.getPluginConfig(pluginName);
    return config.enabled !== false;
  }

  // ==========================================
  // ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ
  // ==========================================

  // Получить переменную окружения для плагина
  getEnv(key) {
    const envKey = `${this.envPrefix}${key.toUpperCase()}`;
    return process.env[envKey] || null;
  }

  // Получить все переменные окружения для плагина
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

  // ==========================================
  // ПАРСИНГ КОНФИГОВ
  // ==========================================

  parsePluginConfigs() {
    this.pluginConfigs.clear();

    if (!this.config.plugins) return;

    for (const [name, config] of Object.entries(this.config.plugins)) {
      // Мержим с переменными окружения
      const envConfig = this.getPluginEnv(name);
      const merged = { ...config };

      for (const [key, value] of Object.entries(envConfig)) {
        // Приводим типы
        if (value === 'true') merged[key] = true;
        else if (value === 'false') merged[key] = false;
        else if (!isNaN(value)) merged[key] = Number(value);
        else merged[key] = value;
      }

      this.pluginConfigs.set(name, merged);
    }
  }

  // ==========================================
  // СОХРАНЕНИЕ
  // ==========================================

  save() {
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
  }

  // ==========================================
  // ДОСТУП К КОНФИГУ
  // ==========================================

  getConfig() {
    return this.config;
  }

  get(key, defaultValue = null) {
    return this.config?.[key] ?? defaultValue;
  }

  set(key, value) {
    this.config[key] = value;
    this.save();
  }

  // ==========================================
  // ВАЛИДАЦИЯ
  // ==========================================

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

// ==========================================
// СИНГЛТОН
// ==========================================

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