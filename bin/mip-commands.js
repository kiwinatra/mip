/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */
 
 /**
 * file metatags
 */
function Metatags() {
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

  switch (command) {
    case 'init':
      return require('../lib/commands/init').init();

    case 'language':
      return require('../lib/commands/language').language(arg);

    case 'install':
    case 'i': {
      const packageNames = args.filter(a => !a.startsWith('-'));
      return require('../lib/commands/install').install(
        packageNames.length > 0 ? packageNames : undefined,
        options
      );
    }

    case 'uninstall':
    case 'rm':
      return require('../lib/commands/uninstall').uninstall(arg);

    case 'list':
    case 'ls':
      return require('../lib/commands/list').list();

    case 'update':
    case 'up':
      return require('../lib/commands/update').update();

    case 'search':
      return require('../lib/commands/search').search(arg);

    case 'info':
      return require('../lib/commands/info').info(arg);

    case 'outdated':
      return require('../lib/commands/outdated').outdated();

    case 'audit': {
      const { audit } = require('../lib/commands/audit');
      return audit({ fix: hasFlag('--fix') });
    }

    case 'legacy': {
      const { legacy } = require('../lib/commands/legacy');
      return legacy(arg, getArg(4));
    }

    case 'ci': {
      const { ci } = require('../lib/commands/ci');
      return ci({ frozenLockfile: hasFlag('--frozen-lockfile') });
    }

    case 'run':
      return require('../lib/commands/run').run(arg);

    case 'create':
      return require('../lib/commands/create').create(arg, getArg(4));

    case 'cache': {
      const cacheArgs = process.argv.slice(3);
      const options = { global: cacheArgs.includes('--global') || cacheArgs.includes('-g') };
      return require('../lib/commands/cache').cache(arg, options);
    }

    case 'doctor':
      return require('../lib/commands/doctor').doctor();

    case 'why':
      return require('../lib/commands/why').why(arg);

    case 'exec':
      return require('../lib/commands/exec').exec(arg);

    case 'hello':
    case 'h':
      return require('../lib/commands/hello').hello();

    case 'workspaces':
      return require('../lib/commands/workspaces').workspaces(arg, getArg(4));

    case 'repo': {
      const { repo } = require('../lib/commands/repo');
      const branch = getFlagValue('--branch') || 'main';
      const downloadPath = getFlagValue('--path') || 'download';
      return repo(arg, { branch, downloadPath });
    }

    case 'oldrepo': {
      const { repo } = require('../lib/commands/oldrepo');
      const branch = getFlagValue('--branch') || 'main';
      const downloadPath = getFlagValue('--path') || 'download';
      return repo(arg, { branch, downloadPath });
    }

    case '--help':
    case '-h':
      return showHelp(t);

    case '--version':
    case '-v':
      console.log(t('cli.version', { version: require('../package.json').version }));
      return;

    case 'dedupe': {
      const { dedupe } = require('../lib/commands/dedupe');
      return dedupe({ full: hasFlag('--full') || hasFlag('-f') });
    }

    case 'alias': {
      const { alias } = require('../lib/commands/alias');
      const argv = process.argv.slice(3);
      return alias(argv);
    }

    case 'plugin': {
      const { plugin } = require('../lib/commands/plugin');
      return plugin(getArg(3), getArg(4));
    }

    case 'registry': {
      const { registry } = require('../lib/commands/registry');
      const argv = process.argv.slice(3);
      return registry(argv);
    }

    case 'pe': {
      const { pe } = require('../lib/commands/pe');
      const pluginName = getArg(3);
      const commandName = getArg(4);
      const args = process.argv.slice(5);
      return pe(pluginName, commandName, args);
    }

    case 'config': {
      const { config } = require('../lib/commands/config');
      const argv = process.argv.slice(3);
      return config(argv);
    }

    case 'page': {
      const { server } = require('../lib/commands/server');
      const argv = process.argv.slice(3);
      return server(argv);
    }

    case 'publish': {
      const { publish } = require('../lib/commands/publish');
      const argv = process.argv.slice(3);
      return publish(argv);
    }

    case 'genlock': {
      const { genlock } = require('../lib/commands/genlock');
      return genlock();
    }

    case 'feel': {
      const { feel } = require('../lib/commands/feel');
      return feel();
    }

    case 'bundle': {
      const { bundle } = require('../lib/commands/bundle');
      const argv = process.argv.slice(3);
      return bundle(argv);
    }

case 'shell': {
      const { shell } = require('../lib/commands/shell');
      return shell();
    }

    case 'rebuild': {
      const { rebuild } = require('../lib/commands/rebuild');
      const packageNames = args.filter(a => !a.startsWith('-'));
      const options = {
        force: hasFlag('--force') || hasFlag('-f'),
        dryRun: hasFlag('--dry-run'),
        quiet: hasFlag('--quiet'),
        script: getFlagValue('--script'),
      };
      return rebuild(packageNames.length > 0 ? packageNames : undefined, options);
    }

    default:
      return null; // if nothing works return nothing
  }
}

// show help - because people need guidance
function showHelp(t) {
  const version = require('../package.json').version;
  console.log(t('cli.help.full', { version }));
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