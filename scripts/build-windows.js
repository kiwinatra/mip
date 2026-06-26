#!/usr/bin/env node
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
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function log(msg, color = 'reset') {
  const colors = {
    green: '\x1b[32m',
    blue: '\x1b[36m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    reset: '\x1b[0m',
  };
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function question(query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

class WindowsBuilder {
  constructor() {
    this.homeDir = os.homedir();
    this.currentDir = process.cwd();
    this.mipScript = path.join(this.currentDir, 'bin', 'mip.js');
  }

  buildBinary(target, outputName) {
    log(`\n📦 Building for Windows ${target.includes('x86') ? '32-bit' : '64-bit'}...`, 'blue');

    try {
      if (!fs.existsSync('dist')) fs.mkdirSync('dist');

      const outputPath = path.join(this.currentDir, 'dist', outputName);

      execSync(`npx pkg ${this.mipScript} --targets ${target} --output ${outputPath}`, {
        stdio: 'inherit',
      });

      const stats = fs.statSync(outputPath);
      log(
        `✅ Binary created: ${outputPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`,
        'green'
      );

      return outputPath;
    } catch (err) {
      log(`❌ Build failed: ${err.message}`, 'red');
      return null;
    }
  }

  addToPathWindows(userBin) {
    try {
      const currentPath = execSync(
        "powershell -Command \"[Environment]::GetEnvironmentVariable('Path', 'User')\"",
        {
          encoding: 'utf8',
        }
      ).trim();

      if (!currentPath.includes(userBin)) {
        execSync(
          `powershell -Command "[Environment]::SetEnvironmentVariable('Path', '${userBin};' + [Environment]::GetEnvironmentVariable('Path', 'User'), 'User')"`,
          {
            stdio: 'pipe',
          }
        );
        log(`✅ Added ${userBin} to User PATH`, 'green');
        log('🔄 Please restart your terminal for changes to take effect', 'yellow');
        return true;
      } else {
        log(`ℹ️  ${userBin} already in PATH`, 'blue');
        return false;
      }
    } catch (err) {
      log(`⚠️ Could not auto-add to PATH: ${err.message}`, 'yellow');
      log('   Manually add to PATH: System Properties → Environment Variables', 'yellow');
      return false;
    }
  }

  createWrapperScript(binaryPath, installDir) {
    const wrapperPath = path.join(installDir, 'mip.cmd');
    const wrapper = `@echo off
"${binaryPath}" %*
`;
    fs.writeFileSync(wrapperPath, wrapper);
    log(`✅ Created wrapper: ${wrapperPath}`, 'green');
    return installDir;
  }

  async installToUserBin(binaryPath) {
    const installDir = path.join(this.homeDir, 'AppData', 'Local', 'mip');
    fs.mkdirSync(installDir, { recursive: true });

    const targetPath = path.join(installDir, 'mip.exe');
    fs.copyFileSync(binaryPath, targetPath);

    this.createWrapperScript(targetPath, installDir);
    this.addToPathWindows(installDir);

    log(`✅ Installed to ${installDir}`, 'green');
    return true;
  }
}

async function main() {
  console.log('');
  log('╔═══════════════════════════════════════════════════════════╗', 'green');
  log('║         🪟 MIP Builder for Windows 🪟                      ║', 'green');
  log('╚═══════════════════════════════════════════════════════════╝', 'green');
  console.log('');

  log('Select architecture:', 'yellow');
  log('1. Windows x64 (64-bit)', 'blue');
  log('2. Windows x86 (32-bit)', 'blue');
  console.log('');

  const archChoice = await question('Choose (1-2): ');

  let target, outputName;

  if (archChoice === '1') {
    target = 'node18-win-x64';
    outputName = 'mip-windows-x64.exe';
  } else if (archChoice === '2') {
    target = 'node18-win-x86';
    outputName = 'mip-windows-x86.exe';
  } else {
    log('❌ Invalid choice', 'red');
    process.exit(1);
  }

  const binary = await new WindowsBuilder().buildBinary(target, outputName);

  if (!binary) {
    log('❌ Build failed', 'red');
    process.exit(1);
  }

  console.log('');
  log('┌───────────────────────────────────────────────────────────┐', 'yellow');
  log('│                    📋 INSTALLATION                        │', 'yellow');
  log('└───────────────────────────────────────────────────────────┘', 'yellow');
  console.log('');
  log('1. Install to AppData/Local/mip and add to PATH', 'blue');
  log('2. Skip installation (binary in dist/)', 'blue');
  console.log('');

  const installChoice = await question('Choose (1-2): ');
  console.log('');

  const builder2 = new WindowsBuilder();

  if (installChoice === '1') {
    await builder2.installToUserBin(binary);
  } else {
    log(`ℹ️  Binary saved to: ${binary}`, 'blue');
  }

  console.log('');
  log('╔═══════════════════════════════════════════════════════════╗', 'green');
  log('║                    ✨ INSTALLATION DONE ✨                  ║', 'green');
  log('╚═══════════════════════════════════════════════════════════╝', 'green');
  console.log('');
  log('💡 To use mip:', 'yellow');
  log('   1. RESTART YOUR TERMINAL', 'red');
  log('   2. Run: mip --help', 'blue');
  log('   3. Or use directly: ' + binary, 'blue');
  console.log('');

  rl.close();
}

main().catch(console.error);