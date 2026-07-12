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
const chalk = require('chalk');
const yaml = require('js-yaml');
const config = require('../utils/config');
const features = require('../utils/features');

// ==========================================
// ГЛОБАЛЬНОЕ ХРАНИЛИЩЕ ТОКЕНОВ
// ==========================================

function getGlobalRegistryPath() {
  const home = os.homedir();
  const mipDir = path.join(home, '.mip');
  if (!fs.existsSync(mipDir)) {
    fs.mkdirSync(mipDir, { recursive: true });
  }
  return path.join(mipDir, 'registry.yml');
}

function loadGlobalRegistries() {
  const registryPath = getGlobalRegistryPath();
  if (fs.existsSync(registryPath)) {
    try {
      return yaml.load(fs.readFileSync(registryPath, 'utf8')) || {};
    } catch (e) {
      return {};
    }
  }
  return {};
}

function saveGlobalRegistries(registries) {
  const registryPath = getGlobalRegistryPath();
  fs.writeFileSync(registryPath, yaml.dump(registries, { indent: 2 }));
}

// ==========================================
// ОСНОВНАЯ КОМАНДА
// ==========================================

function registry(argv) {
  const mipFeatures = features.loadFeatures(process.cwd());
  const subcommand = argv[0] || 'list';
  const args = argv.slice(1);

  switch (subcommand) {
    case 'add':
      return registryAdd(args, mipFeatures);
    case 'remove':
    case 'rm':
      return registryRemove(args, mipFeatures);
    case 'list':
    case 'ls':
      return registryList(args, mipFeatures);
    case 'set-default':
      return registrySetDefault(args, mipFeatures);
    case 'help':
    case '--help':
    case '-h':
      return showHelp();
    default:
      console.error(chalk.red(`❌ Unknown registry subcommand: ${subcommand}`));
      showHelp();
      process.exit(1);
  }
}

/**
 * Добавление нового реестра
 */
function registryAdd(argv, mipFeatures) {
  if (argv.length < 2) {
    console.error(chalk.red('❌ Usage: mip registry add <name> <url> [--token TOKEN]'));
    console.error('   Example: mip registry add github https://npm.pkg.github.com/ --token ghp_xxx');
    process.exit(1);
  }

  const name = argv[0];
  const url = argv[1];
  
  // Валидация URL
  try {
    new URL(url);
  } catch (e) {
    console.error(chalk.red(`❌ Invalid registry URL: ${url}`));
    process.exit(1);
  }

  // Проверка на зарезервированные имена
  const reservedNames = ['npm', 'default', 'registry'];
  if (reservedNames.includes(name.toLowerCase())) {
    console.error(chalk.red(`❌ Registry name "${name}" is reserved`));
    console.error(`   Reserved names: ${reservedNames.join(', ')}`);
    process.exit(1);
  }

  // Парсим токен из аргументов
  let token = null;
  const tokenIndex = argv.indexOf('--token');
  if (tokenIndex !== -1 && argv[tokenIndex + 1]) {
    token = argv[tokenIndex + 1];
  }

  // Проверяем токен на минимальную длину (для безопасности)
  if (token && token.length < 10) {
    console.warn(chalk.yellow('⚠️ Token is very short, make sure it\'s correct'));
  }

  // Загружаем глобальные реестры
  const globalRegistries = loadGlobalRegistries();

  // Проверяем, не существует ли уже реестр с таким именем
  if (globalRegistries[name]) {
    console.error(chalk.red(`❌ Registry "${name}" already exists`));
    console.log(`   Current URL: ${globalRegistries[name].url}`);
    console.log(`   To update, remove it first: mip registry remove ${name}`);
    process.exit(1);
  }

  // Проверяем дубликат URL
  for (const [existingName, existingRegistry] of Object.entries(globalRegistries)) {
    if (existingRegistry.url === url) {
      console.warn(chalk.yellow(`⚠️ URL already exists as "${existingName}"`));
      const answer = askConfirmation('   Use it anyway? (y/N)');
      if (!answer) {
        console.log('   Cancelled');
        process.exit(0);
      }
      break;
    }
  }

  // Сохраняем в глобальный конфиг (С ТОКЕНОМ)
  globalRegistries[name] = {
    url: url,
    token: token || null,
    added: new Date().toISOString()
  };

  saveGlobalRegistries(globalRegistries);

  // Обновляем локальный mip.yml — ТОЛЬКО URL, БЕЗ ТОКЕНА!
  try {
    const conf = config.readConfig(process.cwd());
    if (conf) {
      if (!conf.registries) conf.registries = {};
      conf.registries[name] = {
        url: url
        // Токен НЕ сохраняем!
      };
      config.writeConfig(conf, process.cwd());
    }
  } catch (e) {
    // Если нет конфига — создаём новый
    const newConf = {
      name: path.basename(process.cwd()),
      version: '1.0.0',
      registries: {
        [name]: { url: url }
      }
    };
    const yamlContent = yaml.dump(newConf, { indent: 2 });
    const ymlPath = path.join(process.cwd(), 'mip.yml');
    fs.writeFileSync(ymlPath, yamlContent, 'utf8');
  }

  console.log(chalk.green(`✅ Registry "${name}" added successfully`));
  console.log(`   📦 URL: ${url}`);
  if (token) {
    console.log(`   🔑 Token: ${token.substring(0, 8)}... (stored in ~/.mip/registry.yml)`);
  } else {
    console.log(`   🔑 Token: not set`);
  }
  console.log(`   📁 Global config: ~/.mip/registry.yml`);
  console.log(`   📁 Project config: mip.yml (URL only, no token!)`);
}

