/*
 * Minimal Package Manager
 * https://github.com/kiwinatra/mip
 * MIT License · Copyright (c) 2026 kiwinatra
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getPackageInfo } = require('../utils/registry');
const { updateDependencies, removeDependency } = require('../utils/deps');

/**
 * file metatags
 */
function Metatags() {
    return {
        description: "api methods for plugins.", 
        version: "2.1.1",                 
        lastUpdate: "Fixed mip-lang issue, very dumb issue"  
    }
}

class ApiMethods {
  constructor() {
    this.cwd = process.cwd();
    this.registeredCommands = new Map();
  }

  /**
   * Registers a plugin command handler in the global command registry.
   * Late registrations override earlier ones with a warning to prevent silent failures.
   * 
   * @param {string} commandName - Unique command identifier
   * @param {string} pluginName - Source plugin for debugging and conflict resolution
   * @param {Function} handler - Async function receiving parsed args
   * @returns {void}
   */
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

  /**
   * Executes a registered plugin command by name.
   * 
   * @param {string} commandName - Registered command identifier
   * @param {any} args - Arguments to pass to the handler
   * @returns {Promise<any>} Handler's return value
   * @throws {Error} When command is not registered
   */
  async runRegisteredCommand(commandName, args) {
    const entry = this.registeredCommands.get(commandName);
    if (!entry) {
      throw new Error(`Command "${commandName}" not found`);
    }
    return entry.handler(args);
  }

  /**
   * Reads and parses the project's mip.json manifest.
   * Returns null when manifest doesn't exist (fresh project state).
   * 
   * @returns {Object|null} Parsed manifest or null
   */
  getMipJson() {
    const pkgPath = path.join(this.cwd, 'mip.json');
    if (!fs.existsSync(pkgPath)) return null;
    return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  }

  /**
   * Persists manifest changes atomically with pretty-printing.
   * 
   * @param {Object} data - Complete manifest object to write
   * @returns {void}
   */
  updateMipJson(data) {
    const pkgPath = path.join(this.cwd, 'mip.json');
    fs.writeFileSync(pkgPath, JSON.stringify(data, null, 2));
  }

  /**
   * Reads the lockfile that captures exact resolved versions.
   * Lockfile absence indicates first install or post-cleanup state.
   * 
   * @returns {Object|null} Parsed lockfile or null
   */
  getLockfile() {
    const lockPath = path.join(this.cwd, 'mip-lock.json');
    if (!fs.existsSync(lockPath)) return null;
    return JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  }

  /**
   * Writes lockfile to pin all transitive dependencies.
   * 
   * @param {Object} data - Complete lockfile object
   * @returns {void}
   */
  updateLockfile(data) {
    const lockPath = path.join(this.cwd, 'mip-lock.json');
    fs.writeFileSync(lockPath, JSON.stringify(data, null, 2));
  }

  /**
   * Fetches package metadata from the configured registry.
   * Version defaults to 'latest' for dependency resolution.
   * 
   * @param {string} name - Package name
   * @param {string} [version='latest'] - Semver range or specific version
   * @returns {Promise<Object>} Package metadata including dependencies and dist-tags
   */
  async getPackageInfo(name, version = 'latest') {
    return getPackageInfo(name, version);
  }

  /**
   * Scans .mip directory and returns all installed package instances.
   * Structure: .mip/<package-name>/<version>/
   * 
   * @returns {Array<{name: string, version: string}>} Installed packages
   */
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

  /**
   * Checks if a specific package version is installed.
   * When version is null, checks for any version of the package.
   * 
   * @param {string} name - Package name
   * @param {string|null} [version=null] - Specific version or null for any
   * @returns {boolean} Installation status
   */
  isPackageInstalled(name, version = null) {
    const packages = this.getInstalledPackages();
    return packages.some(p => p.name === name && (version ? p.version === version : true));
  }

  /**
   * Adds a dependency to mip.json.
   * Dev flag controls whether it goes to devDependencies or dependencies.
   * 
   * @param {string} name - Package name
   * @param {string} version - Semver range
   * @param {boolean} [dev=false] - Whether this is a development dependency
   * @returns {void}
   */
  addDependency(name, version, dev = false) {
    updateDependencies(name, version, dev);
  }

  /**
   * Removes a dependency from both dependencies and devDependencies.
   * 
   * @param {string} name - Package name to remove
   * @returns {void}
   */
  removeDependency(name) {
    removeDependency(name);
  }

  /**
   * Invokes a mip subcommand as a child process.
   * Useful for plugin composition and chaining operations.
   * 
   * @param {string} command - Subcommand name
   * @param {string[]} [args=[]] - Command arguments
   * @returns {void}
   */
  runCommand(command, args = []) {
    const cmd = `mip ${command} ${args.join(' ')}`;
    execSync(cmd, { stdio: 'inherit', cwd: this.cwd });
  }

  /**
   * Executes arbitrary shell command with pipe output.
   * Stdout is captured and returned, stderr goes to parent.
   * 
   * @param {string} command - Shell command to execute
   * @param {Object} [options={}] - Additional execSync options
   * @returns {string} Command output (stdout)
   */
  exec(command, options = {}) {
    return execSync(command, {
      cwd: this.cwd,
      stdio: 'pipe',
      encoding: 'utf-8',
      ...options
    });
  }

  /**
   * Removes entire cache directory and recreates it.
   * Used when registry metadata becomes stale or corrupted.
   * 
   * @returns {void}
   */
  clearCache() {
    const cacheDir = path.join(this.cwd, '.mip', 'cache');
    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
      fs.mkdirSync(cacheDir, { recursive: true });
    }
  }

  /**
   * Calculates total cache directory size in bytes.
   * 
   * @returns {number} Cache size in bytes
   */
  getCacheSize() {
    const cacheDir = path.join(this.cwd, '.mip', 'cache');
    if (!fs.existsSync(cacheDir)) return 0;
    return this.getDirSize(cacheDir);
  }

  /**
   * Recursively calculates directory size by traversing all files.
   * Uses synchronous iteration to avoid callback hell for CLI tools.
   * 
   * @param {string} dir - Directory path to measure
   * @returns {number} Total size in bytes
   */
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
    return size;
  }

  getCwd() {
    return this.cwd;
  }

  /**
   * Changes the working directory context for all operations.
   * Critical for plugins operating on different project roots.
   * 
   * @param {string} path - New working directory
   * @returns {void}
   */
  setCwd(path) {
    this.cwd = path;
  }

  /**
   * Returns the API version from the parent package.json.
   * 
   * @returns {string} Semantic version string
   */
  getVersion() {
    const pkg = require('../../package.json');
    return pkg.version;
  }

  /**
   * Structured logging with severity levels.
   * Emojis provide quick visual categorization in terminal output.
   * 
   * @param {string} message - Log message
   * @param {string} [level='info'] - Severity level: info|warn|error|success|debug
   * @returns {void}
   */
  log(message, level = 'info') {
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

/**
 * Singleton factory to maintain a single API instance across the application.
 * Prevents state desynchronization when multiple modules require the API.
 * 
 * @returns {ApiMethods} The singleton instance
 */
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