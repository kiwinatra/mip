/*
 * Minimal Package Manager
 * https://github.com/kiwinatra/mip
 * MIT License · Copyright (c) 2026 kiwinatra
 */

const semver = require('semver');
const { SuperCache } = require('./super-cache');

class FastResolver {
  constructor() {
    this.cache = new SuperCache({ maxMemoryItems: 500 });
    this.resolved = new Map();
  }

  /**
   * Resolves a package name and version range to a specific version.
   * Uses a two-level caching strategy:
   * 1. In-memory SuperCache for fast repeated lookups
   * 2. Resolved Map for session-level deduplication
   * 
   * The cache key format `name@versionRange` allows different ranges
   * for the same package to be cached separately (e.g., '^1.0.0' vs '~1.2.3').
   * 
   * @param {string} name - Package name
   * @param {string} versionRange - Semver range or 'latest'
   * @returns {Promise<Object>} Resolved package information with version and dependencies
   * @throws {Error} When no matching version is found
   */
  async resolveVersion(name, versionRange) {
    const cacheKey = `${name}@${versionRange}`;

    const cached = await this.cache.get(name, versionRange);
    if (cached) {
      return cached;
    }

    const pkgInfo = await this.fetchPackageInfo(name);
    const versions = Object.keys(pkgInfo.versions).sort(semver.rcompare);

    let targetVersion;

    if (versionRange === 'latest') {
      targetVersion = pkgInfo['dist-tags'].latest;
    } else if (semver.valid(versionRange)) {
      targetVersion = versionRange;
    } else {
      targetVersion = semver.maxSatisfying(versions, versionRange);
    }

    if (!targetVersion) {
      throw new Error(`No version matching ${versionRange} for ${name}`);
    }

    const result = {
      name,
      version: targetVersion,
      originalRange: versionRange,
      tarball: pkgInfo.versions[targetVersion].dist.tarball,
      dependencies: pkgInfo.versions[targetVersion].dependencies || {},
    };

    await this.cache.set(name, versionRange, result);

    return result;
  }

  /**
   * Fetches package metadata from the npm registry.
   * Uses gzip compression to reduce bandwidth for large package manifests.
   * 
   * @param {string} name - Package name
   * @returns {Promise<Object>} Full package metadata from registry
   */
  async fetchPackageInfo(name) {
    const axios = require('axios');
    const url = `https://registry.npmjs.org/${name}`;

    const response = await axios.get(url, {
      timeout: 5000,
      headers: { 'Accept-Encoding': 'gzip' },
    });

    return response.data;
  }

  /**
   * Recursively resolves a tree of dependencies.
   * Uses depth-first traversal to resolve all transitive dependencies.
   * 
   * The recursion is necessary because dependencies themselves have
   * dependencies, potentially forming a graph of arbitrary depth.
   * 
   * Deduplication occurs at the end to remove duplicate package versions
   * that were resolved multiple times from different branches of the tree.
   * 
   * @param {Object} packages - Map of package names to version ranges
   * @returns {Promise<Array<Object>>} Flattened list of resolved packages
   */
  async resolveTree(packages) {
    const resolved = [];

    for (const [name, range] of Object.entries(packages)) {
      const resolvedPkg = await this.resolveVersion(name, range);
      resolved.push(resolvedPkg);

      if (Object.keys(resolvedPkg.dependencies).length > 0) {
        const subDeps = await this.resolveTree(resolvedPkg.dependencies);
        resolved.push(...subDeps);
      }
    }

    const unique = new Map();
    for (const pkg of resolved) {
      const key = `${pkg.name}@${pkg.version}`;
      if (!unique.has(key)) {
        unique.set(key, pkg);
      }
    }

    return Array.from(unique.values());
  }
}

module.exports = { FastResolver };