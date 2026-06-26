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
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │                                                                     │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * │                                                                     │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('\n🚀 MIP Builder v4 - Ultimate Package Manager Installer\n');

const platform = os.platform();
const homeDir = os.homedir();
const currentDir = process.cwd();
const mipScript = path.join(currentDir, 'bin', 'mip.js');

const colors = {
  green: '\x1b[32m',
  blue: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function question(query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

// Проверяем существование mip.js
if (!fs.existsSync(mipScript)) {
  log('❌ Error: bin/mip.js not found!', 'red');
  process.exit(1);
}

// Делаем mip.js исполняемым
try {
  fs.chmodSync(mipScript, '755');
  log('✅ bin/mip.js ready', 'green');
} catch (err) {
  log(`⚠️ Could not chmod: ${err.message}`, 'yellow');
}

function getShellConfig() {
  const shell = process.env.SHELL || '';
  const configs = {
    zsh: { name: '.zshrc', path: path.join(homeDir, '.zshrc') },
    bash: { name: '.bashrc', path: path.join(homeDir, '.bashrc') },
    fish: {
      name: '.config/fish/config.fish',
      path: path.join(homeDir, '.config/fish/config.fish'),
    },
  };

  if (shell.includes('zsh')) return configs.zsh;
  if (shell.includes('bash')) return configs.bash;
  if (shell.includes('fish')) return configs.fish;

  if (fs.existsSync(configs.zsh.path)) return configs.zsh;
  if (fs.existsSync(configs.bash.path)) return configs.bash;

  return null;
}

function getDirSize(dir) {
  if (!fs.existsSync(dir)) return 0;
  let size = 0;
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        size += getDirSize(filePath);
      } else {
        size += stat.size;
      }
    }
  } catch (err) {
    // Ignore permission errors
  }
  return size;
}

async function installWithAlias() {
  const shellConfig = getShellConfig();

  if (!shellConfig) {
    log('❌ Could not determine shell config', 'red');
    return false;
  }

  const aliasLine = `\n# MIP Package Manager\nalias mip="node ${mipScript}"\n`;

  if (fs.existsSync(shellConfig.path)) {
    const configContent = fs.readFileSync(shellConfig.path, 'utf8');
    if (configContent.includes('alias mip=')) {
      log('⚠️ Alias already exists in ' + shellConfig.name, 'yellow');
      const answer = await question('Overwrite? (y/N): ');
      if (answer.toLowerCase() !== 'y') {
        return false;
      }
      const newContent = configContent.replace(/^# MIP Package Manager\nalias mip=.*$\n?/gm, '');
      fs.writeFileSync(shellConfig.path, newContent);
    }
  }

  fs.appendFileSync(shellConfig.path, aliasLine);
  log(`✅ Alias added to ${shellConfig.path}`, 'green');
  log(`🔄 Run: source ${shellConfig.path}`, 'blue');
  return true;
}

async function installToSystemBin() {
  const systemPaths = ['/usr/local/bin', '/usr/bin'];

  for (const systemPath of systemPaths) {
    if (fs.existsSync(systemPath) && fs.statSync(systemPath).isDirectory()) {
      try {
        const targetPath = path.join(systemPath, 'mip');
        if (fs.existsSync(targetPath)) {
          fs.unlinkSync(targetPath);
        }
        fs.symlinkSync(mipScript, targetPath);
        log(`✅ Installed to ${targetPath}`, 'green');
        return true;
      } catch (err) {
        if (err.code === 'EACCES') {
          log(`⚠️ No permission for ${systemPath} (try with sudo)`, 'yellow');
        }
      }
    }
  }

  log('❌ Could not install to system directories', 'red');
  return false;
}

async function installToUserBin() {
  const userBin = path.join(homeDir, '.local', 'bin');

  if (!fs.existsSync(userBin)) {
    fs.mkdirSync(userBin, { recursive: true });
    log(`📁 Created ${userBin}`, 'blue');
  }

  const targetPath = path.join(userBin, 'mip');
  if (fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath);
  }
  fs.symlinkSync(mipScript, targetPath);

  const shellConfig = getShellConfig();
  if (shellConfig && fs.existsSync(shellConfig.path)) {
    const pathLine = `\n# MIP Package Manager\nexport PATH="$PATH:${userBin}"\n`;
    const configContent = fs.readFileSync(shellConfig.path, 'utf8');

    if (!configContent.includes(userBin)) {
      fs.appendFileSync(shellConfig.path, pathLine);
      log(`✅ Added ${userBin} to PATH in ${shellConfig.path}`, 'green');
    }
  }

  log(`✅ Installed to ${targetPath}`, 'green');
  return true;
}

