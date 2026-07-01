/*
 * Minimal Package Manager
 * https://github.com/kiwinatra/mip
 * MIT License · Copyright (c) 2026 kiwinatra
 */

const fs = require('fs');
const path = require('path');
const semver = require('semver');
const yaml = require('js-yaml');

class Deduplicator {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.yamlLockPath = path.join(projectPath, 'mip-lock.yml');
    this.jsonLockPath = path.join(projectPath, 'mip-lock.json');
    this.mipDir = path.join(projectPath, '.mip');
  }

  /**
   * Loads the lockfile with YAML priority over JSON.
   * YAML is preferred because it's more human-readable for version control diffs,
   * but JSON is kept for backward compatibility with older mip versions.
   * 
   * @returns {Object|null} Parsed lockfile or null if not found
   */
  loadLockfile() {
    if (fs.existsSync(this.yamlLockPath)) {
      try {
        return yaml.load(fs.readFileSync(this.yamlLockPath, 'utf8'));
      } catch {
        // YAML parse failure triggers fallback to JSON
      }
    }

    if (fs.existsSync(this.jsonLockPath)) {
      try {
        return JSON.parse(fs.readFileSync(this.jsonLockPath, 'utf8'));
      } catch {
        // JSON parse failure returns null
      }
    }

    return null;
  }

  /**
   * Persists lockfile in YAML format unconditionally, and in JSON format
   * only if a JSON lockfile already exists (for backward compatibility).
   * 
   * This dual-write strategy prevents breaking existing tooling that expects
   * mip-lock.json while gradually migrating users to the more readable YAML format.
   * 
   * @param {Object} lockData - Complete lockfile structure
   * @returns {void}
   */
  saveLockfile(lockData) {
    fs.writeFileSync(this.yamlLockPath, yaml.dump(lockData, { indent: 2 }));
    
    if (fs.existsSync(this.jsonLockPath)) {
      fs.writeFileSync(this.jsonLockPath, JSON.stringify(lockData, null, 2));
    }
  }

  /**
   * Analyzes the lockfile to identify duplicate package versions.
   * Groups packages by name, then within each group selects the highest
   * version as the "kept" version and flags lower versions as duplicates.
   * 
   * @returns {Object} Analysis results with duplicates, version mapping, and total count
   * @throws {Error} When lockfile doesn't exist
   */
  analyze() {
    const lockData = this.loadLockfile();
    if (!lockData) {
      throw new Error('Lockfile not found. Run mip install first');
    }

    const packages = lockData.packages || {};

    const groups = new Map();

    for (const [fullName, info] of Object.entries(packages)) {
      const name = fullName.split('@')[0];
      if (!groups.has(name)) {
        groups.set(name, []);
      }
      groups.get(name).push({
        fullName,
        version: info.version,
        path: info.installPath,
        dependencies: info.dependencies || {},
      });
    }

    const duplicates = [];
    const toKeep = new Map();

    for (const [name, versions] of groups) {
      if (versions.length > 1) {
        versions.sort((a, b) => semver.rcompare(a.version, b.version));

        const keepVersion = versions[0];
        toKeep.set(name, keepVersion);

        const removeVersions = versions.slice(1);

        if (removeVersions.length > 0) {
          duplicates.push({
            name,
            keep: keepVersion,
            remove: removeVersions,
          });
        }
      }
    }

    return { duplicates, toKeep, totalPackages: Object.keys(packages).length };
  }

  /**
   * Checks which duplicate versions are compatible for deduplication.
   * Compatible = same major version (guarantees API compatibility per semver).
   * Incompatible = different major versions (likely breaking changes).
   * 
   * @param {Object} duplicate - Duplicate group from analyze()
   * @returns {Object} Split of compatible and incompatible versions
   */
  checkCompatibility(duplicate) {
    const compatible = [];
    const incompatible = [];

    for (const remove of duplicate.remove) {
      const keepMajor = semver.major(duplicate.keep.version);
      const removeMajor = semver.major(remove.version);

      if (keepMajor === removeMajor) {
        compatible.push(remove);
      } else {
        incompatible.push(remove);
      }
    }

    return { compatible, incompatible };
  }

  /**
   * Generates a human-readable report of duplicate packages.
   * Warns about incompatible versions that must be kept separately.
   * 
   * @param {Array<Object>} duplicates - Duplicate groups from analyze()
   * @returns {string} Formatted report
   */
  formatReport(duplicates) {
    let report = '\n📊 Duplicate packages found:\n\n';

    for (const dup of duplicates) {
      const { compatible, incompatible } = this.checkCompatibility(dup);

      report += `  📦 ${dup.name}\n`;
      report += `     ✅ Keeping: ${dup.keep.version}\n`;

      if (compatible.length > 0) {
        report += '     🔄 Compatible (can dedupe):\n';
        for (const remove of compatible) {
          report += `        - ${remove.version}\n`;
        }
      }

      if (incompatible.length > 0) {
        report += '     ⚠️  Incompatible (keep both):\n';
        for (const remove of incompatible) {
          report += `        - ${remove.version}\n`;
        }
      }
      report += '\n';
    }

    return report;
  }

  /**
   * Performs deduplication by removing redundant package versions.
   * When compatibleOnly=true (default), only removes versions with the same major
   * version as the kept version. This is safe because semver guarantees no breaking
   * changes within the same major version.
   * 
   * When compatibleOnly=false, removes ALL duplicate versions including
   * those with different major versions. This can break applications if those
   * packages have actual API incompatibilities.
   * 
   * @param {boolean} [compatibleOnly=true] - Whether to skip incompatible versions
   * @returns {Promise<Object>} Result with removal statistics
   */
  async dedupe(compatibleOnly = true) {
    const { duplicates, toKeep, totalPackages } = this.analyze();

    if (duplicates.length === 0) {
      return { success: true, removedCount: 0, message: 'No duplicates found' };
    }

    let removedCount = 0;
    const removed = [];
    const lockData = this.loadLockfile();

    if (!lockData) {
      throw new Error('Lockfile not found');
    }

    for (const dup of duplicates) {
      const { compatible, incompatible } = this.checkCompatibility(dup);
      const toRemove = compatibleOnly ? compatible : [...compatible, ...incompatible];

      for (const remove of toRemove) {
        const removePath = path.join(this.mipDir, dup.name, remove.version);
        if (fs.existsSync(removePath)) {
          fs.rmSync(removePath, { recursive: true, force: true });
          removedCount++;
          removed.push({
            name: dup.name,
            version: remove.version,
            keptVersion: dup.keep.version,
          });
        }

        const key = `${dup.name}@${remove.version}`;
        if (lockData.packages && lockData.packages[key]) {
          delete lockData.packages[key];
        }
      }
    }

    this.saveLockfile(lockData);

    return {
      success: true,
      removedCount,
      removed,
      totalPackages,
      remainingPackages: totalPackages - removedCount,
    };
  }

  /**
   * Safe deduplication: only removes versions with same major version.
   * Recommended for production use.
   * 
   * @returns {Promise<Object>} Deduplication result
   */
  quickDedupe() {
    return this.dedupe(true);
  }

  /**
   * Aggressive deduplication: removes all duplicate versions regardless of major.
   * Use with caution as it may break applications with incompatible versions.
   * 
   * @returns {Promise<Object>} Deduplication result
   */
  fullDedupe() {
    return this.dedupe(false);
  }
}

module.exports = { Deduplicator };