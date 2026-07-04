/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const os = require('os');
const fs = require('fs');
const path = require('path');

// ==========================================
// ANSI ЦВЕТА
// ==========================================

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  blink: '\x1b[5m',
  inverse: '\x1b[7m',
  hidden: '\x1b[8m',
  strikethrough: '\x1b[9m',

  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
  bgGray: '\x1b[100m',
};

// ==========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==========================================

function getSystemInfo() {
  const pkg = require('../../package.json');
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  
  let osName = 'Unknown';
  try {
    const content = fs.readFileSync('/etc/os-release', 'utf8');
    const match = content.match(/PRETTY_NAME="(.+?)"/);
    if (match) osName = match[1];
  } catch (e) {}

  let cpuModel = 'Unknown CPU';
  try {
    const cpus = os.cpus();
    if (cpus.length > 0 && cpus[0].model) {
      cpuModel = cpus[0].model.replace(/\s+\(R\)/g, '').replace(/\s+\(TM\)/g, '').trim();
      if (cpuModel.length > 28) cpuModel = cpuModel.substring(0, 25) + '...';
    }
  } catch (e) {}

  return {
    version: pkg.version,
    nodeVersion: process.version,
    platform: process.platform,
    arch: os.arch(),
    osName,
    cpuModel,
    cores: os.cpus().length,
    totalMem: os.totalmem(),
    freeMem: os.freemem(),
    depCount: Object.keys(deps).length,
    uptime: os.uptime()
  };
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getConfigFile() {
  const files = ['mip.yml', 'mip.json', 'package.json'];
  for (const file of files) {
    if (fs.existsSync(path.join(process.cwd(), file))) {
      return file;
    }
  }
  return 'none';
}

function hasWorkspaces() {
  try {
    const config = require('../utils/config');
    const conf = config.readConfig(process.cwd());
    return conf && conf.workspaces && conf.workspaces.length > 0;
  } catch (e) {
    return false;
  }
}

// ==========================================
// ОСНОВНАЯ ФУНКЦИЯ
// ==========================================

function hello() {
  const info = getSystemInfo();

  // Очищаем экран
  console.clear();

  // Ширина для центрирования (80 символов)
  const W = 80;

  // ==========================================
  // ЦЕНТРИРОВАНИЕ
  // ==========================================

  function center(text) {
    const clean = text.replace(/\x1b\[[0-9;]*m/g, '');
    const pad = Math.max(0, Math.floor((W - clean.length) / 2));
    return ' '.repeat(pad) + text;
  }

  // ==========================================
  // ЛОГОТИП
  // ==========================================

  const logo = [
    `${c.magenta}  ███╗   ███╗██╗██████╗ ${c.reset}`,
    `${c.cyan}  ████╗ ████║██║██╔══██╗${c.reset}`,
    `${c.green}  ██╔████╔██║██║██████╔╝${c.reset}`,
    `${c.yellow}  ██║╚██╔╝██║██║██╔═══╝ ${c.reset}`,
    `${c.red}  ██║ ╚═╝ ██║██║██║     ${c.reset}`,
    `${c.gray}  ╚═╝     ╚═╝╚═╝╚═╝     ${c.reset}`,
  ];

  logo.forEach(line => console.log(center(line)));

  // ==========================================
  // ЗАГОЛОВОК
  // ==========================================

  console.log(center(`${c.bold}${c.white}MIP v${info.version} — Minimal Package Manager${c.reset}`));
  console.log(center(`${c.gray}${'─'.repeat(48)}${c.reset}`));
  console.log('');

  // ==========================================
  // СИСТЕМА
  // ==========================================

  const lines = [
    `${c.green}■${c.reset} ${c.bold}${c.white}System${c.reset}`,
    `  ${c.gray}Node:${c.reset}   ${c.white}${info.nodeVersion}${c.reset}`,
    `  ${c.gray}OS:${c.reset}     ${c.white}${info.osName}${c.reset}`,
    `  ${c.gray}Kernel:${c.reset} ${c.white}${os.release()}${c.reset}`,
    `  ${c.gray}Arch:${c.reset}   ${c.white}${info.arch}${c.reset}`,
    '',
    `${c.blue}■${c.reset} ${c.bold}${c.white}Hardware${c.reset}`,
    `  ${c.gray}CPU:${c.reset}    ${c.white}${info.cpuModel}${c.reset}`,
    `  ${c.gray}Cores:${c.reset}  ${c.white}${info.cores}${c.reset}`,
    `  ${c.gray}RAM:${c.reset}    ${c.white}${formatBytes(info.totalMem)}${c.reset} ${c.gray}total ·${c.reset} ${c.white}${formatBytes(info.freeMem)}${c.reset} ${c.gray}free${c.reset}`,
    `  ${c.gray}Uptime:${c.reset} ${c.white}${formatUptime(info.uptime)}${c.reset}`,
    '',
    `${c.yellow}📦${c.reset} ${c.bold}${c.white}Project${c.reset}`,
    `  ${c.gray}Config:${c.reset}     ${c.white}${getConfigFile()}${c.reset}`,
    `  ${c.gray}Deps:${c.reset}       ${c.white}${info.depCount}${c.reset}`,
    `  ${c.gray}Workspaces:${c.reset} ${c.white}${hasWorkspaces() ? '✅ yes' : '❌ no'}${c.reset}`,
  ];

  lines.forEach(line => console.log(center(line)));

  console.log('');
  console.log(center(`${c.gray}${'─'.repeat(48)}${c.reset}`));

  // ==========================================
  // КОМАНДЫ
  // ==========================================

  const cmds = [
    `${c.cyan}▶${c.reset} ${c.bold}${c.white}Quick Commands${c.reset}`,
    `  ${c.gray}mip install <pkg>${c.reset}   ${c.dim}— Install package${c.reset}`,
    `  ${c.gray}mip update${c.reset}          ${c.dim}— Update dependencies${c.reset}`,
    `  ${c.gray}mip server${c.reset}          ${c.dim}— Start web dashboard${c.reset}`,
    `  ${c.gray}mip registry list${c.reset}   ${c.dim}— Show registries${c.reset}`,
    `  ${c.gray}mip --help${c.reset}          ${c.dim}— Full help${c.reset}`,
  ];

  cmds.forEach(line => console.log(center(line)));

  console.log('');
  console.log(center(`${c.gray}${'─'.repeat(48)}${c.reset}`));

  // ==========================================
  // ФУТЕР
  // ==========================================

  const footer = `${c.gray}❤️  Made with love · MIT License · ${new Date().getFullYear()}${c.reset}`;
  console.log(center(footer));

  // ==========================================
  // ПОДСКАЗКА
  // ==========================================

  console.log('');
  console.log(center(`${c.dim}Press any key to exit...${c.reset}`));

  // ==========================================
  // ОЖИДАНИЕ НАЖАТИЯ
  // ==========================================

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.once('data', () => {
    process.stdin.setRawMode(false);
    process.stdin.pause();
    console.clear();
    process.exit(0);
  });
}

module.exports = { hello };