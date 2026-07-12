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
const features = require('../utils/features');

async function doctor() {
  console.log('🔍 Running diagnostics...\n');

  const mipFeatures = features.loadFeatures(process.cwd());
  const issues = [];
  const warnings = [];

  // Check Node.js version
  if (mipFeatures['doctor.checkNodeVersion'] !== false) {
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

  // Check config
  if (mipFeatures['doctor.checkManifest'] !== false) {
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
  }

  // Check manifest
  if (mipFeatures['doctor.checkManifest'] !== false) {
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
  if (mipFeatures['doctor.checkPermissions'] !== false) {
    const globalBin = path.join(mipDir, 'global', 'node_modules', '.bin');
    const pathHasGlobal = process.env.PATH.includes(globalBin);
    if (!pathHasGlobal) {
      issues.push(`⚠️ Global bin not in PATH: ${globalBin}`);
    } else {
      console.log('✅ Global bin in PATH');
    }
  }

  // Check git
  if (mipFeatures['doctor.checkNetwork'] !== false) {
    try {
      execSync('git --version', { stdio: 'pipe' });
      console.log('✅ Git installed');
    } catch {
      issues.push('⚠️ Git not found (required for GitHub packages)');
    }
  }

  // Check GITHUB_TOKEN
  if (mipFeatures['doctor.checkGitHubToken'] !== false) {
    const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    if (githubToken) {
      if (githubToken.length > 10) {
        console.log('✅ GITHUB_TOKEN found');
        
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
  }

  // Check network
  if (mipFeatures['doctor.checkNetwork'] !== false) {
    try {
      execSync('curl -s https://registry.npmjs.org/ --max-time 3', { stdio: 'pipe' });
      console.log('✅ Network: npm registry reachable');
    } catch {
      issues.push('⚠️ Cannot reach npm registry (check network)');
    }
  }

  // Check disk space
  if (mipFeatures['doctor.checkDiskSpace'] !== false) {
    try {
      const freeSpace = getFreeSpace();
      const freeSpaceGB = (freeSpace / 1024 / 1024 / 1024).toFixed(2);
      const freeSpaceMB = (freeSpace / 1024 / 1024).toFixed(0);
      
      console.log(`💾 Free disk space: ${freeSpaceGB} GB (${freeSpaceMB} MB)`);
      
      if (freeSpace < 1024 * 1024 * 100) {
        issues.push(`⚠️ Critical: Only ${freeSpaceMB} MB free disk space (minimum 100 MB required)`);
      } else if (freeSpace < 1024 * 1024 * 500) {
        warnings.push(`⚠️ Low disk space: ${freeSpaceMB} MB free (recommended > 500 MB)`);
        console.log(`⚠️ Low disk space: ${freeSpaceMB} MB free (recommended > 500 MB)`);
      } else if (freeSpace < 1024 * 1024 * 1024) {
        warnings.push(`⚠️ Limited disk space: ${freeSpaceGB} GB free (recommended > 1 GB)`);
        console.log(`⚠️ Limited disk space: ${freeSpaceGB} GB free (recommended > 1 GB)`);
      } else {
        console.log('✅ Sufficient disk space available');
      }
      
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
      
      if (fs.existsSync(storePath)) {
        const storeSize = store.getStoreSize();
        const storeSizeGB = (storeSize / 1024 / 1024 / 1024).toFixed(2);
        if (storeSize > 1024 * 1024 * 1024 * 5) {
          warnings.push(`⚠️ Global store is large: ${storeSizeGB} GB (consider cleaning with "mip clean")`);
          console.log(`⚠️ Global store is large: ${storeSizeGB} GB (consider cleaning with "mip clean")`);
        }
      }
      
    } catch (error) {
      warnings.push('⚠️ Could not check disk space (platform not supported)');
    }
  }

  // Check GitHub API
  if (mipFeatures['doctor.checkNetwork'] !== false) {
    try {
      execSync('curl -s https://api.github.com/zen --max-time 3', { stdio: 'pipe' });
      console.log('✅ GitHub API reachable');
    } catch {
      warnings.push('⚠️ Cannot reach GitHub API (check network)');
    }
  }

  // Auto-fix
  if (mipFeatures['doctor.autoFix'] && issues.length > 0) {
    console.log('\n🔧 Auto-fixing issues...');
    for (const issue of issues) {
      if (issue.includes('PATH')) {
        const shell = process.env.SHELL || '/bin/bash';
        const rcFile = shell.includes('zsh') ? '~/.zshrc' : '~/.bashrc';
        console.log(`   Adding PATH to ${rcFile}...`);
        try {
          execSync(`echo 'export PATH="$PATH:${path.join(mipDir, 'global', 'node_modules', '.bin')}"' >> ${rcFile}`, { stdio: 'pipe' });
          console.log('   ✅ PATH updated');
        } catch {
          console.log('   ❌ Failed to update PATH');
        }
      }
      if (issue.includes('~/.mip directory missing')) {
        console.log('   Creating ~/.mip...');
        try {
          fs.mkdirSync(mipDir, { recursive: true });
          console.log('   ✅ ~/.mip created');
        } catch {
          console.log('   ❌ Failed to create ~/.mip');
        }
      }
      if (issue.includes('No config file found')) {
        console.log('   Creating default config...');
        try {
          const { init } = require('./init');
          await init();
          console.log('   ✅ Config created');
        } catch {
          console.log('   ❌ Failed to create config');
        }
      }
    }
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
    
    if (issues.some(i => i.includes('Node.js')) || warnings.some(w => w.includes('Node.js'))) {
      suggestions.push('• Update Node.js: https://nodejs.org/ (v18+ recommended)');
    }
    
    if (issues.some(i => i.includes('PATH'))) {
      suggestions.push('• Add to ~/.zshrc or ~/.bashrc:');
      suggestions.push(`    export PATH="$PATH:${path.join(mipDir, 'global', 'node_modules', '.bin')}"`);
    }
    
    if (issues.some(i => i.includes('Git'))) {
      suggestions.push('• Install git: https://git-scm.com/');
    }
    
    if (issues.some(i => i.includes('missing paths'))) {
      suggestions.push('• Run "mip install" to restore missing packages');
    }
    
    if (issues.some(i => i.includes('No config'))) {
      suggestions.push('• Run "mip init" to create a config file');
    }
    
    if (issues.some(i => i.includes('GITHUB_TOKEN'))) {
      suggestions.push('• Set GITHUB_TOKEN environment variable:');
      suggestions.push('  export GITHUB_TOKEN=your_token_here');
      suggestions.push('  • Get token from: https://github.com/settings/tokens');
    } else if (warnings.some(w => w.includes('GITHUB_TOKEN'))) {
      suggestions.push('• Set GITHUB_TOKEN for better GitHub package support:');
      suggestions.push('  export GITHUB_TOKEN=your_token_here');
    }
    
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
    if (process.platform !== 'win32') {
      const output = execSync('df -k .', { encoding: 'utf8', stdio: 'pipe' });
      const lines = output.split('\n');
      if (lines.length >= 2) {
        const parts = lines[1].split(/\s+/);
        if (parts.length >= 4) {
          return parseInt(parts[3]) * 1024;
        }
      }
    } else {
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
        // fallback
      }
    }
  } catch (error) {
    return 1024 * 1024 * 1024;
  }
  
  try {
    const testFile = path.join(os.tmpdir(), 'mip-space-test');
    const testSize = 1024 * 1024;
    fs.writeFileSync(testFile, Buffer.alloc(testSize));
    const stats = fs.statSync(testFile);
    fs.unlinkSync(testFile);
    return 1024 * 1024 * 1024;
  } catch {
    return 100 * 1024 * 1024;
  }
}

module.exports = { doctor };