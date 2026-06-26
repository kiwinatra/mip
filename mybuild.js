#!/usr/bin/env node
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
 * │   MIP RELEASE BUILDER (single-arch)                               │
 * │   Detect OS + arch, build mip, zip into release/, optionally add │
 * │   wrapper to PATH.                                                │
 * │                                                                     │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const { execSync, spawnSync } = require('child_process');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function log(msg, color = 'reset') {
  const colors = {
    green: '\x1b[32m',
    blue: '\x1b[36m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    magenta: '\x1b[35m',
    reset: '\x1b[0m',
  };
  console.log(`${colors[color] ?? colors.reset}${msg}${colors.reset}`);
}

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function detectOS() {
  const p = os.platform();
  if (p === 'linux') return 'linux';
  if (p === 'darwin') return 'macos';
  if (p === 'win32') return 'windows';
  return p;
}

function detectArchBitness() {
  // Node reports architecture string like: x64, arm64, ia32
  const a = os.arch();
  if (a === 'ia32') return 'x32';
  if (a === 'x64') return 'x64';
  // For unusual arches we still map to x64 (better than failing here)
  return 'x64';
}

function askYesNo(prompt, def = 'N') {
  const d = def.toLowerCase() === 'y' ? 'Y' : 'N';
  return question(`${prompt} (${d}) `).then(ans => {
    const v = (ans || '').trim().toLowerCase();
    if (!v) return d === 'Y';
    return v === 'y' || v === 'yes' || v === '1';
  });
}

function ensurePkg() {
  try {
    execSync('npx pkg --version', { stdio: 'ignore' });
  } catch {
    log('Installing pkg (dev dependency) globally via npm -g...', 'yellow');
    execSync('npm install -g pkg', { stdio: 'inherit' });
  }
}

function mapToPkgTarget(osName, bitness) {
  if (osName === 'linux') {
    return bitness === 'x64' ? 'node18-linux-x64' : 'node18-linux-x86';
  }
  if (osName === 'macos') {
    // existing project builder scripts use x64; arm64 not requested by task
    return 'node18-macos-x64';
  }
  if (osName === 'windows') {
    return bitness === 'x64' ? 'node18-win-x64' : 'node18-win-x86';
  }
  throw new Error(`Unsupported OS for build: ${osName}`);
}

function outputBinaryName(osName, bitness) {
  if (osName === 'linux') return bitness === 'x64' ? 'mip-linux-x64' : 'mip-linux-x86';
  if (osName === 'macos') return 'mip-macos-x64';
  if (osName === 'windows')
    return bitness === 'x64' ? 'mip-windows-x64.exe' : 'mip-windows-x86.exe';
  throw new Error(`Unsupported OS for binary name: ${osName}`);
}

function archiveName(osName, bitness) {
  if (osName === 'windows') {
    return bitness === 'x64' ? 'mip-windows-x64.zip' : 'mip-windows-x86.zip';
  }
  // Use zip for all platforms as requested
  return `${outputBinaryName(osName, bitness)}.zip`;
}

function zipBinary(binPath, outZipPath) {
  fs.mkdirSync(path.dirname(outZipPath), { recursive: true });

  // Prefer system zip if available
  let hasZip = true;
  try {
    execSync('zip -v', { stdio: 'ignore' });
  } catch {
    hasZip = false;
  }

  if (hasZip) {
    execSync(`zip -j "${outZipPath}" "${binPath}"`, { stdio: 'inherit' });
    return;
  }

  // Fallback: use node to create a zip? (not implemented) => fail clearly
  throw new Error(
    'zip utility is not available on this system. Install zip or ensure it is in PATH.'
  );
}

function getHome() {
  return os.homedir();
}

function shellRCFromEnv() {
  const home = getHome();
  const shell = process.env.SHELL || '';

  const candidates = [];
  if (shell.includes('zsh')) candidates.push(path.join(home, '.zshrc'));
  if (shell.includes('bash')) candidates.push(path.join(home, '.bashrc'));
  candidates.push(path.join(home, '.zshrc'));
  candidates.push(path.join(home, '.bashrc'));

  for (const p of candidates) {
    // Prefer existing, but allow non-existing (we'll create)
    return p;
  }
  return path.join(home, '.bashrc');
}

function addToPathInteractive() {
  const home = getHome();
  const binDir = path.join(home, '.local', 'bin');
  fs.mkdirSync(binDir, { recursive: true });

  const add = async () => {
    const osName = detectOS();
    if (osName === 'windows') {
      log(
        'Auto-adding to PATH on Windows is implemented only for wrapper scripts placed into AppData.',
        'yellow'
      );
      const installDir = path.join(home, 'AppData', 'Local', 'mip');
      fs.mkdirSync(installDir, { recursive: true });
      return { kind: 'skip', message: `Install a wrapper manually from ${installDir}` };
    }

    const rcPath = shellRCFromEnv();
    const markerStart = '# MIP (mybuild)';
    let content = '';
    if (fs.existsSync(rcPath)) content = fs.readFileSync(rcPath, 'utf8');

    if (content.includes(binDir)) {
      log(`ℹ️ ${binDir} already appears in ${rcPath}`, 'blue');
      return true;
    }

    const pathLine = `\n${markerStart}\nexport PATH="$PATH:${binDir}"\n`;
    fs.appendFileSync(rcPath, pathLine);
    log(`✅ Added ${binDir} to PATH in ${rcPath}`, 'green');
    log('🔄 Reload your shell: source ~/.bashrc (or ~/.zshrc)', 'blue');
    return true;
  };

  return add();
}

function createLinuxWrapper(binPath, destDir) {
  const wrapperPath = path.join(destDir, 'mip');
  const content = `#!/bin/sh\n\n"${binPath}" "$@"\n`;
  fs.writeFileSync(wrapperPath, content, { mode: 0o755 });
  fs.chmodSync(wrapperPath, 0o755);
  return wrapperPath;
}

function createWindowsWrapper(binPath, destDir) {
  const wrapperPath = path.join(destDir, 'mip.cmd');
  const content = `@echo off\n"${binPath}" %*\n`;
  fs.writeFileSync(wrapperPath, content, { mode: 0o755 });
  return wrapperPath;
}

async function main() {
  log('MIP mybuild.js - single target builder', 'magenta');

  const detectedOS = detectOS();
  const detectedBitness = detectArchBitness();

  const options = [
    { osName: 'linux', bitness: 'x64', label: 'linux x64' },
    { osName: 'linux', bitness: 'x32', label: 'linux x32' },
    { osName: 'macos', bitness: 'x64', label: 'macos x64' },
    { osName: 'windows', bitness: 'x64', label: 'windows x64' },
    { osName: 'windows', bitness: 'x32', label: 'windows x32' },
  ];

  log(`Detected: ${detectedOS} ${detectedBitness}`, 'blue');

  log('Choose target (or press Enter to accept detection):', 'yellow');
  options.forEach((o, i) => {
    const isDefault = o.osName === detectedOS && o.bitness === detectedBitness;
    log(`${i + 1}. ${o.label}${isDefault ? '  (default)' : ''}`, 'blue');
  });
  const answer = (await question('\nYour choice (1-5, Enter=default): ')).trim();

  let chosen;
  if (!answer) {
    chosen = { osName: detectedOS, bitness: detectedBitness };
  } else {
    const idx = Number(answer) - 1;
    if (!options[idx]) throw new Error('Invalid choice');
    chosen = { osName: options[idx].osName, bitness: options[idx].bitness };
  }

  // Ask confirm if not equal detection
  if (!(chosen.osName === detectedOS && chosen.bitness === detectedBitness)) {
    const ok = await askYesNo(`Confirm building for ${chosen.osName} ${chosen.bitness}?`, 'Y');
    if (!ok) {
      log('Cancelled.', 'red');
      return;
    }
  }

  const releaseDir = path.join(process.cwd(), 'release');
  const distDir = path.join(process.cwd(), 'dist');
  fs.mkdirSync(releaseDir, { recursive: true });
  fs.mkdirSync(distDir, { recursive: true });

  ensurePkg();

  const pkgTarget = mapToPkgTarget(chosen.osName, chosen.bitness);
  const binaryName = outputBinaryName(chosen.osName, chosen.bitness);
  const outBinaryPath = path.join(distDir, binaryName);

  log(`\n📦 Building: ${chosen.osName} ${chosen.bitness} -> ${binaryName}`, 'blue');
  const mipScript = path.join(process.cwd(), 'bin', 'mip.js');
  if (!fs.existsSync(mipScript)) throw new Error('bin/mip.js not found');

  // Build
  // Note: pkg --output writes file path when single target; project scripts do same.
  const res = spawnSync(
    'npx',
    ['pkg', mipScript, '--targets', pkgTarget, '--output', outBinaryPath],
    {
      stdio: 'inherit',
      shell: false,
    }
  );
  if (res.status !== 0) throw new Error('pkg build failed');

  // Zip
  const outZipPath = path.join(releaseDir, archiveName(chosen.osName, chosen.bitness));
  log(`📦 Zipping into: ${outZipPath}`, 'blue');
  zipBinary(outBinaryPath, outZipPath);

  log('\n✅ Build done!', 'green');
  log(`Binary: ${outBinaryPath}`, 'blue');
  log(`Archive: ${outZipPath}`, 'green');

  const doInstall = await askYesNo(
    '\nInstall executable and optionally add to PATH using this built binary?',
    'N'
  );
  if (!doInstall) {
    rl.close();
    return;
  }

  const addToPath = await askYesNo('Add mip to PATH (recommended)?', 'Y');

  // Install strategy: place binary+wrapper under ~/.local/bin (linux/macos) or AppData Local (windows)
  const osName = chosen.osName;
  if (osName === 'windows') {
    const home = getHome();
    const installDir = path.join(home, 'AppData', 'Local', 'mip');
    fs.mkdirSync(installDir, { recursive: true });

    const targetBin = path.join(installDir, path.basename(outBinaryPath));
    fs.copyFileSync(outBinaryPath, targetBin);

    createWindowsWrapper(targetBin, installDir);
    log(`✅ Installed to: ${installDir}`, 'green');

    if (addToPath) {
      log('⚠️ Auto PATH add on Windows is not fully implemented in this helper.', 'yellow');
      log(`MANUALLY add to PATH: ${installDir}`, 'yellow');
    }
  } else {
    const home = getHome();
    const binDir = path.join(home, '.local', 'bin');
    fs.mkdirSync(binDir, { recursive: true });

    const targetBin = path.join(binDir, 'mip-bin');
    fs.copyFileSync(outBinaryPath, targetBin);
    fs.chmodSync(targetBin, 0o755);

    // Wrapper named mip
    createLinuxWrapper(targetBin, binDir);

    log(`✅ Installed wrapper to: ${path.join(binDir, 'mip')}`, 'green');

    if (addToPath) {
      await addToPathInteractive();
    }
  }

  log('\n✨ Done.', 'green');
  rl.close();
}

main().catch(err => {
  log(`❌ Error: ${err.message}`, 'red');
  rl.close();
  process.exit(1);
});
