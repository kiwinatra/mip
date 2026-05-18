// Умная дедупликация как в pnpm

class Deduplicator {
  constructor(lockData) {
    this.lockData = lockData;
    this.uniqueMap = new Map(); // пакет -> лучшая версия
    this.duplicates = []; // дубликаты для удаления
  }
  
  analyze() {
    // Группируем все пакеты по имени
    const packagesByName = new Map();
    
    for (const [fullName, info] of Object.entries(this.lockData.packages || {})) {
      const name = fullName.split('@')[0];
      if (!packagesByName.has(name)) {
        packagesByName.set(name, []);
      }
      packagesByName.get(name).push({
        fullName,
        version: info.version,
        info
      });
    }
    
    // Находим лучшую (самую новую) версию для каждого пакета
    for (const [name, versions] of packagesByName) {
      if (versions.length > 1) {
        const bestVersion = versions.reduce((best, current) => {
          return this.isNewerVersion(current.version, best.version) ? current : best;
        });
        
        this.uniqueMap.set(name, bestVersion);
        const duplicates = versions.filter(v => v !== bestVersion);
        
        if (duplicates.length > 0) {
          this.duplicates.push({
            name,
            keep: bestVersion,
            remove: duplicates.map(d => ({ version: d.version, from: this.findDependents(name, d.version) }))
          });
        }
      } else if (versions.length === 1) {
        this.uniqueMap.set(name, versions[0]);
      }
    }
    
    return {
      unique: Array.from(this.uniqueMap.values()),
      duplicates: this.duplicates
    };
  }
  
  isNewerVersion(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const num1 = parts1[i] || 0;
      const num2 = parts2[i] || 0;
      if (num1 !== num2) return num1 > num2;
    }
    return false;
  }
  
  findDependents(packageName, version) {
    const dependents = [];
    
    for (const [fullName, info] of Object.entries(this.lockData.packages || {})) {
      if (info.dependencies && info.dependencies[packageName] === version) {
        dependents.push(fullName);
      }
    }
    
    return dependents;
  }
  
  async deduplicate(installFunction) {
    const analysis = this.analyze();
    
    if (analysis.duplicates.length === 0) {
      console.log('✨ No duplicates found');
      return;
    }
    
    console.log(`\n📊 Found ${analysis.duplicates.length} duplicate packages:\n`);
    
    for (const dup of analysis.duplicates) {
      console.log(`  📦 ${dup.name}`);
      console.log(`     ✅ Keeping: ${dup.keep.version}`);
      console.log(`     ❌ Removing:`);
      dup.remove.forEach(r => {
        console.log(`        - ${r.version} (used by: ${r.from.join(', ') || 'root'})`);
      });
      console.log('');
    }
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise((resolve) => {
      readline.question('Deduplicate? (y/N): ', async (answer) => {
        if (answer.toLowerCase() === 'y') {
          console.log('\n🔄 Deduplicating...\n');
          
          // Переустанавливаем уникальные версии
          for (const pkg of analysis.unique) {
            if (pkg.info) {
              await installFunction(pkg.fullName.split('@')[0], pkg.version);
            }
          }
          
          console.log('\n✅ Deduplication complete!');
          resolve(true);
        } else {
          console.log('\n❌ Deduplication cancelled');
          resolve(false);
        }
        readline.close();
      });
    });
  }
}

module.exports = { Deduplicator };