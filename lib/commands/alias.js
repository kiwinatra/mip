const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');
const { loadLangForCwd, getI18n } = require('../i18n');
const features = require('../utils/features');
const log = require('../utils/log');

function t() {
  const lang = loadLangForCwd(process.cwd());
  return getI18n(lang).t;
}

function getAliasesPath() {
  const mipDir = path.join(os.homedir(), '.mip');
  if (!fs.existsSync(mipDir)) {
    fs.mkdirSync(mipDir, { recursive: true });
    log.debug(`Created .mip directory at: ${mipDir}`, { showFile: true });
  }
  return path.join(mipDir, 'aliases.yml');
}

function loadAliases() {
  const aliasesPath = getAliasesPath();
  if (fs.existsSync(aliasesPath)) {
    try {
      const data = yaml.load(fs.readFileSync(aliasesPath, 'utf8')) || {};
      log.debug(`Loaded ${Object.keys(data).length} aliases from: ${aliasesPath}`, { showFile: true });
      return data;
    } catch (e) {
      log.error(`Failed to load aliases: ${e.message}`, { showFile: true });
      return {};
    }
  }
  log.debug(`No aliases file found at: ${aliasesPath}`, { showFile: true });
  return {};
}

function saveAliases(aliases) {
  const aliasesPath = getAliasesPath();
  fs.writeFileSync(aliasesPath, yaml.dump(aliases, { indent: 2 }));
  log.debug(`Saved ${Object.keys(aliases).length} aliases to: ${aliasesPath}`, { showFile: true });
}

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

async function aliasSet(argv) {
  const mipFeatures = features.loadFeatures(process.cwd());
  log.debug(`aliasSet called with argv: ${JSON.stringify(argv)}`, { showFile: true });

  // Проверка включена ли команда
  if (mipFeatures['alias.enabled'] === false) {
    console.log('ℹ️ Alias command is disabled (alias.enabled: false)');
    log.warn('Alias command is disabled in config', { showFile: true });
    return;
  }

  const translate = t();
  
  // Проверка interactive
  if (mipFeatures['interactive.promptOnAlias'] !== false) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const name = argv[0] || 'unknown';
    const answer = await new Promise(resolve => {
      rl.question(`🔗 Create alias "${name}"? (Y/n) `, resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') {
      console.log('❌ Cancelled');
      log.info(`Alias creation cancelled for: ${name}`, { showFile: true });
      return;
    }
  }

  if (argv.length < 2) {
    console.error(`❌ ${translate('alias.set.usage')}`);
    console.error(`   ${translate('alias.set.example')}`);
    console.error(`   ${translate('alias.set.example2')}`);
    log.error('Alias set: insufficient arguments', { showFile: true });
    process.exit(1);
  }

  const name = argv[0];
  const command = argv.slice(1).join(' ');
  log.debug(`Creating alias: ${name} -> ${command}`, { showFile: true });

  const reserved = mipFeatures['alias.reservedNames'] || ['alias', 'config', 'registry', 'server', 'publish', 'help'];
  if (reserved.includes(name)) {
    console.error(`❌ ${translate('alias.set.reserved', { name })}`);
    console.error(`   ${translate('alias.set.reserved_list', { list: reserved.join(', ') })}`);
    log.error(`Alias creation failed: ${name} is reserved`, { showFile: true });
    process.exit(1);
  }

  // Проверка максимального количества алиасов
  const maxAliases = mipFeatures['alias.maxAliases'] || 100;
  const aliases = loadAliases();
  if (Object.keys(aliases).length >= maxAliases) {
    console.error(`❌ Maximum number of aliases (${maxAliases}) reached`);
    console.log(`   Remove some aliases first: mip alias remove <name>`);
    log.error(`Alias creation failed: max aliases (${maxAliases}) reached`, { showFile: true });
    process.exit(1);
  }
  
  if (aliases[name]) {
    console.warn(`⚠️ ${translate('alias.set.exists', { name, command: aliases[name] })}`);
    log.warn(`Alias "${name}" already exists: ${aliases[name]}`, { showFile: true });
    const answer = await askConfirmation(`   ${translate('alias.set.overwrite')}`);
    if (!answer) {
      console.log(`   ${translate('alias.set.cancelled')}`);
      log.info(`Alias update cancelled for: ${name}`, { showFile: true });
      process.exit(0);
    }
  }

  aliases[name] = command;
  saveAliases(aliases);

  console.log(`✅ ${translate('alias.set.success', { name, command })}`);
  console.log(`   ${translate('alias.set.stored')}`);
  log.success(`Alias created: ${name} -> ${command}`, { showFile: true });
}

async function aliasClear() {
  const mipFeatures = features.loadFeatures(process.cwd());
  log.debug('aliasClear called', { showFile: true });

  // Проверка включена ли команда
  if (mipFeatures['alias.enabled'] === false) {
    console.log('ℹ️ Alias command is disabled (alias.enabled: false)');
    log.warn('Alias command is disabled in config', { showFile: true });
    return;
  }

  const translate = t();
  const aliases = loadAliases();
  const count = Object.keys(aliases).length;

  if (count === 0) {
    console.log(`ℹ️ ${translate('alias.clear.empty')}`);
    log.info('No aliases to clear', { showFile: true });
    return;
  }

  // Проверка interactive
  if (mipFeatures['interactive.promptOnAlias'] !== false) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question(`🗑️ Clear all ${count} aliases? (y/N) `, resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('❌ Cancelled');
      log.info('Clear aliases cancelled', { showFile: true });
      return;
    }
  }

  console.warn(`⚠️ ${translate('alias.clear.warning', { count })}`);
  const answer = await askConfirmation(`   ${translate('alias.clear.confirm')}`);
  
  if (!answer) {
    console.log(`   ${translate('alias.clear.cancelled')}`);
    log.info('Clear aliases cancelled', { showFile: true });
    process.exit(0);
  }

  saveAliases({});
  console.log(`✅ ${translate('alias.clear.success', { count })}`);
  log.success(`Cleared ${count} aliases`, { showFile: true });
}

