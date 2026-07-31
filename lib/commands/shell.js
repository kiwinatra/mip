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
const readline = require('readline');
const { loadLangForCwd, getI18n } = require('../i18n');
const features = require('../utils/features');

// term colors
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

// all available shell commands
const SHELL_COMMANDS = [
  'install', 'i', 'uninstall', 'rm', 'list', 'ls', 'update', 'up',
  'search', 'info', 'outdated', 'audit', 'doctor', 'why', 'exec',
  'run', 'init', 'create', 'cache', 'ci', 'dedupe', 'alias',
  'config', 'registry', 'plugin', 'pe', 'publish', 'genlock',
  'feel', 'hello', 'h', 'workspaces', 'repo', 'clone', 'bundle',
  'exports', 'legacy', 'language', 'page', 'shell', 'exit', 'quit',
  'clear', 'help', 'version',
];

// history file path
function getHistoryPath() {
  const dir = path.join(os.homedir(), '.mip');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'shell-history.json');
}

// load command history from disk
function loadHistory() {
  try {
    const p = getHistoryPath();
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {}
  return [];
}

// save command history to disk
function saveHistory(history) {
  try {
    fs.writeFileSync(getHistoryPath(), JSON.stringify(history.slice(-500), null, 2));
  } catch {}
}

// ascii logo
const LOGO = [
  '',
  '  ╔══════════════════════════════╗',
  '  ║  ███╗   ███╗██╗██████╗       ║',
  '  ║  ████╗ ████║██║██╔══██╗      ║',
  '  ║  ██╔████╔██║██║██████╔╝      ║',
  '  ║  ██║╚██╔╝██║██║██╔═══╝       ║',
  '  ║  ██║ ╚═╝ ██║██║██║           ║',
  '  ║  ╚═╝     ╚═╝╚═╝╚═╝           ║',
  '  ╚══════════════════════════════╝',
  '',
].join('\n');

// main shell function
async function shell() {
  const mipFeatures = features.loadFeatures(process.cwd());
  const lang = loadLangForCwd(process.cwd());
  const { t } = getI18n(lang);

  const history = loadHistory();
  let historyIndex = history.length;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    prompt: '',
    historySize: 500,
    removeHistoryDuplicates: true,
  });

  // show welcome screen
  console.clear();
  console.log(C.magenta + C.bold + LOGO + C.reset);
  console.log('  ' + C.gray + C.italic + 'MIP Interactive Shell v' + require('../../package.json').version + C.reset);
  console.log('  ' + C.gray + 'Type ' + C.cyan + 'help' + C.gray + ' for commands, ' + C.cyan + 'exit' + C.gray + ' to quit' + C.reset + '\n');

  const projectName = path.basename(process.cwd());
  console.log('  ' + C.dim + '📁 ' + projectName + C.reset);

  let pkgCount = 0;
  try {
    const loader = require('../loader');
    const manifest = loader.loadManifest(process.cwd());
    pkgCount = Object.keys(manifest).length;
  } catch {}

  console.log('  ' + C.dim + '📦 ' + pkgCount + ' packages' + C.reset);
  console.log('  ' + C.dim + '🌐 ' + lang + C.reset);
  console.log('');

  // parse and execute mip command
  async function executeMipCommand(input) {
    const trimmed = input.trim();
    if (!trimmed) return;

      // check if user typed 'mip' prefix (common mistake in shell)
  if (trimmed.toLowerCase().startsWith('mip ')) {
    const withoutMip = trimmed.slice(4).trim();
    console.log('  ' + C.yellow + 'Dang, you are in shell, there is no need to write mip <command>' + C.reset);
    console.log('  ' + C.gray + '   Try: ' + C.cyan + withoutMip + C.reset);
    // execute the command without 'mip' prefix
    return executeMipCommand(withoutMip);
  }

    const parts = trimmed.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
    const cmd = parts[0]?.toLowerCase() || '';
    const cmdArgs = parts.slice(1).map(function(a) { return a.replace(/^["']|["']$/g, ''); });

    // built-in shell commands
    if (cmd === 'exit' || cmd === 'quit') {
      console.log('\n  ' + C.yellow + C.bold + '⚓ Fair winds!' + C.reset + '\n');
      saveHistory(history);
      rl.close();
      process.exit(0);
      return;
    }

    if (cmd === 'clear') {
      console.clear();
      console.log(C.magenta + C.bold + LOGO + C.reset);
      console.log('  ' + C.gray + 'Type ' + C.cyan + 'help' + C.gray + ' for commands, ' + C.cyan + 'exit' + C.gray + ' to quit' + C.reset + '\n');
      return;
    }

    if (cmd === 'help') {
      printHelp();
      return;
    }

    if (cmd === 'version') {
      const pkg = require('../../package.json');
      console.log('  ' + C.cyan + 'mip v' + pkg.version + C.reset);
      return;
    }

    if (cmd === 'cd') {
      const target = cmdArgs[0] || os.homedir();
      try {
        process.chdir(target);
        console.log('  ' + C.green + '📂 ' + path.resolve(target) + C.reset);
      } catch (e) {
        console.log('  ' + C.red + '❌ cd: ' + e.message + C.reset);
      }
      return;
    }

    if (cmd === 'pwd') {
      console.log('  ' + C.cyan + process.cwd() + C.reset);
      return;
    }

    if (cmd === 'shell') {
      console.log('  ' + C.yellow + '⚠️ Already in shell!' + C.reset);
      return;
    }

    // execute mip command
    try {
      const hc = require('../../bin/mip-commands');
      const origArgv = process.argv;
      process.argv = ['mip', cmd].concat(cmdArgs);

      const result = await hc.handleCommand(
        cmd,
        cmdArgs[0],
        cmdArgs,
        { saveDev: false, global: false, force: false, noSave: false },
        t
      );

      process.argv = origArgv;

      if (result === null) {
        console.log('  ' + C.red + '❌ Unknown command: ' + cmd + C.reset);
        console.log('  ' + C.gray + '   Try: ' + C.cyan + 'help' + C.gray + ' for available commands' + C.reset);
      }
    } catch (e) {
      console.log('  ' + C.red + '❌ Error: ' + e.message + C.reset);
      if (process.env.DEBUG) console.error(e);
    }
  }

  // print help menu
  function printHelp() {
    console.log('\n  ' + C.bold + C.cyan + '📋 MIP Shell Commands' + C.reset + '\n');
    console.log('  ' + C.bold + C.white + 'Core:' + C.reset);
    console.log('    ' + C.cyan + 'install' + C.reset + ' <pkg>     ' + C.gray + 'Install packages' + C.reset);
    console.log('    ' + C.cyan + 'uninstall' + C.reset + ' <pkg>   ' + C.gray + 'Remove package' + C.reset);
    console.log('    ' + C.cyan + 'list' + C.reset + '              ' + C.gray + 'Show installed packages' + C.reset);
    console.log('    ' + C.cyan + 'update' + C.reset + '            ' + C.gray + 'Update all packages' + C.reset);
    console.log('    ' + C.cyan + 'search' + C.reset + ' <q>        ' + C.gray + 'Search registry' + C.reset);
    console.log('    ' + C.cyan + 'info' + C.reset + ' <pkg>        ' + C.gray + 'Package details' + C.reset);
    console.log('    ' + C.cyan + 'init' + C.reset + '              ' + C.gray + 'Init new project' + C.reset);
    console.log('    ' + C.cyan + 'run' + C.reset + ' <script>      ' + C.gray + 'Run a script' + C.reset);
    console.log('    ' + C.cyan + 'exec' + C.reset + ' <cmd>        ' + C.gray + 'Run binary' + C.reset);
    console.log('\n  ' + C.bold + C.white + 'Info & Security:' + C.reset);
    console.log('    ' + C.cyan + 'outdated' + C.reset + '          ' + C.gray + 'Show outdated packages' + C.reset);
    console.log('    ' + C.cyan + 'audit' + C.reset + '             ' + C.gray + 'Security audit' + C.reset);
    console.log('    ' + C.cyan + 'doctor' + C.reset + '            ' + C.gray + 'System diagnostics' + C.reset);
    console.log('    ' + C.cyan + 'why' + C.reset + ' <pkg>         ' + C.gray + 'Why is this installed?' + C.reset);
    console.log('    ' + C.cyan + 'feel' + C.reset + '              ' + C.gray + 'Project vibe check' + C.reset);
    console.log('    ' + C.cyan + 'hello' + C.reset + '             ' + C.gray + 'System info' + C.reset);
    console.log('\n  ' + C.bold + C.white + 'Management:' + C.reset);
    console.log('    ' + C.cyan + 'cache' + C.reset + '             ' + C.gray + 'Cache commands' + C.reset);
    console.log('    ' + C.cyan + 'config' + C.reset + '            ' + C.gray + 'Manage config' + C.reset);
    console.log('    ' + C.cyan + 'alias' + C.reset + '             ' + C.gray + 'Manage aliases' + C.reset);
    console.log('    ' + C.cyan + 'registry' + C.reset + '          ' + C.gray + 'Manage registries' + C.reset);
    console.log('    ' + C.cyan + 'dedupe' + C.reset + '            ' + C.gray + 'Deduplicate deps' + C.reset);
    console.log('    ' + C.cyan + 'ci' + C.reset + '                ' + C.gray + 'CI install' + C.reset);
    console.log('    ' + C.cyan + 'genlock' + C.reset + '           ' + C.gray + 'Generate lockfile' + C.reset);
    console.log('    ' + C.cyan + 'workspaces' + C.reset + '        ' + C.gray + 'Workspace commands' + C.reset);
    console.log('\n  ' + C.bold + C.white + 'Shell:' + C.reset);
    console.log('    ' + C.cyan + 'cd' + C.reset + ' <dir>          ' + C.gray + 'Change directory' + C.reset);
    console.log('    ' + C.cyan + 'pwd' + C.reset + '               ' + C.gray + 'Print working dir' + C.reset);
    console.log('    ' + C.cyan + 'clear' + C.reset + '             ' + C.gray + 'Clear screen' + C.reset);
    console.log('    ' + C.cyan + 'exit' + C.reset + ' / ' + C.cyan + 'quit' + C.reset + '    ' + C.gray + 'Exit shell' + C.reset);
    console.log('    ' + C.cyan + 'help' + C.reset + '              ' + C.gray + 'Show this help' + C.reset);
    console.log('    ' + C.cyan + 'version' + C.reset + '           ' + C.gray + 'Show version' + C.reset);
    console.log('\n  ' + C.gray + '💡 Tip: Use Tab for autocomplete, ↑↓ for history' + C.reset + '\n');
  }

  // tab completion
  function autocomplete(line) {
    const parts = line.trim().split(/\s+/);
    const lastPart = parts[parts.length - 1] || '';

    if (parts.length === 1) {
      const matches = SHELL_COMMANDS.filter(function(c) { return c.startsWith(lastPart); });
      return matches;
    }

    const cmd = parts[0].toLowerCase();
    if (['install', 'i', 'uninstall', 'rm', 'info', 'why', 'update'].indexOf(cmd) !== -1) {
      try {
        const loader = require('../loader');
        const manifest = loader.loadManifest(process.cwd());
        const pkgNames = Object.keys(manifest).filter(function(n) { return n.startsWith(lastPart); });
        if (pkgNames.length > 0) return pkgNames;
      } catch (e) {}
    }

    return [];
  }

  // build prompt string
  function getPrompt() {
    const dir = path.basename(process.cwd());
    return '  ' + C.cyan + C.bold + 'mip' + C.reset + ' ' + C.gray + dir + C.reset + ' ' + C.bold + '❯' + C.reset + ' ';
  }

  // main input loop
  function ask() {
    rl.question(getPrompt(), function(input) {
      var trimmed = input.trim();
      if (trimmed) {
        history.push(trimmed);
        historyIndex = history.length;
        executeMipCommand(trimmed);
      }
      setImmediate(ask);
    });
  }

  // keyboard event handlers
  rl.input.on('keypress', function(str, key) {
    if (!key) return;

    // up arrow - previous command
    if (key.name === 'up') {
      if (historyIndex > 0) {
        historyIndex--;
        var cmd = history[historyIndex] || '';
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(getPrompt() + cmd);
        rl.line = cmd;
        rl.cursor = cmd.length;
      }
      return;
    }

    // down arrow - next command
    if (key.name === 'down') {
      if (historyIndex < history.length - 1) {
        historyIndex++;
        var cmd = history[historyIndex] || '';
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(getPrompt() + cmd);
        rl.line = cmd;
        rl.cursor = cmd.length;
      } else {
        historyIndex = history.length;
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(getPrompt());
        rl.line = '';
        rl.cursor = 0;
      }
      return;
    }

    // tab - autocomplete
    if (key.name === 'tab') {
      var line = rl.line;
      var completions = autocomplete(line);

      if (completions.length === 0) {
        return;
      }

      if (completions.length === 1) {
        var parts = line.trim().split(/\s+/);
        parts[parts.length - 1] = completions[0];
        var newLine = parts.join(' ') + ' ';
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(getPrompt() + newLine);
        rl.line = newLine;
        rl.cursor = newLine.length;
        return;
      }

      if (completions.length > 1) {
        var parts = line.trim().split(/\s+/);
        var lastPart = parts[parts.length - 1] || '';
        var commonPrefix = completions[0];
        for (var i = 1; i < completions.length; i++) {
          while (completions[i].indexOf(commonPrefix) !== 0) {
            commonPrefix = commonPrefix.slice(0, -1);
          }
        }
        if (commonPrefix.length > lastPart.length) {
          parts[parts.length - 1] = commonPrefix;
          var newLine = parts.join(' ');
          readline.clearLine(process.stdout, 0);
          readline.cursorTo(process.stdout, 0);
          process.stdout.write(getPrompt() + newLine);
          rl.line = newLine;
          rl.cursor = newLine.length;
        } else {
          console.log('');
          console.log('  ' + C.gray + completions.join('  ') + C.reset);
          readline.clearLine(process.stdout, 0);
          readline.cursorTo(process.stdout, 0);
          process.stdout.write(getPrompt() + rl.line);
        }
      }
      return;
    }

    // ctrl+l - clear screen
    if (key.name === 'l' && key.ctrl) {
      console.clear();
      console.log(C.magenta + C.bold + LOGO + C.reset);
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(getPrompt() + rl.line);
      return;
    }

    // ctrl+c - exit
    if (key.name === 'c' && key.ctrl) {
      console.log('\n  ' + C.yellow + 'Bye!' + C.reset);
      saveHistory(history);
      rl.close();
      process.exit(0);
      return;
    }
  });

  rl.on('close', function() {
    saveHistory(history);
    process.exit(0);
  });

  ask();
}

module.exports = { shell };