/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const config = require('../utils/config');
const { t } = require('../i18n');

/**
 * Команда для управления конфигурацией
 * mip config list
 * mip config get <key>
 * mip config set <key> <value>
 * mip config delete <key>
 * mip config reset
 * mip config edit
 */
function configCommand(argv) {
  const subcommand = argv[0] || 'list';
  const args = argv.slice(1);

  switch (subcommand) {
    case 'list':
    case 'ls':
    case 'show':
      return configList(args);
    case 'get':
      return configGet(args);
    case 'set':
      return configSet(args);
    case 'delete':
    case 'rm':
    case 'remove':
      return configDelete(args);
    case 'reset':
      return configReset(args);
    case 'edit':
      return configEdit(args);
    case 'help':
    case '--help':
    case '-h':
      return showHelp();
    default:
      console.error(chalk.red(`❌ Unknown config subcommand: ${subcommand}`));
      showHelp();
      process.exit(1);
  }
}

/**
 * Показать всю конфигурацию
 */
function configList(argv) {
  const configPath = config.detectConfig(process.cwd());
  if (!configPath) {
    console.error(chalk.red('❌ No config file found. Run "mip init" first.'));
    process.exit(1);
  }

  const conf = config.readConfig(process.cwd());
  if (!conf) {
    console.error(chalk.red('❌ Failed to read config file'));
    process.exit(1);
  }

  const format = argv.includes('--json') ? 'json' : 
                 argv.includes('--yaml') ? 'yaml' : 'pretty';

  if (format === 'json') {
    console.log(JSON.stringify(conf, null, 2));
    return;
  }

  if (format === 'yaml') {
    try {
      const yaml = require('js-yaml');
      console.log(yaml.dump(conf));
    } catch (e) {
      console.error(chalk.yellow('⚠️ js-yaml not installed, showing JSON instead'));
      console.log(JSON.stringify(conf, null, 2));
    }
    return;
  }

  // Pretty output
  console.log(chalk.blue('📋 MIP Configuration\n'));
  console.log(chalk.gray(`   File: ${chalk.cyan(path.basename(configPath.path))}`));
  console.log(chalk.gray(`   Path: ${chalk.dim(configPath.path)}`));
  console.log('');

  // Project info
  if (conf.name || conf.version) {
    console.log(chalk.bold('📦 Project:'));
    if (conf.name) console.log(`   name: ${chalk.green(conf.name)}`);
    if (conf.version) console.log(`   version: ${chalk.green(conf.version)}`);
    if (conf.description) console.log(`   description: ${chalk.gray(conf.description)}`);
    console.log('');
  }

  // Dependencies
  const deps = { ...conf.dependencies, ...conf.devDependencies };
  if (Object.keys(deps).length > 0) {
    console.log(chalk.bold('📦 Dependencies:'));
    console.log(`   dependencies: ${chalk.green(Object.keys(conf.dependencies || {}).length)} package(s)`);
    console.log(`   devDependencies: ${chalk.green(Object.keys(conf.devDependencies || {}).length)} package(s)`);
    if (Object.keys(deps).length <= 10) {
      console.log('   Packages:');
      for (const [name, version] of Object.entries(deps)) {
        console.log(`     ${chalk.cyan(name)}@${chalk.yellow(version)}`);
      }
    }
    console.log('');
  }

  // Workspaces
  if (conf.workspaces && conf.workspaces.length > 0) {
    console.log(chalk.bold('📁 Workspaces:'));
    console.log(`   ${conf.workspaces.length} workspace(s)`);
    for (const workspace of conf.workspaces) {
      console.log(`   • ${chalk.cyan(workspace)}`);
    }
    console.log('');
  }

  // Scripts
  if (conf.scripts && Object.keys(conf.scripts).length > 0) {
    console.log(chalk.bold('📜 Scripts:'));
    for (const [name, script] of Object.entries(conf.scripts)) {
      console.log(`   ${chalk.cyan(name)}: ${chalk.gray(script)}`);
    }
    console.log('');
  }

  // Registries
  if (conf.registries && Object.keys(conf.registries).length > 0) {
    console.log(chalk.bold('📦 Registries:'));
    const defaultRegistry = conf.defaultRegistry || 'npm';
    console.log(`   default: ${chalk.green(defaultRegistry)}`);
    for (const [name, registry] of Object.entries(conf.registries)) {
      const isDefault = defaultRegistry === name;
      console.log(`   ${isDefault ? chalk.green('★') : ' '} ${chalk.cyan(name)}:`);
      console.log(`     url: ${registry.url}`);
      if (registry.token) {
        const masked = registry.token.length > 8 
          ? registry.token.substring(0, 8) + '…' 
          : '••••';
        console.log(`     token: ${chalk.green('✓')} ${masked}`);
      }
    }
    console.log('');
  }

  // Other settings
  const otherKeys = Object.keys(conf).filter(key => 
    !['name', 'version', 'description', 'dependencies', 'devDependencies', 
      'workspaces', 'scripts', 'registries', 'defaultRegistry'].includes(key)
  );
  
  if (otherKeys.length > 0) {
    console.log(chalk.bold('⚙️ Other settings:'));
    for (const key of otherKeys) {
      const value = typeof conf[key] === 'object' 
        ? JSON.stringify(conf[key]) 
        : conf[key];
      console.log(`   ${chalk.cyan(key)}: ${chalk.gray(value)}`);
    }
    console.log('');
  }

  console.log(chalk.gray(`💡 Use "mip config get <key>" to view specific values`));
  console.log(chalk.gray(`   "mip config set <key> <value>" to update values`));
}

