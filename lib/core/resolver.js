const semver = require('semver');
const { getPackageInfo } = require('../utils/registry');

class DependencyResolver {
  constructor() {
    this.resolved = new Map(); // кеш разрешенных версий
    this.graph = new Map();    // граф зависимостей
  }
  
  // Разрешить версию (^1.2.3, ~1.2.3, >=1.2.3)
  async resolveVersion(name, versionRange, parent = null) {
    const key = `${name}@${versionRange}`;
    
    if (this.resolved.has(key)) {
      return this.resolved.get(key);
    }
    
    // Получаем все версии пакета
    const pkgInfo = await getPackageInfo(name, 'latest');
    const versions = Object.keys(pkgInfo.versions).sort(semver.rcompare);
    
    // Находим подходящую версию
    let resolvedVersion = null;
    
    if (versionRange === 'latest') {
      resolvedVersion = versions[0];
    } else if (semver.valid(versionRange)) {
      resolvedVersion = versions.find(v => v === versionRange);
    } else {
      resolvedVersion = semver.maxSatisfying(versions, versionRange);
    }
    
    if (!resolvedVersion) {
      throw new Error(`No version matching ${versionRange} found for ${name}`);
    }
    
    const result = {
      name,
      version: resolvedVersion,
      originalRange: versionRange,
      dependencies: pkgInfo.versions[resolvedVersion].dependencies || {}
    };
    
    this.resolved.set(key, result);
    
    // Рекурсивно разрешаем зависимости (с учетом дедупликации)
    for (const [depName, depRange] of Object.entries(result.dependencies)) {
      const depResult = await this.resolveVersion(depName, depRange, name);
      this.addToGraph(name, depName, depResult);
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