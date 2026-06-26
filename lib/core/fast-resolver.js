/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                                                                     │
 * │   ███╗   ███╗██╗██████╗                                             │
 * │   ████╗ ████║██║██╔══██╗                                            │
 * │   ██╔████╔██║██║██████╔╝                                            │
 * │   ██║╚██╔╝██║██║██╔═══╝                                             │
 * │   ██║ ╚═╝ ██║██║██║                                                 │
 * │   ╚═╝     ╚═╝╚═╝╚═╝                                                 │
 * │                                                                     │
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │                                                                     │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * │                                                                     │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const semver = require('semver');
const { SuperCache } = require('./super-cache');

class FastResolver {
  constructor() {
    this.cache = new SuperCache({ maxMemoryItems: 500 });
    this.resolved = new Map();
  }

  async resolveVersion(name, versionRange) {
    const cacheKey = `${name}@${versionRange}`;

    // Быстрая проверка кеша
    const cached = await this.cache.get(name, versionRange);
    if (cached) {
      return cached;
    }

    // Загружаем метаданные пакета
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

    // Сохраняем в кеш
    await this.cache.set(name, versionRange, result);

    return result;
  }

  async fetchPackageInfo(name) {
    const axios = require('axios');
    const url = `https://registry.npmjs.org/${name}`;

    const response = await axios.get(url, {
      timeout: 5000,
      headers: { 'Accept-Encoding': 'gzip' },
    });

    return response.data;
  }

  async resolveTree(packages) {
    const resolved = [];

    for (const [name, range] of Object.entries(packages)) {
      const resolvedPkg = await this.resolveVersion(name, range);
      resolved.push(resolvedPkg);

      // Рекурсивно разрешаем зависимости
      if (Object.keys(resolvedPkg.dependencies).length > 0) {
        const subDeps = await this.resolveTree(resolvedPkg.dependencies);
        resolved.push(...subDeps);
      }
    }

    // Дедупликация (убираем дубликаты)
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
