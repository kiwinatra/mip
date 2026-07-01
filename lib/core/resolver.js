/*
 * Minimal Package Manager
 * https://github.com/kiwinatra/mip
 * MIT License · Copyright (c) 2026 kiwinatra
 */

const semver = require('semver');
const { getPackageInfo } = require('../utils/registry');

class DependencyResolver {
  constructor() {
    this.resolved = new Map();
    this.graph = new Map();
  }

  /**
   * Resolves a package version and its transitive dependencies.
   * Uses two-level caching:
   * 1. `this.resolved` - caches resolved package info by `name@versionRange`
   * 2. `this.versionsSortedCache` - caches sorted version lists per package
   * 
   * Dependency resolution is parallelized with a concurrency limit to prevent
   * overwhelming the registry API. The concurrency is set to half of available
   * CPU cores (minimum 2) to balance speed with network load.
   * 
   * The recursion is depth-first but parallelized at each level, allowing
   * different branches of the dependency tree to resolve concurrently.
   * 
   * @param {string} name - Package name
   * @param {string} versionRange - Semver range, 'latest', or exact version
   * @param {string|null} parent - Parent package name (for graph construction)
   * @returns {Promise<Object>} Resolved package with name, version, originalRange, dependencies
   * @throws {Error} When no matching version is found
   */
  async resolveVersion(name, versionRange, parent = null) {
    const key = `${name}@${versionRange}`;

    if (this.resolved.has(key)) {
      return this.resolved.get(key);
    }

    if (!this.versionsSortedCache) this.versionsSortedCache = new Map();

    let pkgInfo;
    let versionsSorted;

    if (this.versionsSortedCache.has(name)) {
      versionsSorted = this.versionsSortedCache.get(name);
      pkgInfo = await getPackageInfo(name, 'latest');
    } else {
      pkgInfo = await getPackageInfo(name, 'latest');
      versionsSorted = Object.keys(pkgInfo.versions);
      versionsSorted.sort(semver.rcompare);
      this.versionsSortedCache.set(name, versionsSorted);
    }

    let resolvedVersion = null;
    if (versionRange === 'latest') {
      resolvedVersion = versionsSorted[0];
    } else if (semver.valid(versionRange)) {
      resolvedVersion = versionsSorted.find(v => v === versionRange);
    } else {
      resolvedVersion = semver.maxSatisfying(versionsSorted, versionRange);
    }

    if (!resolvedVersion) {
      throw new Error(`No version matching ${versionRange} found for ${name}`);
    }

    const result = {
      name,
      version: resolvedVersion,
      originalRange: versionRange,
      dependencies: pkgInfo.versions[resolvedVersion].dependencies || {},
    };

    this.resolved.set(key, result);

    const deps = Object.entries(result.dependencies);
    if (deps.length > 0) {
      const os = require('os');
      const concurrency = Math.max(2, Math.floor((os.cpus()?.length || 2) / 2));

      const inFlight = new Set();

      const launch = async () => {
        const depToResolve = deps.shift();
        if (!depToResolve) return;
        const [depName, depRange] = depToResolve;
        const depResult = await this.resolveVersion(depName, depRange, name);
        this.addToGraph(name, depName, depResult);
      };

      while (deps.length > 0 || inFlight.size > 0) {
        while (deps.length > 0 && inFlight.size < concurrency) {
          const p = launch().finally(() => inFlight.delete(p));
          inFlight.add(p);
        }
        if (inFlight.size > 0) {
          await Promise.race(inFlight);
        }
      }
    }

    return result;
  }

  /**
   * Adds an edge to the dependency graph.
   * The graph maps parent package names to arrays of child dependencies.
   * Used for deduplication analysis and conflict detection.
   * 
   * @param {string} parent - Parent package name
   * @param {string} child - Child package name
   * @param {Object} childInfo - Resolved child package info
   * @returns {void}
   */
  addToGraph(parent, child, childInfo) {
    if (!this.graph.has(parent)) {
      this.graph.set(parent, []);
    }
    this.graph.get(parent).push({ name: child, info: childInfo });
  }

  /**
   * Deduplicates resolved dependencies using a pnpm-style approach.
   * Identifies packages with multiple versions and reports them as conflicts.
   * 
   * Unlike npm/yarn, this implementation does not automatically merge
   * incompatible versions - it reports conflicts for the caller to resolve.
   * 
   * @returns {Object} Object with unique dependencies and conflicts array
   */
  deduplicate() {
    const uniqueDeps = new Map();
    const conflicts = [];

    for (const [name, info] of this.resolved) {
      const [pkgName] = name.split('@');
      const existing = uniqueDeps.get(pkgName);

      if (!existing) {
        uniqueDeps.set(pkgName, info);
      } else if (existing.version !== info.version) {
        conflicts.push({ name: pkgName, versions: [existing.version, info.version] });
      }
    }

    return { unique: Array.from(uniqueDeps.values()), conflicts };
  }
}

module.exports = { DependencyResolver };