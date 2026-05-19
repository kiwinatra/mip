const fs = require('fs');
const path = require('path');

class ExportsResolver {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.mipDir = path.join(projectPath, '.mip');
  }

  // Основной метод резолва
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

    // Если нет exports — используем старый способ
    if (!exportsConfig) {
      return this.fallbackResolve(packagePath, subpath, packageJson);
    }

    // Есть exports — резолвим по правилам
    return this.resolveExports(exportsConfig, subpath, packagePath, packageJson);
  }

  // Найти путь к установленному пакету
  findPackagePath(packageName) {
    const packageDir = path.join(this.mipDir, packageName);
    if (!fs.existsSync(packageDir)) {
      return null;
    }

    // Ищем последнюю установленную версию
    const versions = fs.readdirSync(packageDir).filter(v => {
      return fs.statSync(path.join(packageDir, v)).isDirectory();
    });

    if (versions.length === 0) {
      return null;
    }

    // Берем самую новую версию
    const latestVersion = versions.sort((a, b) => {
      return b.localeCompare(a);
    })[0];

    return path.join(packageDir, latestVersion);
  }

  // Резолв exports по спецификации Node.js
  resolveExports(exportsConfig, subpath, packagePath, packageJson) {
    // Если exports — строка
    if (typeof exportsConfig === 'string') {
      return path.join(packagePath, exportsConfig);
    }

    // Если exports — объект
    if (typeof exportsConfig === 'object') {
      // Условия для разных сред
      const conditions = ['node', 'require', 'import', 'default'];
      
      for (const condition of conditions) {
        if (exportsConfig[condition]) {
          const resolved = this.resolveExportPath(exportsConfig[condition], subpath, packagePath);
          if (resolved && fs.existsSync(resolved)) {
            return resolved;
          }
        }
      }

      // Прямой subpath
      if (exportsConfig[subpath]) {
        return this.resolveExportPath(exportsConfig[subpath], subpath, packagePath);
      }

      // Wildcard subpath (./*)
      if (exportsConfig['./*']) {
        const wildcardPath = subpath.replace(/^\.\//, '');
        return this.resolveExportPath(exportsConfig['./*'], wildcardPath, packagePath);
      }
    }

    return this.fallbackResolve(packagePath, subpath, packageJson);
  }

  resolveExportPath(exportPath, subpath, packagePath) {
    if (typeof exportPath === 'string') {
      let finalPath = exportPath;
      
      // Замена * на subpath
      if (finalPath.includes('*') && subpath !== '.') {
        finalPath = finalPath.replace('*', subpath);
      }
      
      return path.join(packagePath, finalPath);
    }
    
    if (typeof exportPath === 'object') {
      // Рекурсивно резолвим вложенные условия
      return this.resolveExports(exportPath, subpath, packagePath, {});
    }
    
    return null;
  }

  // Fallback для старых пакетов
  fallbackResolve(packagePath, subpath, packageJson) {
    // Если subpath — точка, берем main
    if (subpath === '.' || subpath === '') {
      const main = packageJson.main || 'index.js';
      return path.join(packagePath, main);
    }

    // Иначе прямой путь
    return path.join(packagePath, subpath);
  }

  // Получить все экспортируемые пути
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
      // Нет exports — возвращаем main + index
      const paths = [];
      if (packageJson.main) {
        paths.push(packageJson.main);
      }
      paths.push('index.js');
      paths.push('index.cjs');
      paths.push('index.mjs');
      return paths;
    }

    // Собираем все пути из exports
    const paths = [];
    for (const key of Object.keys(exportsConfig)) {
      if (key !== 'node' && key !== 'require' && key !== 'import' && key !== 'default') {
        paths.push(key);
      }
    }
    
    return paths;
  }

  // Проверить, существует ли экспортируемый путь
  hasExport(packageName, subpath) {
    const resolved = this.resolve(packageName, subpath);
    return resolved && fs.existsSync(resolved);
  }
}

module.exports = { ExportsResolver };