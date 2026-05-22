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

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class LockfileManager {
  constructor(projectPath) {
    this.lockPath = path.join(projectPath, 'mip-lock.json');
    this.lockData = null;
  }
  
  load() {
    if (fs.existsSync(this.lockPath)) {
      this.lockData = JSON.parse(fs.readFileSync(this.lockPath, 'utf8'));
    } else {
      this.lockData = {
        version: '1.0',
        packages: {},
        integrity: {}
      };
    }
    return this.lockData;
  }
  
  save() {
    // Сортируем для детерминированности
    const sorted = {
      version: this.lockData.version,
      packages: Object.fromEntries(
        Object.entries(this.lockData.packages).sort()
      ),
      integrity: Object.fromEntries(
        Object.entries(this.lockData.integrity).sort()
      )
    };
    
    fs.writeFileSync(this.lockPath, JSON.stringify(sorted, null, 2));
  }
  
  addPackage(name, version, resolved, integrity, dependencies) {
    this.lockData.packages[`${name}@${version}`] = {
      version,
      resolved,
      integrity,
      dependencies,
      dev: false
    };
    
    // Хеш для проверки целостности
    this.lockData.integrity[name] = crypto
      .createHash('sha256')
      .update(`${name}@${version}`)
      .digest('hex');
  }
  
  isUpToDate(name, version) {
    const pkg = this.lockData.packages[`${name}@${version}`];
    if (!pkg) return false;
    
    // Проверяем целостность
    const currentHash = crypto
      .createHash('sha256')
      .update(`${name}@${version}`)
      .digest('hex');
      
    return this.lockData.integrity[name] === currentHash;
  }
  
  getInstalledVersion(name) {
    if (!this._nameToVersion) {
      this._nameToVersion = new Map();
      for (const [key, value] of Object.entries(this.lockData.packages || {})) {
        // ключ хранится как "name@version"; версию возвращаем из value.version
        const pkgName = key.split('@')[0];
        this._nameToVersion.set(pkgName, value.version);
      }
    }
    return this._nameToVersion.get(name) || null;
  }

}



module.exports = { LockfileManager };

