const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class LegacyFallback {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.mipDir = path.join(projectPath, '.mip');
    this.nodeModulesDir = path.join(projectPath, 'node_modules');
  }

  // Проверить, нужен ли фоллбек для пакета
  needsFallback(packageName) {
    const mipPath = this.findInMip(packageName);
    if (mipPath) {
      return false;
    }
    
    const nodeModulesPath = this.findInNodeModules(packageName);
    return nodeModulesPath !== null;
  }

  // Найти пакет в .mip
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

  // Найти пакет в node_modules
  findInNodeModules(packageName) {
    const packagePath = path.join(this.nodeModulesDir, packageName);
    if (fs.existsSync(packagePath)) {
      return packagePath;
    }
    return null;
  }

  // Получить путь к пакету (с фоллбеком)
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

  // Эмулировать node_modules для старых пакетов
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

  // Эмулировать все зависимости для пакета
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

  // Получить информацию о пакете
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

  // Проверить, является ли пакет legacy (использует старый require)
  isLegacyPackage(packageName) {
    const pkgInfo = this.getPackageInfo(packageName);
    if (!pkgInfo) {
      return false;
    }
    
    // Проверяем признаки legacy пакета
    const hasOldExports = !pkgInfo.exports;
    const usesOldMain = pkgInfo.main && pkgInfo.main === 'index.js';
    const hasNoTypeField = !pkgInfo.type;
    
    return hasOldExports && (usesOldMain || hasNoTypeField);
  }

  // Очистить эмулированную структуру
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