/**
 * Удаление реестра
 */
function registryRemove(argv, mipFeatures) {
  if (argv.length < 1) {
    console.error(chalk.red('❌ Usage: mip registry remove <name>'));
    console.error('   Example: mip registry remove github');
    process.exit(1);
  }

  const name = argv[0];

  if (name === 'npm' || name === 'default') {
    console.error(chalk.red(`❌ Cannot remove built-in registry "${name}"`));
    console.log('   The npm registry is always available as fallback');
    process.exit(1);
  }

  // Загружаем глобальные реестры
  const globalRegistries = loadGlobalRegistries();

  if (!globalRegistries[name]) {
    console.error(chalk.red(`❌ Registry "${name}" not found`));
    process.exit(1);
  }

  // Проверяем, не используется ли этот реестр как default
  const conf = config.readConfig(process.cwd());
  if (conf && conf.defaultRegistry === name) {
    console.warn(chalk.yellow(`⚠️ Registry "${name}" is currently set as default`));
    const answer = askConfirmation('   Remove anyway and reset default to npm? (y/N)');
    if (!answer) {
      console.log('   Cancelled');
      process.exit(0);
    }
    conf.defaultRegistry = 'npm';
    config.writeConfig(conf, process.cwd());
  }

  const registryInfo = globalRegistries[name];
  console.log(`🗑️ Removing registry "${name}"...`);
  console.log(`   URL: ${registryInfo.url}`);
  
  // Удаляем из глобального конфига
  delete globalRegistries[name];
  saveGlobalRegistries(globalRegistries);

  // Удаляем из локального конфига
  if (conf && conf.registries) {
    delete conf.registries[name];
    if (Object.keys(conf.registries).length === 0) {
      delete conf.registries;
    }
    config.writeConfig(conf, process.cwd());
  }

  console.log(chalk.green(`✅ Registry "${name}" removed successfully`));
}

/**
 * Список всех реестров
 */
function registryList(argv, mipFeatures) {
  const globalRegistries = loadGlobalRegistries();
  const conf = config.readConfig(process.cwd());

  // Получаем дефолтный реестр из фич или из конфига
  let defaultRegistry = conf?.defaultRegistry || 'npm';
  if (mipFeatures['registry.default']) {
    defaultRegistry = mipFeatures['registry.default'];
  }

  console.log(chalk.blue('📦 Configured registries:\n'));

  // Показываем npm реестр
  console.log(`  ${chalk.green('✓')} ${chalk.bold('npm')} (built-in)`);
  console.log(`    URL: https://registry.npmjs.org/`);
  console.log(`    ${defaultRegistry === 'npm' ? chalk.green('★ DEFAULT') : '  '}`);
  console.log('');

  // Показываем кастомные реестры
  const entries = Object.entries(globalRegistries);
  if (entries.length === 0) {
    console.log(chalk.gray('  No custom registries configured'));
    console.log(chalk.gray(`  Add one with: mip registry add <name> <url> --token <token>\n`));
  } else {
    for (const [name, registry] of entries) {
      const isDefault = defaultRegistry === name;
      console.log(`  ${isDefault ? chalk.green('★') : ' '} ${chalk.bold(name)}`);
      console.log(`    URL: ${registry.url}`);
      
      if (registry.token) {
        const maskedToken = registry.token.length > 8 
          ? registry.token.substring(0, 8) + '…' 
          : '••••';
        console.log(`    Token: ${chalk.green('✓')} ${maskedToken}`);
      } else {
        console.log(`    Token: ${chalk.yellow('✗ not set')}`);
      }
      
      if (registry.added) {
        const addedDate = new Date(registry.added);
        console.log(`    Added: ${addedDate.toLocaleDateString()}`);
      }
      
      if (isDefault) {
        console.log(`    ${chalk.green('★ DEFAULT REGISTRY')}`);
      }
      console.log('');
    }
  }

  // Показываем текущий default
  console.log(chalk.blue(`📌 Default registry: ${chalk.bold(defaultRegistry)}`));
  console.log('');
  console.log(chalk.gray('💡 Tokens are stored securely in ~/.mip/registry.yml'));
  console.log(chalk.gray('💡 To use a registry for a specific package:'));
  console.log(chalk.gray(`   mip install <package>@<registry>:<version>`));
  console.log(chalk.gray(`   Example: mip install lodash@github:4.17.21`));
  
  // Информация о фичах
  if (mipFeatures['registry.fallbackToNpm'] === false) {
    console.log(chalk.yellow('⚠️ Fallback to npm is disabled'));
    console.log('   If custom registry fails, installation will fail');
  }
}