async function buildBinary() {
  log('\n📦 Building binary...', 'blue');

  try {
    // Check if pkg is installed
    try {
      execSync('npx pkg --version', { stdio: 'pipe' });
    } catch {
      log('📥 Installing pkg...', 'yellow');
      execSync('npm install -g pkg', { stdio: 'inherit' });
    }

    const binaryName = platform === 'win32' ? 'mip.exe' : `mip-${platform}`;
    const outputDir = path.join(currentDir, 'dist');
    const outputPath = path.join(outputDir, binaryName);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    log('🔨 Compiling...', 'blue');

    let target;
    switch (platform) {
      case 'linux':
        target = 'node18-linux-x64';
        break;
      case 'darwin':
        target = 'node18-macos-x64';
        break;
      case 'win32':
        target = 'node18-win-x64';
        break;
      default:
        target = 'node18';
    }

    execSync(`npx pkg ${mipScript} --targets ${target} --output ${outputPath}`, {
      stdio: 'inherit',
    });

    const stats = fs.statSync(outputPath);
    log(`✅ Binary created: ${outputPath}`, 'green');
    log(`📦 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`, 'blue');

    return outputPath;
  } catch (err) {
    log(`❌ Build failed: ${err.message}`, 'red');
    return null;
  }
}

async function installBinary(binaryPath) {
  if (!binaryPath || !fs.existsSync(binaryPath)) {
    return false;
  }

  log('\n💿 Installing binary...', 'blue');

  const options = [
    {
      name: 'User directory (~/.local/bin)',
      method: async () => {
        const userBin = path.join(homeDir, '.local', 'bin');
        const target = path.join(userBin, 'mip');
        if (!fs.existsSync(userBin)) fs.mkdirSync(userBin, { recursive: true });
        fs.copyFileSync(binaryPath, target);
        fs.chmodSync(target, '755');
        log(`✅ Copied to ${target}`, 'green');
        return true;
      },
    },
    {
      name: 'System directory (requires sudo)',
      method: async () => {
        try {
          execSync(`sudo cp "${binaryPath}" /usr/local/bin/mip`, { stdio: 'inherit' });
          execSync('sudo chmod +x /usr/local/bin/mip', { stdio: 'inherit' });
          log('✅ Installed to /usr/local/bin/mip', 'green');
          return true;
        } catch (err) {
          log(`❌ Failed: ${err.message}`, 'red');
          return false;
        }
      },
    },
  ];

  log('\nChoose installation method:', 'yellow');
  options.forEach((opt, i) => {
    log(`${i + 1}. ${opt.name}`, 'blue');
  });
  log('0. Skip', 'blue');

  const answer = await question('\nYour choice (0-2): ');

  if (answer !== '0' && options[parseInt(answer) - 1]) {
    return await options[parseInt(answer) - 1].method();
  }

  return false;
}

function installCompletion() {
  const shell = process.env.SHELL || '';
  const completionDir = path.join(currentDir, 'completion');

  if (!fs.existsSync(completionDir)) {
    return;
  }

  if (shell.includes('zsh')) {
    const zshCompletionDir = path.join(homeDir, '.zsh/completions');
    if (!fs.existsSync(zshCompletionDir)) {
      fs.mkdirSync(zshCompletionDir, { recursive: true });
    }
    const sourceFile = path.join(completionDir, 'mip-completion.zsh');
    const targetFile = path.join(zshCompletionDir, '_mip');
    if (fs.existsSync(sourceFile)) {
      fs.copyFileSync(sourceFile, targetFile);
      log('✅ Zsh completion installed', 'green');
      log('   Add to ~/.zshrc: fpath=($HOME/.zsh/completions $fpath)', 'blue');
      log('   Then run: compinit', 'blue');
    }
  } else if (shell.includes('bash')) {
    const bashCompletionDir = path.join(homeDir, '.bash_completion.d');
    if (!fs.existsSync(bashCompletionDir)) {
      fs.mkdirSync(bashCompletionDir, { recursive: true });
    }
    const sourceFile = path.join(completionDir, 'mip-completion.bash');
    const targetFile = path.join(bashCompletionDir, 'mip');
    if (fs.existsSync(sourceFile)) {
      fs.copyFileSync(sourceFile, targetFile);
      log('✅ Bash completion installed', 'green');
      log('   Add to ~/.bashrc: source ~/.bash_completion.d/mip', 'blue');
    }
  }
}

