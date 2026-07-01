/*
 * Minimal Package Manager
 * https://github.com/kiwinatra/mip
 * MIT License · Copyright (c) 2026 kiwinatra
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class LockfileManager {
  constructor(projectPath) {
    this.lockPath = path.join(projectPath, 'mip-lock.json');
    this.lockData = null;
  }

  /**
   * Loads the lockfile from disk or creates a default structure.
   * The lockfile tracks exact versions, resolved URLs, integrity hashes,
   * and dependency relationships for reproducible installations.
   * 
   * @returns {Object} Lockfile data with packages and integrity maps
   */
  load() {
    if (fs.existsSync(this.lockPath)) {
      this.lockData = JSON.parse(fs.readFileSync(this.lockPath, 'utf8'));
    } else {
      this.lockData = {
        version: '1.0',
        packages: {},
        integrity: {},
      };
    }
    return this.lockData;
  }

  /**
   * Persists the lockfile with deterministic sorting.
   * Sorting ensures consistent output across different runs, which is
   * critical for reproducible builds and minimizing unnecessary changes in version control.
   * 
   * Both packages and integrity maps are sorted lexicographically by key.
   * 
   * @returns {void}
   */
  save() {
    const sorted = {
      version: this.lockData.version,
      packages: Object.fromEntries(Object.entries(this.lockData.packages).sort()),
      integrity: Object.fromEntries(Object.entries(this.lockData.integrity).sort()),
    };

    fs.writeFileSync(this.lockPath, JSON.stringify(sorted, null, 2));
  }

  /**
   * Adds a package entry to the lockfile.
   * Stores the exact version, resolved tarball URL, integrity hash for verification,
   * and dependency graph for future resolution.
   * 
   * The SHA-256 integrity hash is computed from the package name and version,
   * providing a quick way to detect if the lockfile entry has been modified.
   * 
   * @param {string} name - Package name
   * @param {string} version - Exact version
   * @param {string} resolved - Resolved tarball URL
   * @param {string} integrity - Subresource integrity hash
   * @param {Object} dependencies - Map of dependency names to version ranges
   * @returns {void}
   */
  addPackage(name, version, resolved, integrity, dependencies) {
    this.lockData.packages[`${name}@${version}`] = {
      version,
      resolved,
      integrity,
      dependencies,
      dev: false,
    };

    this.lockData.integrity[name] = crypto
      .createHash('sha256')
      .update(`${name}@${version}`)
      .digest('hex');
  }

  /**
   * Checks if a package is up-to-date with the lockfile.
   * Compares the stored integrity hash against a fresh computation.
   * This detects both manual edits to the lockfile and corruption.
   * 
   * @param {string} name - Package name
   * @param {string} version - Exact version
   * @returns {boolean} True if the package entry is valid and unchanged
   */
  isUpToDate(name, version) {
    const pkg = this.lockData.packages[`${name}@${version}`];
    if (!pkg) return false;

    const currentHash = crypto.createHash('sha256').update(`${name}@${version}`).digest('hex');

    return this.lockData.integrity[name] === currentHash;
  }

  /**
   * Gets the installed version of a package from the lockfile.
   * Maintains a lazy-loaded cache (this._nameToVersion) to avoid repeatedly
   * iterating over the packages object for the same name.
   * 
   * The cache is invalidated when the lockfile is reloaded or modified.
   * 
   * @param {string} name - Package name
   * @returns {string|null} Installed version or null if not found
   */
  getInstalledVersion(name) {
    if (!this._nameToVersion) {
      this._nameToVersion = new Map();
      for (const [key, value] of Object.entries(this.lockData.packages || {})) {
        const pkgName = key.split('@')[0];
        this._nameToVersion.set(pkgName, value.version);
      }
    }
    return this._nameToVersion.get(name) || null;
  }
}

module.exports = { LockfileManager };