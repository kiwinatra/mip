const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

class UnixBuilder {
  constructor() {
    this.homeDir = os.homedir();
    this.currentDir = process.cwd();
    this.mipScript = path.join(this.currentDir, 'bin', 'mip.js');
  }

  log(msg, color = 'reset') {
    const colors = {
      green: '\x1b[32m',
      blue: '\x1b[36m',
      yellow: '\x1b[33m',
      red: '\x1b[31m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[color]}${msg}${colors.reset}`);
  }

  getShellConfig() {
    const shell = process.env.SHELL || '';
    
    if (shell.includes('zsh')) return { name: '.zshrc', path: path.join(this.homeDir, '.zshrc') };
    if (shell.includes('bash')) return { name: '.bashrc', path: path.join(this.homeDir, '.bashrc') };
    if (shell.includes('fish')) return { name: '.config/fish/config.fish', path: path.join(this.homeDir, '.config/fish/config.fish') };
    
    if (fs.existsSync(path.join(this.homeDir, '.zshrc'))) return { name: '.zshrc', path: path.join(this.homeDir, '.zshrc') };
    if (fs.existsSync(path.join(this.homeDir, '.bashrc'))) return { name: '.bashrc', path: path.join(this.homeDir, '.bashrc') };
    
    return null;
  }

  addToPathShell(binPath) {
    const shellConfig = this.getShellConfig();
    if (!shellConfig) return false;
    
    const pathLine = `\n# MIP Package Manager\nexport PATH="$PATH:${binPath}"\n`;
    const content = fs.readFileSync(shellConfig.path, 'utf8');
    
    if (!content.includes(binPath)) {
      fs.appendFileSync(shellConfig.path, pathLine);
      this.log(`✅ Added to PATH in ${shellConfig.path}`, 'green');
      return true;
    }
    return false;
  }

  createWrapperScript(binaryPath, installPath) {
    const wrapperPath = path.join(installPath, 'mip');
    const wrapper = `#!/bin/bash
${binaryPath} "$@"
`;
    fs.writeFileSync(wrapperPath, wrapper);
    fs.chmodSync(wrapperPath, '755');
    return wrapperPath;
  }

  buildBinary(target, outputName) {
    this.log(`\n📦 Building for ${target}...`, 'blue');
    
    try {
      if (!fs.existsSync('dist')) fs.mkdirSync('dist');
      
      const outputPath = path.join(this.currentDir, 'dist', outputName);
      
      execSync(`npx pkg ${this.mipScript} --targets ${target} --output ${outputPath}`, {
        stdio: 'inherit'
      });
      
      const stats = fs.statSync(outputPath);
      this.log(`✅ Binary created: ${outputPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`, 'green');
      
      return outputPath;
    } catch (err) {
      this.log(`❌ Build failed: ${err.message}`, 'red');
      return null;
    }
  }

  async installWithSudo(binaryPath, targetPath) {
    return new Promise((resolve) => {
      const { execSync } = require('child_process');
      try {
        execSync(`sudo cp "${binaryPath}" "${targetPath}"`, { stdio: 'inherit' });
        execSync(`sudo chmod +x "${targetPath}"`, { stdio: 'inherit' });
        this.log(`✅ Installed to ${targetPath}`, 'green');
        resolve(true);
      } catch (err) {
        this.log(`❌ Installation failed: ${err.message}`, 'red');
        resolve(false);
      }
    });
  }

  async installToUserBin(binaryPath) {
    const userBin = path.join(this.homeDir, '.local', 'bin');
    fs.mkdirSync(userBin, { recursive: true });
    
    const targetPath = path.join(userBin, 'mip');
    fs.copyFileSync(binaryPath, targetPath);
    fs.chmodSync(targetPath, '755');
    
    this.addToPathShell(userBin);
    this.log(`✅ Installed to ${targetPath}`, 'green');
    return true;
  }

  async installToSystemBin(binaryPath) {
    const targetPath = '/usr/local/bin/mip';
    return await this.installWithSudo(binaryPath, targetPath);
  }
}

module.exports = { UnixBuilder };