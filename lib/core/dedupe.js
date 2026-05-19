const fs = require('fs');
const path = require('path');
const semver = require('semver');

class Deduplicator {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.lockPath = path.join(projectPath, 'mip-lock.json');
    this.mipDir = path.join(projectPath, '.mip');
  }

  analyze() {
    if (!fs.existsSync(this.lockPath)) {
      throw new Error('Lockfile not found. Run mip install first');
    }

    const lockData = JSON.parse(fs.readFileSync(this.lockPath, 'utf8'));
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
        dependencies: info.dependencies || {}
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
            remove: removeVersions
          });
        }
      }
    }
    
    return { duplicates, toKeep, totalPackages: Object.keys(packages).length };
  }

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

  formatReport(duplicates) {
    let report = '\n📊 Duplicate packages found:\n\n';
    
    for (const dup of duplicates) {
      const { compatible, incompatible } = this.checkCompatibility(dup);
      
      report += `  📦 ${dup.name}\n`;
      report += `     ✅ Keeping: ${dup.keep.version}\n`;
      
      if (compatible.length > 0) {
        report += `     🔄 Compatible (can dedupe):\n`;
        for (const remove of compatible) {
          report += `        - ${remove.version}\n`;
        }
      }
      
      if (incompatible.length > 0) {
        report += `     ⚠️  Incompatible (keep both):\n`;
        for (const remove of incompatible) {
          report += `        - ${remove.version}\n`;
        }
      }
      report += '\n';
    }
    
    return report;
  }

  async dedupe(compatibleOnly = true) {
    const { duplicates, toKeep, totalPackages } = this.analyze();
    
    if (duplicates.length === 0) {
      return { success: true, removedCount: 0, message: 'No duplicates found' };
    }
    
    let removedCount = 0;
    const removed = [];
    let lockData = JSON.parse(fs.readFileSync(this.lockPath, 'utf8'));
    
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
            keptVersion: dup.keep.version
          });
        }
        
        const key = `${dup.name}@${remove.version}`;
        if (lockData.packages && lockData.packages[key]) {
          delete lockData.packages[key];
        }
      }
    }
    
    fs.writeFileSync(this.lockPath, JSON.stringify(lockData, null, 2));
    
    return {
      success: true,
      removedCount,
      removed,
      totalPackages,
      remainingPackages: totalPackages - removedCount
    };
  }

  quickDedupe() {
    return this.dedupe(true);
  }

  fullDedupe() {
    return this.dedupe(false);
  }
}

module.exports = { Deduplicator };