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
const { getPackageInfo } = require('../utils/registry');

class DependencyResolver {
  constructor() {
    this.resolved = new Map(); // кеш разрешенных версий
    this.graph = new Map(); // граф зависимостей
  }

  // Разрешить версию (^1.2.3, ~1.2.3, >=1.2.3)
  async resolveVersion(name, versionRange, parent = null) {
    const key = `${name}@${versionRange}`;

    if (this.resolved.has(key)) {
      return this.resolved.get(key);
    }

    // Кэшируем сортированный список версий на имя пакета, чтобы не сортировать каждый вызов.
    if (!this.versionsSortedCache) this.versionsSortedCache = new Map();

    let pkgInfo;
    let versionsSorted;

    if (this.versionsSortedCache.has(name)) {
      versionsSorted = this.versionsSortedCache.get(name);
      // pkgInfo нужен, чтобы получить зависимости конкретной версии.
      pkgInfo = await getPackageInfo(name, 'latest');
    } else {
      // Получаем все версии пакета
      pkgInfo = await getPackageInfo(name, 'latest');
      versionsSorted = Object.keys(pkgInfo.versions);
      versionsSorted.sort(semver.rcompare);
      this.versionsSortedCache.set(name, versionsSorted);
    }

    // Находим подходящую версию
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

    // Параллелим разрешение зависимостей батчами с лимитом, чтобы не было узкого места по await.
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

  // Построение графа для дедупликации
  addToGraph(parent, child, childInfo) {
    if (!this.graph.has(parent)) {
      this.graph.set(parent, []);
    }
    this.graph.get(parent).push({ name: child, info: childInfo });
  }

  // Дедупликация зависимостей (pnpm-style)
  deduplicate() {
    const uniqueDeps = new Map();
    const conflicts = [];

    for (const [name, info] of this.resolved) {
      const [pkgName] = name.split('@');
      const existing = uniqueDeps.get(pkgName);

      if (!existing) {
        uniqueDeps.set(pkgName, info);
      } else if (existing.version !== info.version) {
        // Версии конфликтуют - нужно установить обе
        conflicts.push({ name: pkgName, versions: [existing.version, info.version] });
      }
    }

    return { unique: Array.from(uniqueDeps.values()), conflicts };
  }
}

module.exports = { DependencyResolver };
