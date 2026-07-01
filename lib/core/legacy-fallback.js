/*
 * Minimal Package Manager
 * https://github.com/kiwinatra/mip
 * MIT License · Copyright (c) 2026 kiwinatra
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class LegacyFallback {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.mipDir = path.join(projectPath, '.mip');
    this.nodeModulesDir = path.join(projectPath, 'node_modules');
  }

  /**
   * Determines if a package requires legacy fallback behavior.
   * Returns true when the package exists in node_modules but not in .mip,
   * indicating it was installed by npm/yarn and needs compatibility handling.
   * 
   * @param {string} packageName - Package name
   * @returns {boolean} Whether fallback is needed
   */
  needsFallback(packageName) {
    const mipPath = this.findInMip(packageName);
    if (mipPath) {
      return false;
    }

    const nodeModulesPath = this.findInNodeModules(packageName);
    return nodeModulesPath !== null;
  }

  /**
   * Locates the latest installed version of a package in .mip.
   * Uses lexical version sorting to select the highest version.
   * 
   * @param {string} packageName - Package name
   * @returns {string|null} Path to package version or null if not found
   */
  findInMip(packageName) {
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

    const latestVersion = versions.sort().reverse()[0];
    return path.join(packageDir, latestVersion);
  }

  /**
   * Checks if a package exists in the legacy node_modules directory.
   * 
   * @param {string} packageName - Package name
   * @returns {string|null} Path to package or null if not found
   */
  findInNodeModules(packageName) {
    const packagePath = path.join(this.nodeModulesDir, packageName);
    if (fs.existsSync(packagePath)) {
      return packagePath;
    }
    return null;
  }

  /**
   * Resolves a package to its filesystem path, preferring .mip over node_modules.
   * The source field indicates where the package was found for debugging purposes.
   * 
   * @param {string} packageName - Package name
   * @returns {Object|null} Object with path and source, or null if not found
   */
  resolvePackagePath(packageName) {
    const mipPath = this.findInMip(packageName);
    if (mipPath) {
      return { path: mipPath, source: 'mip' };
    }

    const nodeModulesPath = this.findInNodeModules(packageName);
    if (nodeModulesPath) {
      return { path: nodeModulesPath, source: 'node_modules' };
    }

    return null;
  }

  /**
   * Creates a junction symlink from node_modules to .mip for a package.
   * This allows tools and scripts that expect node_modules to work with
   * packages installed via mip without modifications.
   * 
   * Uses 'junction' on Windows (directory symlink) for cross-platform compatibility.
   * 
   * @param {string} packageName - Package name
   * @returns {boolean} True if symlink was created, false otherwise
   */
  emulateNodeModules(packageName) {
    const mipPath = this.findInMip(packageName);
    if (!mipPath) {
      return false;
    }

    const targetPath = path.join(this.nodeModulesDir, packageName);

    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(this.nodeModulesDir, { recursive: true });
      fs.symlinkSync(mipPath, targetPath, 'junction');
      return true;
    }

    return false;
  }

  /**
   * Emulates all dependencies of a package by creating symlinks in node_modules.
   * This recursively ensures all transitive dependencies are accessible via node_modules.
   * 
   * @param {string} packageName - Package name
   * @returns {number} Number of dependencies successfully emulated
   */
  emulateDependencies(packageName) {
    const pkgInfo = this.getPackageInfo(packageName);
    if (!pkgInfo) {
      return false;
    }

    const deps = pkgInfo.dependencies || {};
    let emulated = 0;

    for (const depName of Object.keys(deps)) {
      if (this.emulateNodeModules(depName)) {
        emulated++;
      }
    }

    return emulated;
  }

  /**
   * Reads and parses package.json for a package installed in .mip.
   * 
   * @param {string} packageName - Package name
   * @returns {Object|null} Parsed package.json or null
   */
  getPackageInfo(packageName) {
    const packagePath = this.findInMip(packageName);
    if (!packagePath) {
      return null;
    }

    const packageJsonPath = path.join(packagePath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  }

  /**
   * Identifies packages that are "legacy" based on package.json characteristics.
   * A package is considered legacy when:
   * - It lacks an 'exports' field (pre-Node.js 12.7.0)
   * - It uses 'index.js' as the main entry point
   * - It has no 'type' field (defaults to CommonJS)
   * 
   * These indicators suggest the package was designed for older Node.js
   * versions and may not support modern module resolution.
   * 
   * @param {string} packageName - Package name
   * @returns {boolean} Whether the package is considered legacy
   */
  isLegacyPackage(packageName) {
    const pkgInfo = this.getPackageInfo(packageName);
    if (!pkgInfo) {
      return false;
    }

    const hasOldExports = !pkgInfo.exports;
    const usesOldMain = pkgInfo.main && pkgInfo.main === 'index.js';
    const hasNoTypeField = !pkgInfo.type;

    return hasOldExports && (usesOldMain || hasNoTypeField);
  }

  /**
   * Removes all symlinks created for emulation from node_modules.
   * Only removes symlinks, not real directories, to avoid accidentally
   * deleting packages installed by other tools.
   * 
   * @returns {number} Number of symlinks removed
   */
  cleanEmulation() {
    if (fs.existsSync(this.nodeModulesDir)) {
      const items = fs.readdirSync(this.nodeModulesDir);
      let removed = 0;

      for (const item of items) {
        const itemPath = path.join(this.nodeModulesDir, item);
        if (fs.lstatSync(itemPath).isSymbolicLink()) {
          fs.unlinkSync(itemPath);
          removed++;
        }
      }

      return removed;
    }

    return 0;
  }
}

module.exports = { LegacyFallback };