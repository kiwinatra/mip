/*
 * Minimal Package Manager
 * https://github.com/kiwinatra/mip
 * MIT License · Copyright (c) 2026 kiwinatra
 */

const fs = require('fs');
const path = require('path');

class ExportsResolver {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.mipDir = path.join(projectPath, '.mip');
  }

  /**
   * Resolves a package import to its actual filesystem path.
   * Implements the Node.js package exports specification with environment
   * condition priority: node → require → import → default.
   * 
   * @param {string} packageName - Package name as in package.json
   * @param {string} [subpath='.'] - Subpath within the package (e.g., './lib/utils')
   * @returns {string|null} Resolved filesystem path or null if not found
   */
  resolve(packageName, subpath = '.') {
    const packagePath = this.findPackagePath(packageName);
    if (!packagePath) {
      return null;
    }

    const packageJsonPath = path.join(packagePath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return path.join(packagePath, subpath);
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const exportsConfig = packageJson.exports;

    if (!exportsConfig) {
      return this.fallbackResolve(packagePath, subpath, packageJson);
    }

    return this.resolveExports(exportsConfig, subpath, packagePath, packageJson);
  }

  /**
   * Locates the installed version of a package in the .mip directory.
   * Uses lexical version sorting to select the highest version when multiple
   * versions exist (shouldn't happen in normal usage, but handles edge cases).
   * 
   * @param {string} packageName - Package name
   * @returns {string|null} Path to the latest installed version or null
   */
  findPackagePath(packageName) {
    const packageDir = path.join(this.mipDir, packageName);
    if (!fs.existsSync(packageDir)) {
      return null;
    }

    const versions = fs.readdirSync(packageDir).filter(v => {
      return fs.statSync(path.join(packageDir, v)).isDirectory();
    });

    if (versions.length === 0) {
      return null;
    }

    const latestVersion = versions.sort((a, b) => {
      return b.localeCompare(a);
    })[0];

    return path.join(packageDir, latestVersion);
  }

  /**
   * Resolves exports following the Node.js conditional exports specification.
   * Evaluates environment conditions in priority order and handles nested
   * export objects recursively.
   * 
   * Condition priority reflects Node.js runtime resolution:
   * - 'node' first (Node.js environment)
   * - 'require' second (CommonJS)
   * - 'import' third (ES modules)
   * - 'default' last (catch-all fallback)
   * 
   * @param {Object|string} exportsConfig - Package exports configuration
   * @param {string} subpath - Requested subpath
   * @param {string} packagePath - Filesystem path to package root
   * @param {Object} packageJson - Parsed package.json
   * @returns {string|null} Resolved filesystem path or null
   */
  resolveExports(exportsConfig, subpath, packagePath, packageJson) {
    if (typeof exportsConfig === 'string') {
      return path.join(packagePath, exportsConfig);
    }

    if (typeof exportsConfig === 'object') {
      const conditions = ['node', 'require', 'import', 'default'];

      for (const condition of conditions) {
        if (exportsConfig[condition]) {
          const resolved = this.resolveExportPath(
            exportsConfig[condition],
            subpath,
            packagePath,
            packageJson
          );
          if (resolved && fs.existsSync(resolved)) {
            return resolved;
          }
        }
      }

      if (exportsConfig[subpath]) {
        return this.resolveExportPath(
          exportsConfig[subpath],
          subpath,
          packagePath,
          packageJson
        );
      }

      if (exportsConfig['./*']) {
        const wildcardPath = subpath.replace(/^\.\//, '');
        return this.resolveExportPath(
          exportsConfig['./*'],
          wildcardPath,
          packagePath,
          packageJson
        );
      }
    }

    return this.fallbackResolve(packagePath, subpath, packageJson);
  }

  /**
   * Resolves an individual export path entry, handling wildcard substitution
   * and nested conditional exports recursively.
   * 
   * @param {Object|string} exportPath - Export path configuration
   * @param {string} subpath - Requested subpath
   * @param {string} packagePath - Filesystem path to package root
   * @param {Object} packageJson - Parsed package.json
   * @returns {string|null} Resolved filesystem path or null
   */
  resolveExportPath(exportPath, subpath, packagePath, packageJson) {
    if (typeof exportPath === 'string') {
      let finalPath = exportPath;

      if (finalPath.includes('*') && subpath !== '.') {
        finalPath = finalPath.replace('*', subpath);
      }

      return path.join(packagePath, finalPath);
    }

    if (typeof exportPath === 'object') {
      return this.resolveExports(exportPath, subpath, packagePath, packageJson);
    }

    return null;
  }

  /**
   * Fallback resolution for packages without exports configuration.
   * Uses 'main' field for root imports, otherwise treats subpath as relative path.
   * 
   * @param {string} packagePath - Filesystem path to package root
   * @param {string} subpath - Requested subpath
   * @param {Object} packageJson - Parsed package.json
   * @returns {string} Resolved filesystem path
   */
  fallbackResolve(packagePath, subpath, packageJson) {
    if (subpath === '.' || subpath === '') {
      const main = packageJson.main || 'index.js';
      return path.join(packagePath, main);
    }

    return path.join(packagePath, subpath);
  }

  /**
   * Lists all exported paths from a package's exports configuration.
   * Excludes environment condition keys (node, require, import, default).
   * 
   * @param {string} packageName - Package name
   * @returns {Array<string>} List of export paths (keys from exports object)
   */
  getExportedPaths(packageName) {
    const packagePath = this.findPackagePath(packageName);
    if (!packagePath) {
      return [];
    }

    const packageJsonPath = path.join(packagePath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return [];
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const exportsConfig = packageJson.exports;

    if (!exportsConfig || typeof exportsConfig !== 'object') {
      const paths = [];
      if (packageJson.main) {
        paths.push(packageJson.main);
      }
      paths.push('index.js');
      paths.push('index.cjs');
      paths.push('index.mjs');
      return paths;
    }

    const paths = [];
    for (const key of Object.keys(exportsConfig)) {
      if (key !== 'node' && key !== 'require' && key !== 'import' && key !== 'default') {
        paths.push(key);
      }
    }

    return paths;
  }

  /**
   * Checks if a package exports a specific subpath.
   * 
   * @param {string} packageName - Package name
   * @param {string} subpath - Subpath to check
   * @returns {boolean} True if the export exists and resolves to an existing file
   */
  hasExport(packageName, subpath) {
    const resolved = this.resolve(packageName, subpath);
    return resolved && fs.existsSync(resolved);
  }
}

module.exports = { ExportsResolver };