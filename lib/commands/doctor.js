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
  const warnings = [];

  // Check Node.js version
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.slice(1));
  if (major < 14) {
    issues.push(`⚠️ Node.js ${nodeVersion} (minimum required: v14+, recommended: v18+)`);
  } else if (major < 18) {
    warnings.push(`⚠️ Node.js ${nodeVersion} (recommended: v18+ for best performance)`);
    console.log(`⚠️ Node.js ${nodeVersion} (recommended: v18+)`);
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

  // 🔥 ПРОВЕРКА GITHUB_TOKEN
  const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (githubToken) {
    // Проверяем, что токен валидный (не пустой)
    if (githubToken.length > 10) {
      console.log('✅ GITHUB_TOKEN found');
      
      // Проверяем доступ к GitHub API
      try {
        const testResult = execSync(
          `curl -s -H "Authorization: token ${githubToken}" https://api.github.com/user --max-time 5`,
          { stdio: 'pipe', encoding: 'utf-8' }
        );
        if (testResult.includes('"login"')) {
          console.log('   ✅ GitHub token is valid');
        } else if (testResult.includes('Bad credentials')) {
          issues.push('⚠️ GITHUB_TOKEN is invalid (bad credentials)');
        } else {
          warnings.push('⚠️ Could not verify GITHUB_TOKEN (API rate limit or network issue)');
        }
      } catch (error) {
        warnings.push('⚠️ Could not verify GITHUB_TOKEN (check network or token format)');
      }
    } else {
      issues.push('⚠️ GITHUB_TOKEN is set but appears invalid (too short)');
    }
  } else {
    const hasGitHubDeps = checkGitHubDependencies();
    if (hasGitHubDeps) {
      issues.push('⚠️ GITHUB_TOKEN not found (required for GitHub packages in this project)');
    } else {
      warnings.push('⚠️ GITHUB_TOKEN not set (recommended for GitHub packages)');
      console.log('ℹ️ No GITHUB_TOKEN found (set for GitHub packages)');
    }
  }

  // Check network
  try {
    execSync('curl -s https://registry.npmjs.org/ --max-time 3', { stdio: 'pipe' });
    console.log('✅ Network: npm registry reachable');
  } catch {
    issues.push('⚠️ Cannot reach npm registry (check network)');
  }

  // 🔥 УЛУЧШЕННАЯ ПРОВЕРКА СВОБОДНОГО МЕСТА НА ДИСКЕ
  try {
    // Проверяем свободное место на диске
    const freeSpace = getFreeSpace();
    const freeSpaceGB = (freeSpace / 1024 / 1024 / 1024).toFixed(2);
    const freeSpaceMB = (freeSpace / 1024 / 1024).toFixed(0);
    
    console.log(`💾 Free disk space: ${freeSpaceGB} GB (${freeSpaceMB} MB)`);
    
    // Предупреждения в зависимости от свободного места
    if (freeSpace < 1024 * 1024 * 100) { // меньше 100 MB
      issues.push(`⚠️ Critical: Only ${freeSpaceMB} MB free disk space (minimum 100 MB required)`);
    } else if (freeSpace < 1024 * 1024 * 500) { // меньше 500 MB
      warnings.push(`⚠️ Low disk space: ${freeSpaceMB} MB free (recommended > 500 MB)`);
      console.log(`⚠️ Low disk space: ${freeSpaceMB} MB free (recommended > 500 MB)`);
    } else if (freeSpace < 1024 * 1024 * 1024) { // меньше 1 GB
      warnings.push(`⚠️ Limited disk space: ${freeSpaceGB} GB free (recommended > 1 GB)`);
      console.log(`⚠️ Limited disk space: ${freeSpaceGB} GB free (recommended > 1 GB)`);
    } else {
      console.log('✅ Sufficient disk space available');
    }
    
    // Проверяем возможность записи в важные директории
    const testDirs = [
      { path: os.tmpdir(), name: 'Temp directory' },
      { path: mipDir, name: '~/.mip directory' },
      { path: process.cwd(), name: 'Current project' }
    ];
    
    for (const dir of testDirs) {
      if (fs.existsSync(dir.path) || dir.path === process.cwd()) {
        try {
          const testFile = path.join(dir.path, `.mip-test-${Date.now()}`);
          fs.writeFileSync(testFile, 'test');
          fs.unlinkSync(testFile);
        } catch (error) {
          issues.push(`⚠️ Cannot write to ${dir.name}: ${dir.path} (check permissions)`);
        }
      }
    }
    
    // Проверка размера глобального хранилища
    if (fs.existsSync(storePath)) {
      const storeSize = store.getStoreSize();
      const storeSizeGB = (storeSize / 1024 / 1024 / 1024).toFixed(2);
      if (storeSize > 1024 * 1024 * 1024 * 5) { // больше 5 GB
        warnings.push(`⚠️ Global store is large: ${storeSizeGB} GB (consider cleaning with "mip clean")`);
        console.log(`⚠️ Global store is large: ${storeSizeGB} GB (consider cleaning with "mip clean")`);
      }
    }
    
  } catch (error) {
    warnings.push('⚠️ Could not check disk space (platform not supported)');
  }

  // Проверка доступа к GitHub API
  try {
    execSync('curl -s https://api.github.com/zen --max-time 3', { stdio: 'pipe' });
    console.log('✅ GitHub API reachable');
  } catch {
    warnings.push('⚠️ Cannot reach GitHub API (check network)');
  }

  console.log(`\n📊 Summary: ${issues.length} error(s), ${warnings.length} warning(s)`);

  if (issues.length > 0 || warnings.length > 0) {
    if (issues.length > 0) {
      console.log('\n❌ Issues found:\n');
      issues.forEach(issue => console.log(`  ${issue}`));
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️ Warnings:\n');
      warnings.forEach(warning => console.log(`  ${warning}`));
    }

    console.log('\n💡 Fix suggestions:');
    
    const suggestions = [];
    
    // Node.js suggestions
    if (issues.some(i => i.includes('Node.js')) || warnings.some(w => w.includes('Node.js'))) {
      suggestions.push('• Update Node.js: https://nodejs.org/ (v18+ recommended)');
    }
    
    // PATH suggestions
    if (issues.some(i => i.includes('PATH'))) {
      suggestions.push('• Add to ~/.zshrc or ~/.bashrc:');
      suggestions.push(`    export PATH="$PATH:${globalBin}"`);
    }
    
    // Git suggestions
    if (issues.some(i => i.includes('Git'))) {
      suggestions.push('• Install git: https://git-scm.com/');
    }
    
    // Missing paths suggestions
    if (issues.some(i => i.includes('missing paths'))) {
      suggestions.push('• Run "mip install" to restore missing packages');
    }
    
    // Config suggestions
    if (issues.some(i => i.includes('No config'))) {
      suggestions.push('• Run "mip init" to create a config file');
    }
    
    // GITHUB_TOKEN suggestions
    if (issues.some(i => i.includes('GITHUB_TOKEN'))) {
      suggestions.push('• Set GITHUB_TOKEN environment variable:');
      suggestions.push('  export GITHUB_TOKEN=your_token_here');
      suggestions.push('  • Get token from: https://github.com/settings/tokens');
    } else if (warnings.some(w => w.includes('GITHUB_TOKEN'))) {
      suggestions.push('• Set GITHUB_TOKEN for better GitHub package support:');
      suggestions.push('  export GITHUB_TOKEN=your_token_here');
    }
    
    // Disk space suggestions
    if (issues.some(i => i.includes('disk space')) || warnings.some(w => w.includes('disk space'))) {
      suggestions.push('• Free up disk space:');
      suggestions.push('  • Run "mip clean" to remove unused packages');
      suggestions.push('  • Remove old packages from ~/.mip/store');
    }
    
    if (suggestions.length > 0) {
      console.log(suggestions.join('\n'));
    }
  } else {
    console.log('\n✨ System is healthy!');
    console.log('💡 All checks passed successfully.');
  }
}