function aliasRemove(argv) {
  const mipFeatures = features.loadFeatures(process.cwd());
  log.debug(`aliasRemove called with argv: ${JSON.stringify(argv)}`, { showFile: true });

  // Проверка включена ли команда
  if (mipFeatures['alias.enabled'] === false) {
    console.log('ℹ️ Alias command is disabled (alias.enabled: false)');
    log.warn('Alias command is disabled in config', { showFile: true });
    return;
  }

  const translate = t();
  
  if (argv.length < 1) {
    console.error(`❌ ${translate('alias.remove.usage')}`);
    console.error(`   ${translate('alias.remove.example')}`);
    log.error('Alias remove: insufficient arguments', { showFile: true });
    process.exit(1);
  }

  const name = argv.join(' ');
  const aliases = loadAliases();
  log.debug(`Removing alias: ${name}`, { showFile: true });

  if (!aliases[name]) {
    console.error(`❌ ${translate('alias.remove.not_found', { name })}`);
    console.log(`   ${translate('alias.remove.available')}`);
    const entries = Object.keys(aliases);
    if (entries.length > 0) {
      console.log(`   ${entries.map(e => `"${e}"`).join(', ')}`);
    }
    log.error(`Alias not found: ${name}`, { showFile: true });
    process.exit(1);
  }

  // Проверка interactive
  if (mipFeatures['interactive.promptOnAlias'] !== false) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = new Promise(resolve => {
      rl.question(`🗑️ Remove alias "${name}"? (y/N) `, resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('❌ Cancelled');
      log.info(`Remove alias cancelled for: ${name}`, { showFile: true });
      return;
    }
  }

  const command = aliases[name];
  delete aliases[name];
  saveAliases(aliases);

  console.log(`✅ ${translate('alias.remove.success', { name, command })}`);
  log.success(`Alias removed: ${name} -> ${command}`, { showFile: true });
}

function aliasList() {
  const mipFeatures = features.loadFeatures(process.cwd());
  log.debug('aliasList called', { showFile: true });

  // Проверка включена ли команда
  if (mipFeatures['alias.enabled'] === false) {
    console.log('ℹ️ Alias command is disabled (alias.enabled: false)');
    log.warn('Alias command is disabled in config', { showFile: true });
    return;
  }

  const translate = t();
  const aliases = loadAliases();
  const entries = Object.entries(aliases);

  // Проверка JSON вывода
  const isJson = process.argv.includes('--json');

  if (isJson) {
    const result = {};
    for (const [name, command] of entries) {
      result[name] = command;
    }
    console.log(JSON.stringify(result, null, 2));
    log.debug(`Aliases listed in JSON format: ${entries.length} entries`, { showFile: true });
    return;
  }

  if (entries.length === 0) {
    console.log(`ℹ️ ${translate('alias.list.empty')}`);
    console.log(`   ${translate('alias.list.create')}`);
    console.log(`   ${translate('alias.list.example')}`);
    log.info('No aliases found', { showFile: true });
    return;
  }

  console.log(`📋 ${translate('alias.list.title')}\n`);

  entries.sort((a, b) => a[0].localeCompare(b[0]));

  // Показываем с пагинацией
  const maxDisplay = mipFeatures['alias.maxDisplay'] || 50;
  const displayEntries = entries.slice(0, maxDisplay);
  
  for (const [name, command] of displayEntries) {
    console.log(`  "${name}"  →  ${command}`);
  }
  
  if (entries.length > maxDisplay) {
    console.log(`  ... and ${entries.length - maxDisplay} more`);
  }

  console.log('');
  console.log(`💡 ${translate('alias.list.total', { count: entries.length })}`);
  console.log(`📁 ${translate('alias.list.file')}`);
  log.info(`Listed ${entries.length} aliases`, { showFile: true });
}

function alias(argv) {
  const mipFeatures = features.loadFeatures(process.cwd());
  log.debug(`alias called with argv: ${JSON.stringify(argv)}`, { showFile: true });

  // Проверка включена ли команда
  if (mipFeatures['alias.enabled'] === false) {
    console.log('ℹ️ Alias command is disabled (alias.enabled: false)');
    log.warn('Alias command is disabled in config', { showFile: true });
    return;
  }

  const subcommand = argv[0] || 'list';
  const args = argv.slice(1);
  log.debug(`Alias subcommand: ${subcommand}`, { showFile: true });

  switch (subcommand) {
    case 'set':
    case 'add':
      return aliasSet(args);
    case 'remove':
    case 'rm':
      return aliasRemove(args);
    case 'list':
    case 'ls':
      return aliasList();
    case 'clear':
      return aliasClear();
    case 'help':
    case '--help':
    case '-h':
      return showHelp();
    default:
      const translate = t();
      console.error(`❌ ${translate('alias.unknown_subcommand', { subcommand })}`);
      log.error(`Unknown alias subcommand: ${subcommand}`, { showFile: true });
      showHelp();
      process.exit(1);
  }
}

function resolveAlias(rawInput) {
  if (!resolveAlias.cache) {
    resolveAlias.cache = loadAliases();
  }
  
  const aliases = resolveAlias.cache;
  const parts = rawInput.split(' ');
  log.debug(`Resolving alias for: ${rawInput}`, { showFile: true });
  
  // Проверяем точное совпадение
  if (aliases[rawInput]) {
    const resolved = aliases[rawInput];
    const resolvedParts = resolved.split(' ');
    const result = {
      command: resolvedParts[0],
      args: resolvedParts.slice(1)
    };
    log.debug(`Alias resolved (exact): ${rawInput} -> ${resolved}`, { showFile: true });
    return result;
  }
  
  // Проверяем частичное совпадение
  let longestMatch = null;
  let longestMatchLength = 0;
  
  for (const [aliasName, aliasCommand] of Object.entries(aliases)) {
    const aliasParts = aliasName.split(' ');
    if (parts.length >= aliasParts.length) {
      const match = parts.slice(0, aliasParts.length).join(' ');
      if (match === aliasName && aliasParts.length > longestMatchLength) {
        longestMatch = aliasCommand;
        longestMatchLength = aliasParts.length;
      }
    }
  }
  
  if (longestMatch) {
    const remainingArgs = parts.slice(longestMatchLength);
    const resolvedParts = longestMatch.split(' ');
    const result = {
      command: resolvedParts[0],
      args: [...resolvedParts.slice(1), ...remainingArgs]
    };
    log.debug(`Alias resolved (partial): ${rawInput} -> ${longestMatch}`, { showFile: true });
    return result;
  }
  
  log.debug(`No alias found for: ${rawInput}`, { showFile: true });
  return {
    command: parts[0],
    args: parts.slice(1)
  };
}

function showHelp() {
  const translate = t();
  log.debug('Showing alias help', { showFile: true });
  console.log(`
📦 ${translate('alias.help.title')}

${translate('alias.help.usage')}
  mip alias <subcommand> [options]

${translate('alias.help.subcommands')}
  set <name> <command>  ${translate('alias.help.set')}
  remove <name>         ${translate('alias.help.remove')}
  list                  ${translate('alias.help.list')}
  clear                 ${translate('alias.help.clear')}
  help                  ${translate('alias.help.help')}

${translate('alias.help.features')}
  alias.enabled          - Enable/disable alias command
  alias.maxAliases       - Maximum number of aliases (default: 100)
  alias.maxDisplay       - Maximum aliases to display (default: 50)
  alias.reservedNames    - Reserved names for aliases

${translate('alias.help.examples')}
  ${translate('alias.help.example1')}
  ${translate('alias.help.example2')}
  ${translate('alias.help.example3')}
  ${translate('alias.help.example4')}

${translate('alias.help.storage')}
  ~/.mip/aliases.yml
`);
}

module.exports = { 
  alias,
  resolveAlias 
};