/**
 * Получить конкретное значение
 */
function configGet(argv) {
  if (argv.length < 1) {
    console.error(chalk.red('❌ Usage: mip config get <key>'));
    console.error('   Example: mip config get defaultRegistry');
    console.error('   Example: mip config get registries.github.url');
    process.exit(1);
  }

  const key = argv[0];
  const conf = config.readConfig(process.cwd());
  if (!conf) {
    console.error(chalk.red('❌ No config file found. Run "mip init" first.'));
    process.exit(1);
  }

  const value = getNestedValue(conf, key);
  
  if (value === undefined) {
    console.error(chalk.red(`❌ Key "${key}" not found in config`));
    console.log(chalk.gray('Available keys:'));
    printAvailableKeys(conf);
    process.exit(1);
  }

  // Вывод в зависимости от типа
  if (typeof value === 'object' && value !== null) {
    console.log(JSON.stringify(value, null, 2));
  } else {
    console.log(value);
  }
}

/**
 * Установить значение
 */
function configSet(argv) {
  if (argv.length < 2) {
    console.error(chalk.red('❌ Usage: mip config set <key> <value>'));
    console.error('   Example: mip config set defaultRegistry github');
    console.error('   Example: mip config set registries.github.token ghp_xxx');
    process.exit(1);
  }

  const key = argv[0];
  let value = argv.slice(1).join(' ');

  // Попытка парсинга JSON
  try {
    const parsed = JSON.parse(value);
    value = parsed;
  } catch (e) {
    // Оставляем как строку
  }

  // Читаем конфиг
  const configPath = config.detectConfig(process.cwd());
  if (!configPath) {
    console.error(chalk.red('❌ No config file found. Run "mip init" first.'));
    process.exit(1);
  }

  const conf = config.readConfig(process.cwd());
  if (!conf) {
    console.error(chalk.red('❌ Failed to read config file'));
    process.exit(1);
  }

  // Устанавливаем значение
  const oldValue = getNestedValue(conf, key);
  setNestedValue(conf, key, value);

  // Сохраняем конфиг - передаём content и cwd
  try {
    config.writeConfig(conf, process.cwd());
    console.log(chalk.green(`✅ Config updated: ${chalk.cyan(key)}`));
    console.log(`   Old: ${chalk.gray(formatValue(oldValue))}`);
    console.log(`   New: ${chalk.green(formatValue(value))}`);
  } catch (error) {
    console.error(chalk.red(`❌ Failed to save config: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Удалить значение
 */
function configDelete(argv) {
  if (argv.length < 1) {
    console.error(chalk.red('❌ Usage: mip config delete <key>'));
    console.error('   Example: mip config delete registries.github.token');
    process.exit(1);
  }

  const key = argv[0];
  
  // Читаем конфиг
  const configPath = config.detectConfig(process.cwd());
  if (!configPath) {
    console.error(chalk.red('❌ No config file found. Run "mip init" first.'));
    process.exit(1);
  }

  const conf = config.readConfig(process.cwd());
  if (!conf) {
    console.error(chalk.red('❌ Failed to read config file'));
    process.exit(1);
  }

  const oldValue = getNestedValue(conf, key);
  if (oldValue === undefined) {
    console.error(chalk.red(`❌ Key "${key}" not found in config`));
    process.exit(1);
  }

  deleteNestedValue(conf, key);

  try {
    config.writeConfig(conf, process.cwd());
    console.log(chalk.green(`✅ Deleted: ${chalk.cyan(key)}`));
    console.log(`   Old value: ${chalk.gray(formatValue(oldValue))}`);
  } catch (error) {
    console.error(chalk.red(`❌ Failed to save config: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Сбросить конфигурацию к значениям по умолчанию
 */
function configReset(argv) {
  console.warn(chalk.yellow('⚠️ This will reset all configuration to default values'));
  console.warn(chalk.yellow('   All custom settings will be lost!'));

  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('   Are you sure? (yes/no) ', (answer) => {
    rl.close();
    
    if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
      console.log('   Cancelled');
      process.exit(0);
    }

    const configPath = config.detectConfig(process.cwd());
    if (!configPath) {
      console.error(chalk.red('❌ No config file found.'));
      process.exit(1);
    }

    // Создаем пустой конфиг
    const defaultConfig = {
      name: path.basename(process.cwd()),
      version: '1.0.0',
      dependencies: {},
      devDependencies: {},
      scripts: {},
      workspaces: [],
      registries: {},
      defaultRegistry: 'npm'
    };

    try {
      config.writeConfig(defaultConfig, process.cwd());
      console.log(chalk.green('✅ Config reset to defaults'));
    } catch (error) {
      console.error(chalk.red(`❌ Failed to reset config: ${error.message}`));
      process.exit(1);
    }
  });
}

/**
 * Редактировать конфиг в редакторе
 */
function configEdit(argv) {
  const configPath = config.detectConfig(process.cwd());
  if (!configPath) {
    console.error(chalk.red('❌ No config file found. Run "mip init" first.'));
    process.exit(1);
  }

  const editor = process.env.EDITOR || process.env.VISUAL || 'nano';
  const { execSync } = require('child_process');

  try {
    console.log(chalk.gray(`📝 Opening ${path.basename(configPath.path)} in ${editor}...`));
    execSync(`${editor} "${configPath.path}"`, { stdio: 'inherit' });
    console.log(chalk.green('✅ Config edited successfully'));
  } catch (error) {
    console.error(chalk.red(`❌ Failed to open editor: ${error.message}`));
    console.log(chalk.gray(`   Set EDITOR environment variable to your preferred editor`));
    console.log(chalk.gray(`   Example: export EDITOR=vim`));
    process.exit(1);
  }
}

/**
 * Вспомогательные функции для работы с вложенными ключами
 */
function getNestedValue(obj, key) {
  const keys = key.split('.');
  let current = obj;
  
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      return undefined;
    }
  }
  
  return current;
}

function setNestedValue(obj, key, value) {
  const keys = key.split('.');
  const lastKey = keys.pop();
  let current = obj;
  
  for (const k of keys) {
    if (!(k in current) || typeof current[k] !== 'object') {
      current[k] = {};
    }
    current = current[k];
  }
  
  current[lastKey] = value;
}

function deleteNestedValue(obj, key) {
  const keys = key.split('.');
  const lastKey = keys.pop();
  let current = obj;
  
  for (const k of keys) {
    if (!(k in current) || typeof current[k] !== 'object') {
      return;
    }
    current = current[k];
  }
  
  delete current[lastKey];
}

function formatValue(value) {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function printAvailableKeys(obj, prefix = '') {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      console.log(`  ${chalk.cyan(fullKey)} (object)`);
      printAvailableKeys(value, fullKey);
    } else {
      console.log(`  ${chalk.cyan(fullKey)}`);
    }
  }
}

