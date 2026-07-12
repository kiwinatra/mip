/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const loader = require('../loader');
const config = require('../utils/config');
const features = require('../utils/features');

function link(packageName) {
  const mipFeatures = features.loadFeatures(process.cwd());
  
  // Проверка включена ли команда
  if (mipFeatures['link.enabled'] === false) {
    console.log('ℹ️ Link command is disabled (link.enabled: false)');
    return;
  }

  // Проверка interactive
  if (mipFeatures['interactive.promptOnLink'] !== false) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = new Promise(resolve => {
      const action = packageName ? `link "${packageName}"` : 'create global link from current project';
      rl.question(`🔗 ${action}? (Y/n) `, resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') {
      console.log('❌ Cancelled');
      return;
    }
  }

  const globalLinkDir = mipFeatures['link.globalDir'] || path.join(os.homedir(), '.mip-links');

  if (!packageName) {
    // Создаем ссылку из текущего пакета
    const cfg = config.detectConfig(process.cwd());
    if (!cfg) {
      console.log('❌ No config file found (mip.yml, mip.json, or package.json)');
      console.log('💡 Run "mip init" first');
      return;
    }

    const pkg = config.readConfig(process.cwd());
    if (!pkg) {
      console.log('❌ Failed to read config');
      return;
    }

    const linkPath = path.join(globalLinkDir, pkg.name);

    fs.mkdirSync(globalLinkDir, { recursive: true });

    if (fs.existsSync(linkPath)) {
      if (mipFeatures['link.overwrite'] !== false) {
        fs.unlinkSync(linkPath);
      } else {
        console.log(`⚠️ Link already exists: ${pkg.name}`);
        console.log('💡 Use link.overwrite: true to overwrite');
        return;
      }
    }

    fs.symlinkSync(process.cwd(), linkPath, 'junction');
    console.log(`✅ Created global link: ${pkg.name} -> ${process.cwd()}`);
    return;
  }

  // Проверка на запрещенные имена
  const reserved = mipFeatures['link.reservedNames'] || ['npm', 'node', 'mip'];
  if (reserved.includes(packageName)) {
    console.log(`❌ Cannot link reserved package: "${packageName}"`);
    console.log(`   Reserved names: ${reserved.join(', ')}`);
    return;
  }

  // Устанавливаем связанный пакет в текущий проект
  const linkPath = path.join(globalLinkDir, packageName);

  if (!fs.existsSync(linkPath)) {
    console.log(`❌ No global link found for "${packageName}"`);
    console.log('\n📦 Available links:');

    if (fs.existsSync(globalLinkDir)) {
      const links = fs.readdirSync(globalLinkDir);
      if (links.length === 0) {
        console.log('  (none)');
        console.log('💡 Create a link with: mip link');
      } else {
        links.forEach(link => {
          try {
            const target = fs.readlinkSync(path.join(globalLinkDir, link));
            console.log(`  • ${link} -> ${target}`);
          } catch (e) {
            console.log(`  • ${link} -> (broken link)`);
          }
        });
      }
    }
    return;
  }

  const target = fs.readlinkSync(linkPath);
  const targetConfig = config.detectConfig(target);

  if (!targetConfig) {
    console.log('❌ Linked package is invalid (no config file)');
    return;
  }

  const targetPkg = config.readConfig(target);
  if (!targetPkg) {
    console.log('❌ Linked package is invalid (failed to read config)');
    return;
  }

  const modulesDir = path.join(process.cwd(), 'node_modules');
  const installPath = path.join(modulesDir, packageName);

  fs.mkdirSync(modulesDir, { recursive: true });

  if (fs.existsSync(installPath)) {
    fs.rmSync(installPath, { recursive: true, force: true });
  }

  // Проверка на использование hardlinks
  if (mipFeatures['link.useHardlinks']) {
    try {
      // Создаем hardlink вместо symlink
      fs.linkSync(target, installPath);
      console.log(`✅ Created hardlink: ${packageName} -> ${target}`);
    } catch (e) {
      console.log(`⚠️ Hardlink failed, using symlink: ${e.message}`);
      fs.symlinkSync(target, installPath, 'junction');
    }
  } else {
    fs.symlinkSync(target, installPath, 'junction');
  }

  // Добавляем в манифест
  const manifest = loader.loadManifest(process.cwd());
  manifest[packageName] = {
    version: targetPkg.version,
    path: target,
    linked: true,
    installed: Date.now()
  };
  loader.saveManifest(manifest, process.cwd());
  console.log(`✅ Added to manifest: ${packageName}@${targetPkg.version}`);

  // Добавляем в конфиг как linked dependency
  const conf = config.readConfig(process.cwd());
  if (conf) {
    if (!conf.linkedDependencies) conf.linkedDependencies = {};
    conf.linkedDependencies[packageName] = target;
    config.writeConfig(conf, process.cwd());
    console.log(`✅ Added to config: ${packageName}`);
  }

  console.log(`✅ Linked ${packageName}@${targetPkg.version} -> ${target}`);
  
  // Показываем список всех линков
  if (mipFeatures['link.showListOnLink'] !== false) {
    console.log('\n📦 Global links:');
    if (fs.existsSync(globalLinkDir)) {
      const links = fs.readdirSync(globalLinkDir);
      links.forEach(link => {
        try {
          const targetPath = fs.readlinkSync(path.join(globalLinkDir, link));
          console.log(`  • ${link} -> ${targetPath}`);
        } catch (e) {
          console.log(`  • ${link} -> (broken link)`);
        }
      });
    }
  }
}

module.exports = { link };