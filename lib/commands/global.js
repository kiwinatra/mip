const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const GLOBAL_DIR = path.join(os.homedir(), '.mip', 'global');
const GLOBAL_BIN = path.join(GLOBAL_DIR, 'node_modules', '.bin');

async function installGlobal(packageName) {
  console.log(`🌍 Installing ${packageName} globally...`);
  
  fs.mkdirSync(GLOBAL_DIR, { recursive: true });
  
  const originalCwd = process.cwd();
  process.chdir(GLOBAL_DIR);
  
  // Сохраняем оригинальный mip.json
  const hasPackageJson = fs.existsSync('mip.json');
  if (!hasPackageJson) {
    execSync('mip init', { stdio: 'pipe' });
  }
  
  // Устанавливаем пакет
  execSync(`mip install ${packageName}`, { stdio: 'inherit' });
  
  if (!hasPackageJson) {
    fs.unlinkSync('mip.json');
  }
  
  process.chdir(originalCwd);
  
  // Добавляем в PATH если нужно
  const shell = process.env.SHELL || '';
  const configFile = shell.includes('zsh') ? '.zshrc' : '.bashrc';
  const configPath = path.join(os.homedir(), configFile);
  
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf8');
    if (!content.includes(GLOBAL_BIN)) {
      fs.appendFileSync(configPath, `\nexport PATH="$PATH:${GLOBAL_BIN}"\n`);
      console.log(`✅ Added to PATH in ${configPath}`);
      console.log(`🔄 Run: source ${configPath}`);
    }
  }
  
  console.log(`✅ ${packageName} installed globally`);
  console.log(`📁 Location: ${GLOBAL_BIN}/${packageName}`);
}

async function uninstallGlobal(packageName) {
  console.log(`🗑️ Uninstalling ${packageName} globally...`);
  
  const pkgPath = path.join(GLOBAL_DIR, 'node_modules', packageName);
  if (fs.existsSync(pkgPath)) {
    fs.rmSync(pkgPath, { recursive: true, force: true });
    console.log(`✅ ${packageName} removed globally`);
  } else {
    console.log(`❌ ${packageName} not found globally`);
  }
}

function listGlobal() {
  const modulesDir = path.join(GLOBAL_DIR, 'node_modules');
  if (fs.existsSync(modulesDir)) {
    const modules = fs.readdirSync(modulesDir).filter(m => !m.startsWith('.'));
    console.log('\n🌍 Globally installed packages:\n');
    modules.forEach(m => console.log(`  • ${m}`));
    console.log(`\n📊 Total: ${modules.length}\n`);
  } else {
    console.log('No globally installed packages');
  }
}

module.exports = { installGlobal, uninstallGlobal, listGlobal };