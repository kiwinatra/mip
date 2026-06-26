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
const { execSync } = require('child_process');
const store = require('../utils/store');
const loader = require('../loader');
const config = require('../utils/config');

async function doctor() {
  console.log('🔍 Running diagnostics...\n');

  const issues = [];

  // Check Node.js version
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.slice(1));
  if (major < 14) {
    issues.push(`⚠️ Node.js ${nodeVersion} (recommended: v18+)`);
  } else {
    console.log(`✅ Node.js ${nodeVersion}`);
  }

  // Check mip version
  const mipVersion = require('../../package.json').version;
  console.log(`✅ mip v${mipVersion}`);

  // Check ~/.mip directory (global store)
  const homeDir = os.homedir();
  const mipDir = path.join(homeDir, '.mip');
  if (!fs.existsSync(mipDir)) {
    issues.push('⚠️ ~/.mip directory missing (will be created on first install)');
  } else {
    console.log('✅ ~/.mip exists');
    
    const storePath = store.getGlobalStorePath();
    if (fs.existsSync(storePath)) {
      const storeSize = store.getStoreSize();
      console.log(`✅ Global store: ${(storeSize / 1024 / 1024).toFixed(2)} MB`);
    } else {
      console.log('✅ Global store ready (empty)');
    }
  }

  // 🔥 ПРОВЕРКА КОНФИГА (mip.yml, mip.json, package.json)
  const cfg = config.detectConfig(process.cwd());
  if (cfg) {
    const conf = config.readConfig(process.cwd());
    console.log(`✅ Config: ${path.basename(cfg.path)}`);
    if (conf) {
      const deps = { ...conf.dependencies, ...conf.devDependencies };
      console.log(`   📦 ${Object.keys(deps).length} dependencies`);
      if (conf.scripts) {
        console.log(`   📜 ${Object.keys(conf.scripts).length} scripts`);
      }
      if (conf.workspaces && conf.workspaces.length > 0) {
        console.log(`   📁 ${conf.workspaces.length} workspace(s)`);
      }
    }
  } else {
    console.log('ℹ️ No config file found (mip.yml, mip.json, or package.json)');
    issues.push('⚠️ No config file found');
  }

  // Проверка манифеста
  const manifestPath = loader.getManifestPath(process.cwd());
  if (fs.existsSync(manifestPath)) {
    const manifest = loader.loadManifest(process.cwd());
    const pkgCount = Object.keys(manifest).length;
    console.log(`✅ Manifest: ${pkgCount} package(s) installed`);
    
    let missingCount = 0;
    for (const [name, info] of Object.entries(manifest)) {
      if (!fs.existsSync(info.path)) {
        console.log(`   ⚠️ ${name}@${info.version}: path missing (${info.path})`);
        missingCount++;
      }
    }
    if (missingCount === 0 && pkgCount > 0) {
      console.log(`   ✅ All package paths exist`);
    } else if (missingCount > 0) {
      issues.push(`⚠️ ${missingCount} package(s) in manifest have missing paths`);
    }
  } else {
    console.log('ℹ️ No manifest found (run mip install first)');
  }

  // Check local .mip
  const localMip = path.join(process.cwd(), '.mip');
  if (fs.existsSync(localMip)) {
    console.log('✅ Local .mip exists');
  } else {
    console.log('ℹ️ Local .mip not found (run mip install first)');
  }

  // Check node_modules (legacy)
  const nodeModules = path.join(process.cwd(), 'node_modules');
  if (fs.existsSync(nodeModules)) {
    console.log('✅ node_modules exists (legacy)');
  }

  // Check PATH for global binaries
  const globalBin = path.join(mipDir, 'global', 'node_modules', '.bin');
  const pathHasGlobal = process.env.PATH.includes(globalBin);
  if (!pathHasGlobal) {
    issues.push(`⚠️ Global bin not in PATH: ${globalBin}`);
  } else {
    console.log('✅ Global bin in PATH');
  }

  // Check git
  try {
    execSync('git --version', { stdio: 'pipe' });
    console.log('✅ Git installed');
  } catch {
    issues.push('⚠️ Git not found (required for GitHub packages)');
  }

  // Check network
  try {
    execSync('curl -s https://registry.npmjs.org/ --max-time 3', { stdio: 'pipe' });
    console.log('✅ Network: npm registry reachable');
  } catch {
    issues.push('⚠️ Cannot reach npm registry (check network)');
  }

  // Check disk space
  try {
    const testFile = path.join(os.tmpdir(), 'mip-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log('✅ Disk writeable');
  } catch {
    issues.push('⚠️ Cannot write to disk (check permissions)');
  }

  console.log(`\n📊 Summary: ${issues.length} warning(s)`);

  if (issues.length > 0) {
    console.log('\nIssues found:\n');
    issues.forEach(issue => console.log(`  ${issue}`));

    console.log('\n💡 Fix suggestions:');
    if (issues.some(i => i.includes('PATH'))) {
      console.log('  • Add to ~/.zshrc or ~/.bashrc:');
      console.log(`    export PATH="$PATH:${globalBin}"`);
    }
    if (issues.some(i => i.includes('Git'))) {
      console.log('  • Install git: https://git-scm.com/');
    }
    if (issues.some(i => i.includes('missing paths'))) {
      console.log('  • Run "mip install" to restore missing packages');
    }
    if (issues.some(i => i.includes('No config'))) {
      console.log('  • Run "mip init" to create a config file');
    }
  } else {
    console.log('\n✨ System is healthy!');
  }
}

module.exports = { doctor };