function showInstallSummary(method) {
  log('\n✨ Installation complete!\n', 'green');
  log('📋 Summary:', 'magenta');
  log(`  Method: ${method}`);
  log(
    `  Location: ${method === 'Alias' ? '~/.zshrc/.bashrc' : method === 'System' ? '/usr/local/bin' : '~/.local/bin'}`
  );
  log(`  Script: ${mipScript}`);

  log('\n🚀 Test it:', 'magenta');
  log('  mip --help');
  log('  mip init');
  log('  mip install lodash');

  log('\n💡 Next steps:', 'magenta');
  log('  • Run "mip doctor" to check system');
  log('  • Run "mip create node my-app" to create a project');
  log('  • Run "mip install -g eslint" for global installs');

  const shellConfig = getShellConfig();
  if (shellConfig && method === 'Alias') {
    log(`\n🔄 Reload your shell: source ${shellConfig.path}`, 'yellow');
  }
}

async function main() {
  log('Choose installation method:\n', 'yellow');
  log('1. Alias in ~/.zshrc/.bashrc (easiest, no sudo)', 'blue');
  log('2. Symlink to /usr/local/bin (requires sudo)', 'blue');
  log('3. Copy to ~/.local/bin (recommended, no sudo)', 'blue');
  log('4. Build binary + install (standalone executable)', 'blue');
  log('5. Full install (alias + user bin + completion)', 'blue');
  log('0. Exit', 'blue');

  const choice = await question('\nYour choice (0-5): ');

  let installed = false;
  let method = '';

  switch (choice) {
    case '1':
      installed = await installWithAlias();
      method = 'Alias';
      break;

    case '2':
      installed = await installToSystemBin();
      method = 'System symlink';
      break;

    case '3':
      installed = await installToUserBin();
      method = 'User bin';
      break;

    case '4':
      const binary = await buildBinary();
      if (binary) {
        installed = await installBinary(binary);
        method = 'Binary';
      }
      break;

    case '5':
      log('\n🚀 Running full installation...\n', 'green');
      await installWithAlias();
      await installToUserBin();
      installCompletion();
      const binFile = await buildBinary();
      if (binFile) {
        await installBinary(binFile);
      }
      installed = true;
      method = 'Full (alias + user bin + binary + completion)';
      break;

    case '0':
      log('👋 Goodbye!', 'yellow');
      rl.close();
      return;

    default:
      log('❌ Invalid choice', 'red');
      rl.close();
      return;
  }

  if (installed) {
    showInstallSummary(method);
  } else {
    log('\n❌ Installation failed or cancelled', 'red');
  }

  rl.close();
}

// Check if running as root
if (process.getuid && process.getuid() === 0) {
  log('⚠️ Running as root. Some operations may be risky.', 'yellow');
}

// Create global mip directory if not exists
const globalMipDir = path.join(homeDir, '.mip');
if (!fs.existsSync(globalMipDir)) {
  fs.mkdirSync(globalMipDir, { recursive: true });
  log('📁 Created ~/.mip directory', 'blue');
}

// Create global packages directory
const globalPackagesDir = path.join(globalMipDir, 'packages');
if (!fs.existsSync(globalPackagesDir)) {
  fs.mkdirSync(globalPackagesDir, { recursive: true });
}

main().catch(err => {
  log(`\n❌ Error: ${err.message}`, 'red');
  process.exit(1);
});
