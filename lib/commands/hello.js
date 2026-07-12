/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const blessed = require('blessed');
const os = require('os');
const fs = require('fs');
const path = require('path');
const features = require('../utils/features');

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
      if (cpuModel.length > 22) cpuModel = cpuModel.substring(0, 19) + '…';
    }
  } catch (e) {}

  return {
    version: pkg.version,
    nodeVersion: process.version,
    osName,
    kernel: os.release(),
    arch: os.arch(),
    cpuModel,
    cores: os.cpus().length,
    totalMem: os.totalmem(),
    freeMem: os.freemem(),
    depCount: Object.keys(deps).length,
    uptime: os.uptime()
  };
}

function formatBytes(bytes) {
  if (bytes === 0) return '0B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)}${units[i]}`;
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
  const mipFeatures = features.loadFeatures(process.cwd());

  // Проверка включена ли команда
  if (mipFeatures['hello.enabled'] === false) {
    console.log('ℹ️ Hello command is disabled (hello.enabled: false)');
    return;
  }

  const info = getSystemInfo();

  const screen = blessed.screen({
    smartCSR: true,
    title: 'MIP - Minimal Package Manager',
    useBCE: true,
    terminal: 'xterm-256color'
  });

  screen.key(['C-c', 'escape', 'q'], () => {
    process.exit(0);
  });

  // ==========================================
  // ЛОГОТИП
  // ==========================================

  const logoContent = [
    '{magenta-fg}  ███╗{/magenta-fg}{cyan-fg}███╗{/cyan-fg}{green-fg}██╗{/green-fg}{yellow-fg}████╗{/yellow-fg}',
    '{cyan-fg}  ███╗{/cyan-fg}{green-fg}███║{/green-fg}{yellow-fg}██║{/yellow-fg}{red-fg}██╔══╗{/red-fg}',
    '{green-fg}  ██╔╗{/green-fg}{yellow-fg}██╔╝{/yellow-fg}{red-fg}██║{/red-fg}{magenta-fg}████╔╝{/magenta-fg}',
    '{yellow-fg}  ██║╚╝{/yellow-fg}{red-fg}██║{/red-fg}{magenta-fg}██║{/magenta-fg}{cyan-fg}██╔══╝{/cyan-fg}',
    '{red-fg}  ██║{/red-fg}{magenta-fg}╚═╝{/magenta-fg}{cyan-fg}██║{/cyan-fg}{green-fg}██║{/green-fg}',
    '{gray-fg}  ╚═╝{/gray-fg}{gray-fg}╚═╝{/gray-fg}{gray-fg}╚═╝{/gray-fg}',
  ].join('\n');

  const logo = blessed.box({
    parent: screen,
    top: 1,
    left: 'center',
    width: 'shrink',
    height: 6,
    content: logoContent,
    tags: true,
  });

  // ==========================================
  // ЗАГОЛОВОК
  // ==========================================

  const title = blessed.box({
    parent: screen,
    top: 8,
    left: 'center',
    width: 'shrink',
    height: 1,
    content: `{bold}{white-fg}MIP v${info.version}{/white-fg}{/bold}  {gray-fg}—{/gray-fg}  {gray-fg}Minimal Package Manager{/gray-fg}`,
    tags: true,
  });

  // ==========================================
  // РАЗДЕЛИТЕЛЬ
  // ==========================================

  const sep1 = blessed.box({
    parent: screen,
    top: 10,
    left: 'center',
    width: 44,
    height: 1,
    content: '{gray-fg}────────────────────────────────────────────{/gray-fg}',
    tags: true,
  });

  // ==========================================
  // СИСТЕМА
  // ==========================================

  // Применяем тему из фич
  const darkTheme = mipFeatures['hello.darkTheme'] !== false;
  
  const sysContent = [
    `{bold}{white-fg}  System{/white-fg}{/bold}`,
    `    {gray-fg}Node{/gray-fg}   {white-fg}${info.nodeVersion}{/white-fg}`,
    `    {gray-fg}OS{/gray-fg}     {white-fg}${info.osName}{/white-fg}`,
    `    {gray-fg}Kernel{/gray-fg} {white-fg}${info.kernel}{/white-fg}`,
    `    {gray-fg}Arch{/gray-fg}   {white-fg}${info.arch}{/white-fg}`,
    ``,
    `{bold}{white-fg}  Hardware{/white-fg}{/bold}`,
    `    {gray-fg}CPU{/gray-fg}    {white-fg}${info.cpuModel}{/white-fg}`,
    `    {gray-fg}Cores{/gray-fg}  {white-fg}${info.cores}{/white-fg}`,
    `    {gray-fg}RAM{/gray-fg}    {white-fg}${formatBytes(info.totalMem)}{/white-fg}  {gray-fg}(${formatBytes(info.freeMem)} free){/gray-fg}`,
    `    {gray-fg}Uptime{/gray-fg} {white-fg}${formatUptime(info.uptime)}{/white-fg}`,
    ``,
    `{bold}{white-fg}  Project{/white-fg}{/bold}`,
    `    {gray-fg}Config{/gray-fg}   {white-fg}${getConfigFile()}{/white-fg}`,
    `    {gray-fg}Deps{/gray-fg}     {white-fg}${info.depCount}{/white-fg}`,
    `    {gray-fg}Workspaces{/gray-fg} {white-fg}${hasWorkspaces() ? '✓ yes' : '✗ no'}{/white-fg}`,
  ].join('\n');

  const sysBox = blessed.box({
    parent: screen,
    top: 12,
    left: 'center',
    width: 'shrink',
    height: 'shrink',
    content: sysContent,
    tags: true,
    style: darkTheme ? {
      fg: 'white',
      bg: 'black'
    } : {
      fg: 'black',
      bg: 'white'
    }
  });

  // ==========================================
  // РАЗДЕЛИТЕЛЬ 2
  // ==========================================

  const sep2 = blessed.box({
    parent: screen,
    top: 30,
    left: 'center',
    width: 44,
    height: 1,
    content: '{gray-fg}────────────────────────────────────────────{/gray-fg}',
    tags: true,
  });

  // ==========================================
  // КОМАНДЫ
  // ==========================================

  // Показываем только команды из фич
  const showCommands = mipFeatures['hello.showCommands'] !== false;
  const customCommands = mipFeatures['hello.customCommands'] || [];
  
  let cmdContent = [];
  if (showCommands) {
    cmdContent = [
      `{bold}{white-fg}  Quick Commands{/white-fg}{/bold}`,
      `    {gray-fg}mip install{/gray-fg}  {gray-fg}<pkg>{/gray-fg}   {gray-fg}install package{/gray-fg}`,
      `    {gray-fg}mip update{/gray-fg}          {gray-fg}update deps{/gray-fg}`,
      `    {gray-fg}mip server{/gray-fg}          {gray-fg}web dashboard{/gray-fg}`,
      `    {gray-fg}mip registry list{/gray-fg}   {gray-fg}show registries{/gray-fg}`,
      `    {gray-fg}mip --help{/gray-fg}          {gray-fg}full help{/gray-fg}`,
    ];
    
    // Добавляем кастомные команды из фич
    if (customCommands.length > 0) {
      cmdContent.push(``);
      cmdContent.push(`{bold}{white-fg}  Custom Commands{/white-fg}{/bold}`);
      for (const cmd of customCommands) {
        cmdContent.push(`    {gray-fg}${cmd}{/gray-fg}`);
      }
    }
  }

  const cmdBox = blessed.box({
    parent: screen,
    top: 32,
    left: 'center',
    width: 'shrink',
    height: 'shrink',
    content: cmdContent.join('\n'),
    tags: true,
  });

  // ==========================================
  // ФУТЕР
  // ==========================================

  const footer = blessed.box({
    parent: screen,
    bottom: 2,
    left: 'center',
    width: 'shrink',
    height: 1,
    content: `{gray-fg}❤️  MIT License · ${new Date().getFullYear()}{/gray-fg}  {cyan-fg}⠋{/cyan-fg}`,
    tags: true,
  });

  // ==========================================
  // ПОДСКАЗКА
  // ==========================================

  const hint = blessed.box({
    parent: screen,
    bottom: 1,
    left: 'center',
    width: 'shrink',
    height: 1,
    content: `{gray-fg}Press Ctrl+C, Esc or q to exit{/gray-fg}`,
    tags: true,
  });

  // ==========================================
  // АНИМАЦИЯ СПИННЕРА
  // ==========================================

  const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let frameIndex = 0;

  const spinnerInterval = setInterval(() => {
    frameIndex = (frameIndex + 1) % spinnerFrames.length;
    footer.setContent(`{gray-fg}❤️  MIT License · ${new Date().getFullYear()}{/gray-fg}  {cyan-fg}${spinnerFrames[frameIndex]}{/cyan-fg}`);
    screen.render();
  }, 120);

  // ==========================================
  // ОБНОВЛЕНИЕ ДАННЫХ
  // ==========================================

  const updateInterval = setInterval(() => {
    const newInfo = getSystemInfo();
    sysBox.setContent([
      `{bold}{white-fg}  System{/white-fg}{/bold}`,
      `    {gray-fg}Node{/gray-fg}   {white-fg}${newInfo.nodeVersion}{/white-fg}`,
      `    {gray-fg}OS{/gray-fg}     {white-fg}${newInfo.osName}{/white-fg}`,
      `    {gray-fg}Kernel{/gray-fg} {white-fg}${newInfo.kernel}{/white-fg}`,
      `    {gray-fg}Arch{/gray-fg}   {white-fg}${newInfo.arch}{/white-fg}`,
      ``,
      `{bold}{white-fg}  Hardware{/white-fg}{/bold}`,
      `    {gray-fg}CPU{/gray-fg}    {white-fg}${newInfo.cpuModel}{/white-fg}`,
      `    {gray-fg}Cores{/gray-fg}  {white-fg}${newInfo.cores}{/white-fg}`,
      `    {gray-fg}RAM{/gray-fg}    {white-fg}${formatBytes(newInfo.totalMem)}{/white-fg}  {gray-fg}(${formatBytes(newInfo.freeMem)} free){/gray-fg}`,
      `    {gray-fg}Uptime{/gray-fg} {white-fg}${formatUptime(newInfo.uptime)}{/white-fg}`,
      ``,
      `{bold}{white-fg}  Project{/white-fg}{/bold}`,
      `    {gray-fg}Config{/gray-fg}   {white-fg}${getConfigFile()}{/white-fg}`,
      `    {gray-fg}Deps{/gray-fg}     {white-fg}${newInfo.depCount}{/white-fg}`,
      `    {gray-fg}Workspaces{/gray-fg} {white-fg}${hasWorkspaces() ? '✓ yes' : '✗ no'}{/white-fg}`,
    ].join('\n'));
    screen.render();
  }, mipFeatures['hello.refreshInterval'] || 5000);

  // ==========================================
  // ОЧИСТКА ПРИ ВЫХОДЕ
  // ==========================================

  screen.on('destroy', () => {
    clearInterval(spinnerInterval);
    clearInterval(updateInterval);
  });

  screen.render();
}

module.exports = { hello };