/**
 * Проверяет наличие GitHub зависимостей в конфиге
 */
function checkGitHubDependencies() {
  try {
    const conf = config.readConfig(process.cwd());
    if (!conf) return false;
    
    const deps = { ...conf.dependencies, ...conf.devDependencies };
    
    for (const depName of Object.keys(deps)) {
      // Проверяем, содержит ли имя зависимости формат GitHub
      if (depName.includes('/') || depName.includes('github:')) {
        return true;
      }
    }
  } catch (error) {
    // Игнорируем ошибки при проверке
  }
  return false;
}

/**
 * Получает свободное место на диске в байтах
 */
function getFreeSpace() {
  try {
    // Для Unix систем (Linux, macOS)
    if (process.platform !== 'win32') {
      const output = execSync('df -k .', { encoding: 'utf8', stdio: 'pipe' });
      const lines = output.split('\n');
      if (lines.length >= 2) {
        const parts = lines[1].split(/\s+/);
        if (parts.length >= 4) {
          // df выводит размер в блоках по 1KB
          return parseInt(parts[3]) * 1024;
        }
      }
    } else {
      // Для Windows
      try {
        const output = execSync('wmic logicaldisk get FreeSpace,Name', { encoding: 'utf8', stdio: 'pipe' });
        const currentDrive = process.cwd().charAt(0);
        const lines = output.split('\n');
        for (const line of lines) {
          if (line.includes(currentDrive)) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2) {
              return parseInt(parts[1]);
            }
          }
        }
      } catch (e) {
        // Альтернативный способ для Windows
        const output = execSync('dir', { encoding: 'utf8', stdio: 'pipe' });
        // Простой парсинг, но это менее надежно
      }
    }
  } catch (error) {
    // Возвращаем значение по умолчанию, если не удалось определить
    return 1024 * 1024 * 1024; // 1 GB
  }
  
  // Если не удалось определить, пробуем другой метод
  try {
    const testFile = path.join(os.tmpdir(), 'mip-space-test');
    const testSize = 1024 * 1024; // 1 MB
    fs.writeFileSync(testFile, Buffer.alloc(testSize));
    const stats = fs.statSync(testFile);
    fs.unlinkSync(testFile);
    
    // Если запись прошла успешно, предполагаем, что места достаточно
    return 1024 * 1024 * 1024; // 1 GB
  } catch {
    return 100 * 1024 * 1024; // 100 MB (минимальное значение)
  }
}

module.exports = { doctor };