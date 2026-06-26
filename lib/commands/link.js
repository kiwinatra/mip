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

function link(packageName) {
  const globalLinkDir = path.join(os.homedir(), '.mip-links');

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
      fs.unlinkSync(linkPath);
    }

    fs.symlinkSync(process.cwd(), linkPath, 'junction');
    console.log(`✅ Created global link: ${pkg.name} -> ${process.cwd()}`);
    return;
  }

  // Устанавливаем связанный пакет в текущий проект
  const linkPath = path.join(globalLinkDir, packageName);

  if (!fs.existsSync(linkPath)) {
    console.log(`❌ No global link found for "${packageName}"`);
    console.log('\n📦 Available links:');

    if (fs.existsSync(globalLinkDir)) {
      const links = fs.readdirSync(globalLinkDir);
      links.forEach(link => {
        const target = fs.readlinkSync(path.join(globalLinkDir, link));
        console.log(`  • ${link} -> ${target}`);
      });
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

  fs.symlinkSync(target, installPath, 'junction');

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

  // Добавляем в конфиг как linked dependency (если поддерживается)
  const conf = config.readConfig(process.cwd());
  if (conf) {
    if (!conf.linkedDependencies) conf.linkedDependencies = {};
    conf.linkedDependencies[packageName] = target;
    config.writeConfig(conf, process.cwd());
    console.log(`✅ Added to config: ${packageName}`);
  }

  console.log(`✅ Linked ${packageName}@${targetPkg.version} -> ${target}`);
}

module.exports = { link };