/**
 * Установка реестра по умолчанию
 */
function registrySetDefault(argv, mipFeatures) {
  if (argv.length < 1) {
    console.error(chalk.red('❌ Usage: mip registry set-default <name>'));
    console.error('   Example: mip registry set-default github');
    process.exit(1);
  }

  const name = argv[0];

  // Проверяем, существует ли реестр
  if (name !== 'npm') {
    const globalRegistries = loadGlobalRegistries();
    if (!globalRegistries[name]) {
      console.error(chalk.red(`❌ Registry "${name}" not found`));
      console.log('   Available registries:');
      console.log(`   • npm (built-in)`);
      for (const regName of Object.keys(globalRegistries)) {
        console.log(`   • ${regName}`);
      }
      process.exit(1);
    }
  }

  const conf = config.readConfig(process.cwd());
  if (!conf) {
    console.error(chalk.red('❌ No config file found. Run "mip init" first.'));
    process.exit(1);
  }

  conf.defaultRegistry = name;

  if (config.writeConfig(conf, process.cwd())) {
    console.log(chalk.green(`✅ Default registry set to "${name}"`));
    const registryInfo = name === 'npm' 
      ? { url: 'https://registry.npmjs.org/' }
      : loadGlobalRegistries()[name];
    console.log(`   📦 URL: ${registryInfo.url}`);
    
    // Если есть фича registry.default, обновляем её
    if (mipFeatures['registry.default']) {
      console.log(chalk.gray(`   💡 Feature registry.default will be overridden by this setting`));
    }
  } else {
    console.error(chalk.red('❌ Failed to save config'));
    process.exit(1);
  }
}

/**
 * Получить токен для реестра (используется в publish.js)
 */
function getRegistryToken(name) {
  if (name === 'npm') return null;
  const globalRegistries = loadGlobalRegistries();
  return globalRegistries[name]?.token || null;
}

/**
 * Получить URL реестра (используется в publish.js)
 */
function getRegistryUrl(name) {
  if (name === 'npm') return 'https://registry.npmjs.org/';
  const globalRegistries = loadGlobalRegistries();
  return globalRegistries[name]?.url || null;
}

/**
 * Вспомогательная функция для подтверждения действий
 */
function askConfirmation(question) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question + ' ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Показать справку
 */
function showHelp() {
  console.log(`
${chalk.blue('📦 mip registry - Manage package registries')}

${chalk.bold('USAGE')}
  mip registry <subcommand> [options]

${chalk.bold('SUBCOMMANDS')}
  add <name> <url> [--token TOKEN]  Add a new registry
  remove <name>                      Remove a registry
  list                               List all registries
  set-default <name>                 Set default registry

${chalk.bold('EXAMPLES')}
  ${chalk.gray('# Add GitHub Packages registry')}
  mip registry add github https://npm.pkg.github.com/ --token ghp_xxx

  ${chalk.gray('# Add GitLab registry')}
  mip registry add gitlab https://gitlab.com/api/v4/packages/npm/

  ${chalk.gray('# List all registries')}
  mip registry list

  ${chalk.gray('# Set GitHub as default')}
  mip registry set-default github

  ${chalk.gray('# Remove a registry')}
  mip registry remove github

${chalk.bold('SECURITY')}
  Tokens are stored securely in ${chalk.cyan('~/.mip/registry.yml')}
  They are ${chalk.green('NOT')} stored in project config files (mip.yml, mip.json)
  
  ${chalk.gray('~/.mip/registry.yml example:')}
  ${chalk.gray(`github:
  url: https://npm.pkg.github.com/
  token: ghp_xxx
  added: 2026-06-27T10:00:00.000Z`)}
`);
}

module.exports = { 
  registry,
  getRegistryToken,
  getRegistryUrl
};