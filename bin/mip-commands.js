/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */
 
const log = require('../lib/utils/log');

/**
 * file metatags
 */
function _Metatags() {
    return {
        description: "Main Commands registry for mip", 
        version: "2.2",                 
        lastUpdate: "Added rebuild command [stg]"  
    }
}

// helper functions - because we like helpers
function getArgv() {
  return process.argv;
}

function getArg(index) {
  return process.argv[index];
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function getFlagValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index !== -1 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }
  return null;
}

// main command handler - switch case go brrr
async function handleCommand(command, arg, args, options, getT) {
  const t = getT();
  
  log.debug(`Handling command: ${command}`, { showFile: true });
  log.debug(`Args: ${JSON.stringify(args)}`, { showFile: true });
  log.debug(`Options: ${JSON.stringify(options)}`, { showFile: true });

  switch (command) {
    case 'init':
      log.info('Running init command', { showFile: true });
      return require('../lib/commands/init').init();

    case 'language':
      log.info(`Running language command with arg: ${arg}`, { showFile: true });
      return require('../lib/commands/language').language(arg);

    case 'install':
    case 'i': {
      const packageNames = args.filter(a => !a.startsWith('-'));
      log.info(`Running install for packages: ${packageNames.length > 0 ? packageNames.join(', ') : 'all'}`, { showFile: true });
      return require('../lib/commands/install').install(
        packageNames.length > 0 ? packageNames : undefined,
        options
      );
    }

    case 'uninstall':
    case 'rm':
      log.info(`Running uninstall for: ${arg}`, { showFile: true });
      return require('../lib/commands/uninstall').uninstall(arg);

    case 'list':
    case 'ls':
      log.info('Running list command', { showFile: true });
      return require('../lib/commands/list').list();

    case 'update':
    case 'up':
      log.info('Running update command', { showFile: true });
      return require('../lib/commands/update').update();

    case 'search':
      log.info(`Running search for: ${arg}`, { showFile: true });
      return require('../lib/commands/search').search(arg);

    case 'info':
      log.info(`Running info for: ${arg}`, { showFile: true });
      return require('../lib/commands/info').info(arg);

    case 'outdated':
      log.info('Running outdated command', { showFile: true });
      return require('../lib/commands/outdated').outdated();

    case 'audit': {
      const fix = hasFlag('--fix');
      log.info(`Running audit with fix: ${fix}`, { showFile: true });
      const { audit } = require('../lib/commands/audit');
      return audit({ fix });
    }

    case 'legacy': {
      log.info(`Running legacy with arg: ${arg}`, { showFile: true });
      const { legacy } = require('../lib/commands/legacy');
      return legacy(arg, getArg(4));
    }

    case 'ci': {
      const frozenLockfile = hasFlag('--frozen-lockfile');
      log.info(`Running CI with frozen-lockfile: ${frozenLockfile}`, { showFile: true });
      const { ci } = require('../lib/commands/ci');
      return ci({ frozenLockfile });
    }

    case 'run':
      log.info(`Running run command: ${arg}`, { showFile: true });
      return require('../lib/commands/run').run(arg);

    case 'create':
      log.info(`Running create with: ${arg}`, { showFile: true });
      return require('../lib/commands/create').create(arg, getArg(4));

    case 'cache': {
      const cacheArgs = process.argv.slice(3);
      const options = { global: cacheArgs.includes('--global') || cacheArgs.includes('-g') };
      log.info(`Running cache with args: ${cacheArgs.join(' ')}`, { showFile: true });
      return require('../lib/commands/cache').cache(arg, options);
    }

    case 'doctor':
      log.info('Running doctor command', { showFile: true });
      return require('../lib/commands/doctor').doctor();

    case 'why':
      log.info(`Running why for: ${arg}`, { showFile: true });
      return require('../lib/commands/why').why(arg);

    case 'exec':
      log.info(`Running exec: ${arg}`, { showFile: true });
      return require('../lib/commands/exec').exec(arg);

    case 'hello':
    case 'h':
      log.info('Running hello command', { showFile: true });
      return require('../lib/commands/hello').hello();

    case 'workspaces':
      log.info(`Running workspaces with: ${arg}`, { showFile: true });
      return require('../lib/commands/workspaces').workspaces(arg, getArg(4));

    case 'repo': {
      const { repo } = require('../lib/commands/repo');
      const branch = getFlagValue('--branch') || 'main';
      const downloadPath = getFlagValue('--path') || 'download';
      log.info(`Running repo with branch: ${branch}, path: ${downloadPath}`, { showFile: true });
      return repo(arg, { branch, downloadPath });
    }

    case 'oldrepo': {
      const { repo } = require('../lib/commands/oldrepo');
      const branch = getFlagValue('--branch') || 'main';
      const downloadPath = getFlagValue('--path') || 'download';
      log.info(`Running oldrepo with branch: ${branch}, path: ${downloadPath}`, { showFile: true });
      return repo(arg, { branch, downloadPath });
    }

    case '--help':
    case '-h':
      log.info('Showing help', { showFile: true });
      return showHelp(t);

    case '--version':
    case '-v':
      const version = require('../package.json').version;
      console.log(t('cli.version', { version }));
      log.info(`Version: ${version}`, { showFile: true });
      return;

    case 'dedupe': {
      const full = hasFlag('--full') || hasFlag('-f');
      log.info(`Running dedupe with full: ${full}`, { showFile: true });
      const { dedupe } = require('../lib/commands/dedupe');
      return dedupe({ full });
    }

    case 'alias': {
      log.info('Running alias command', { showFile: true });
      const { alias } = require('../lib/commands/alias');
      const argv = process.argv.slice(3);
      return alias(argv);
    }

    case 'plugin': {
      log.info(`Running plugin with: ${getArg(3)} ${getArg(4)}`, { showFile: true });
      const { plugin } = require('../lib/commands/plugin');
      return plugin(getArg(3), getArg(4));
    }

    case 'registry': {
      log.info('Running registry command', { showFile: true });
      const { registry } = require('../lib/commands/registry');
      const argv = process.argv.slice(3);
      return registry(argv);
    }

    case 'pe': {
      const pluginName = getArg(3);
      const commandName = getArg(4);
      const args = process.argv.slice(5);
      log.info(`Running plugin exec: ${pluginName} ${commandName}`, { showFile: true });
      const { pe } = require('../lib/commands/pe');
      return pe(pluginName, commandName, args);
    }

    case 'config': {
      log.info('Running config command', { showFile: true });
      const { config } = require('../lib/commands/config');
      const argv = process.argv.slice(3);
      return config(argv);
    }

    case 'page': {
      log.info('Running page/server command', { showFile: true });
      const { server } = require('../lib/commands/server');
      const argv = process.argv.slice(3);
      return server(argv);
    }

    case 'publish': {
      log.info('Running publish command', { showFile: true });
      const { publish } = require('../lib/commands/publish');
      const argv = process.argv.slice(3);
      return publish(argv);
    }

    case 'genlock': {
      log.info('Running genlock command', { showFile: true });
      const { genlock } = require('../lib/commands/genlock');
      return genlock();
    }

    case 'feel': {
      log.info('Running feel command', { showFile: true });
      const { feel } = require('../lib/commands/feel');
      return feel();
    }

    case 'bundle': {
      log.info('Running bundle command', { showFile: true });
      const { bundle } = require('../lib/commands/bundle');
      const argv = process.argv.slice(3);
      return bundle(argv);
    }

case 'shell': {
      log.info('Running shell command', { showFile: true });
      const { shell } = require('../lib/commands/shell');
      return shell();
    }

    case 'rebuild': {
      const packageNames = args.filter(a => !a.startsWith('-'));
      const options = {
        force: hasFlag('--force') || hasFlag('-f'),
        dryRun: hasFlag('--dry-run'),
        quiet: hasFlag('--quiet'),
        script: getFlagValue('--script'),
      };
      log.info(`Running rebuild for packages: ${packageNames.length > 0 ? packageNames.join(', ') : 'all'}`, { showFile: true });
      log.debug(`Rebuild options: ${JSON.stringify(options)}`, { showFile: true });
      const { rebuild } = require('../lib/commands/rebuild');
      return rebuild(packageNames.length > 0 ? packageNames : undefined, options);
    }

    default:
      log.warn(`Unknown command: ${command}`, { showFile: true });
      return null; // if nothing works return nothing
      
  }
}

// show help - because people need guidance
function showHelp(t) {
  const version = require('../package.json').version;
  console.log(t('cli.help.full', { version }));
  log.info(`Help shown for version ${version}`, { showFile: true });
}

// export stuff so others can use it
module.exports = {
  handleCommand,
  showHelp,
  getArgv,
  getArg,
  hasFlag,
  getFlagValue,
};