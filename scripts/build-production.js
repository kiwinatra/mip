#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const platforms = [
  { name: 'linux-x64', target: 'node18-linux-x64', binary: 'mip-linux-x64', archive: 'mip-linux-x64.tar.gz' },
  { name: 'linux-x86', target: 'node18-linux-x86', binary: 'mip-linux-x86', archive: 'mip-linux-x86.tar.gz' },
  { name: 'macos-x64', target: 'node18-macos-x64', binary: 'mip-macos-x64', archive: 'mip-macos-x64.tar.gz' },
  { name: 'macos-arm64', target: 'node18-macos-arm64', binary: 'mip-macos-arm64', archive: 'mip-macos-arm64.tar.gz' },
  { name: 'windows-x64', target: 'node18-win-x64', binary: 'mip-windows-x64.exe', archive: 'mip-windows-x64.zip' },
  { name: 'windows-x86', target: 'node18-win-x86', binary: 'mip-windows-x86.exe', archive: 'mip-windows-x86.zip' }
];

const releaseDir = path.join(process.cwd(), 'release');
const distDir = path.join(process.cwd(), 'dist');

function log(msg, color = 'blue') {
  const colors = {
    green: '\x1b[32m',
    blue: '\x1b[36m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function clean() {
  log('\n🧹 Cleaning release directory...', 'yellow');
  if (fs.existsSync(releaseDir)) {
    fs.rmSync(releaseDir, { recursive: true, force: true });
  }
  fs.mkdirSync(releaseDir, { recursive: true });
  log('✅ Cleaned', 'green');
}

function buildBinaries() {
  log('\n📦 Building binaries...', 'blue');
  
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  
  for (const platform of platforms) {
    log(`  Building ${platform.name}...`, 'yellow');
    try {
      execSync(`npx pkg bin/mip.js --targets ${platform.target} --output dist/${platform.binary}`, {
        stdio: 'pipe'
      });
      log(`    ✅ ${platform.binary}`, 'green');
    } catch (err) {
      log(`    ❌ Failed: ${platform.name}`, 'red');
    }
  }
}

function createArchives() {
  log('\n📦 Creating archives...', 'blue');
  
  for (const platform of platforms) {
    const binaryPath = path.join(distDir, platform.binary);
    const archivePath = path.join(releaseDir, platform.archive);
    
    if (!fs.existsSync(binaryPath)) {
      log(`  ❌ ${platform.binary} not found, skipping`, 'red');
      continue;
    }
    
    log(`  Packaging ${platform.name}...`, 'yellow');
    
    if (platform.archive.endsWith('.tar.gz')) {
      execSync(`tar -czf "${archivePath}" -C "${distDir}" "${platform.binary}"`, {
        stdio: 'pipe'
      });
    } else if (platform.archive.endsWith('.zip')) {
      execSync(`zip -j "${archivePath}" "${binaryPath}"`, {
        stdio: 'pipe'
      });
    }
    
    const stats = fs.statSync(archivePath);
    log(`    ✅ ${platform.archive} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`, 'green');
  }
}

function createChecksums() {
  log('\n🔐 Creating checksums...', 'blue');
  
  const checksumPath = path.join(releaseDir, 'checksums.txt');
  const checksums = [];
  
  const files = fs.readdirSync(releaseDir);
  for (const file of files) {
    if (file !== 'checksums.txt') {
      const filePath = path.join(releaseDir, file);
      const hash = execSync(`sha256sum "${filePath}"`).toString().split(' ')[0];
      checksums.push(`${hash}  ${file}`);
    }
  }
  
  fs.writeFileSync(checksumPath, checksums.join('\n'));
  log(`  ✅ checksums.txt created`, 'green');
}

function createReleaseJson() {
  log('\n📋 Creating release metadata...', 'blue');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const version = packageJson.version;
  
  const releaseInfo = {
    version: version,
    date: new Date().toISOString(),
    files: []
  };
  
  const files = fs.readdirSync(releaseDir);
  for (const file of files) {
    const filePath = path.join(releaseDir, file);
    const stats = fs.statSync(filePath);
    releaseInfo.files.push({
      name: file,
      size: stats.size,
      size_mb: (stats.size / 1024 / 1024).toFixed(2)
    });
  }
  
  fs.writeFileSync(path.join(releaseDir, 'release.json'), JSON.stringify(releaseInfo, null, 2));
  log(`  ✅ release.json created`, 'green');
}

function printSummary() {
  log('\n╔═══════════════════════════════════════════════════════════════╗', 'green');
  log('║                    🎉 RELEASE BUILD COMPLETE 🎉                 ║', 'green');
  log('╚═══════════════════════════════════════════════════════════════╝', 'green');
  
  log('\n📁 Release files:', 'yellow');
  const files = fs.readdirSync(releaseDir);
  for (const file of files) {
    const filePath = path.join(releaseDir, file);
    const stats = fs.statSync(filePath);
    log(`  📦 ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`, 'blue');
  }
  
  log('\n✨ Next steps:', 'yellow');
  log('  1. Create GitHub release', 'blue');
  log('  2. Upload files from release/ folder', 'blue');
  log('  3. Run: gh release create v1.0.0 release/* --notes "Initial release"', 'blue');
}

async function main() {
  log('\n╔═══════════════════════════════════════════════════════════════╗', 'green');
  log('║              🚀 MIP RELEASE BUILDER v1.0 🚀                     ║', 'green');
  log('╚═══════════════════════════════════════════════════════════════╝', 'green');
  
  clean();
  buildBinaries();
  createArchives();
  createChecksums();
  createReleaseJson();
  printSummary();
}

main().catch(err => {
  log(`\n❌ Error: ${err.message}`, 'red');
  process.exit(1);
});