/**
 * Показать справку
 */
function showHelp() {
  console.log(`
${chalk.blue('⚙️ mip config - Manage MIP configuration')}

${chalk.bold('USAGE')}
  mip config <subcommand> [options]

${chalk.bold('SUBCOMMANDS')}
  list                    Show all configuration
  get <key>              Get a specific value
  set <key> <value>      Set a value
  delete <key>           Delete a value
  reset                  Reset to defaults
  edit                   Open config in editor

${chalk.bold('OPTIONS')}
  --json                 Output in JSON format
  --yaml                 Output in YAML format

${chalk.bold('EXAMPLES')}
  ${chalk.gray('# Show all config')}
  mip config list

  ${chalk.gray('# Show in JSON format')}
  mip config list --json

  ${chalk.gray('# Get specific value')}
  mip config get defaultRegistry

  ${chalk.gray('# Set registry as default')}
  mip config set defaultRegistry github

  ${chalk.gray('# Set nested value')}
  mip config set registries.github.token ghp_xxx

  ${chalk.gray('# Delete a value')}
  mip config delete registries.github.token

  ${chalk.gray('# Edit config manually')}
  mip config edit

  ${chalk.gray('# Reset to defaults')}
  mip config reset

${chalk.bold('SUPPORTED KEYS')}
  ${chalk.cyan('name')}              Project name
  ${chalk.cyan('version')}           Project version
  ${chalk.cyan('description')}       Project description
  ${chalk.cyan('dependencies')}      Production dependencies
  ${chalk.cyan('devDependencies')}   Development dependencies
  ${chalk.cyan('scripts')}           NPM scripts
  ${chalk.cyan('workspaces')}        Monorepo workspaces
  ${chalk.cyan('registries')}        Package registries
  ${chalk.cyan('defaultRegistry')}   Default registry name

${chalk.bold('ENVIRONMENT VARIABLES')}
  ${chalk.cyan('EDITOR')}            Editor for 'mip config edit'
  ${chalk.cyan('VISUAL')}            Alternative editor
`);
}

module.exports = { config: configCommand };