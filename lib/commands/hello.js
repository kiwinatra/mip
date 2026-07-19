const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawn } = require('child_process');

function getSystemInfo(options = {}) {
  let osName = 'Unknown';
  let kernel = os.release();
  let shell = 'Unknown';
  let desktop = 'Unknown';
  let wm = 'Unknown';
  let theme = 'Unknown';
  let icons = 'Unknown';
  let font = 'Unknown';
  let cursor = 'Unknown';
  let terminal = process.env.TERM || 'Unknown';
  let arch = os.arch();
  
  if (options.fakeArch) {
    osName = 'Arch Linux';
    kernel = '6.10.5-arch1-1';
    arch = 'x86_64';
  }
  
  try {
    if (!options.fakeArch) {
      const content = fs.readFileSync('/etc/os-release', 'utf8');
      const match = content.match(/PRETTY_NAME="(.+?)"/);
      if (match) osName = match[1];
    }
  } catch (e) {}
  
  try {
    shell = process.env.SHELL || 'Unknown';
    shell = shell.split('/').pop();
  } catch (e) {}
  
  try {
    desktop = process.env.XDG_CURRENT_DESKTOP || process.env.DESKTOP_SESSION || 'Unknown';
  } catch (e) {}
  
  try {
    wm = execSync('wmctrl -m 2>/dev/null | grep "Name:" | awk \'{print $2}\'', { encoding: 'utf8' }).trim();
    if (!wm) wm = process.env.WM || 'Unknown';
  } catch (e) { wm = 'Unknown'; }
  
  try {
    theme = execSync('gsettings get org.gnome.desktop.interface gtk-theme 2>/dev/null', { encoding: 'utf8' }).trim().replace(/'/g, '');
    if (!theme) theme = execSync('xfconf-query -c xsettings -p /Net/ThemeName 2>/dev/null', { encoding: 'utf8' }).trim();
  } catch (e) { theme = 'Unknown'; }
  
  try {
    icons = execSync('gsettings get org.gnome.desktop.interface icon-theme 2>/dev/null', { encoding: 'utf8' }).trim().replace(/'/g, '');
    if (!icons) icons = execSync('xfconf-query -c xsettings -p /Net/IconThemeName 2>/dev/null', { encoding: 'utf8' }).trim();
  } catch (e) { icons = 'Unknown'; }
  
  try {
    font = execSync('gsettings get org.gnome.desktop.interface monospace-font-name 2>/dev/null', { encoding: 'utf8' }).trim().replace(/'/g, '');
  } catch (e) { font = 'Unknown'; }
  
  try {
    cursor = execSync('gsettings get org.gnome.desktop.interface cursor-theme 2>/dev/null', { encoding: 'utf8' }).trim().replace(/'/g, '');
  } catch (e) { cursor = 'Unknown'; }
  
  try {
    terminal = process.env.TERM_PROGRAM || process.env.TERM || 'Unknown';
  } catch (e) {}
  
  return {
    user: process.env.USER || 'user',
    host: os.hostname(),
    os: osName,
    kernel: kernel,
    uptime: formatUptime(os.uptime()),
    packages: getPackageCount(options),
    shell: shell,
    terminal: terminal,
    cpu: getCPUInfo(),
    gpu: getGPUInfo(),
    memory: `${Math.round((os.totalmem() - os.freemem()) / 1024 / 1024)}MiB / ${Math.round(os.totalmem() / 1024 / 1024)}MiB`,
    resolution: getResolution(),
    desktop: desktop,
    wm: wm,
    theme: theme,
    icons: icons,
    font: font,
    cursor: cursor,
    arch: arch
  };
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  let parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
  return parts.join(', ');
}

function getPackageCount(options = {}) {
  let counts = [];
  
  if (options.fakeArch) {
    try {
      const pacman = execSync('pacman -Q 2>/dev/null | wc -l', { encoding: 'utf8' }).trim();
      if (pacman && parseInt(pacman) > 0) {
        counts.push(`${parseInt(pacman)} (pacman)`);
      } else {
        counts.push('1234 (pacman)');
      }
    } catch (e) {
      counts.push('1234 (pacman)');
    }
    return counts.join(', ');
  }
  
  try {
    const dpkg = execSync('dpkg -l 2>/dev/null | wc -l', { encoding: 'utf8' }).trim();
    if (dpkg && parseInt(dpkg) > 0) counts.push(`${parseInt(dpkg) - 5} (dpkg)`);
  } catch (e) {}
  try {
    const pacman = execSync('pacman -Q 2>/dev/null | wc -l', { encoding: 'utf8' }).trim();
    if (pacman && parseInt(pacman) > 0) counts.push(`${pacman} (pacman)`);
  } catch (e) {}
  try {
    const snap = execSync('snap list 2>/dev/null | wc -l', { encoding: 'utf8' }).trim();
    if (snap && parseInt(snap) > 1) counts.push(`${parseInt(snap) - 1} (snap)`);
  } catch (e) {}
  try {
    const flatpak = execSync('flatpak list 2>/dev/null | wc -l', { encoding: 'utf8' }).trim();
    if (flatpak && parseInt(flatpak) > 0) counts.push(`${flatpak} (flatpak)`);
  } catch (e) {}
  try {
    const brew = execSync('brew list --formula 2>/dev/null | wc -l', { encoding: 'utf8' }).trim();
    if (brew && parseInt(brew) > 0) counts.push(`${brew} (brew)`);
  } catch (e) {}
  return counts.length > 0 ? counts.join(', ') : 'Unknown';
}

function getCPUInfo() {
  try {
    const cpus = os.cpus();
    if (cpus.length === 0) return 'Unknown CPU';
    const model = cpus[0].model.replace(/\s+\(R\)/g, '').replace(/\s+\(TM\)/g, '').trim();
    const cores = cpus.length;
    const speed = (os.cpus()[0].speed / 1000).toFixed(2);
    return `${model} (${cores}) @ ${speed}GHz`;
  } catch (e) {
    return 'Unknown CPU';
  }
}

function getGPUInfo() {
  try {
    const lspci = execSync('lspci 2>/dev/null | grep -E "VGA|3D|Display"', { encoding: 'utf8' }).trim();
    if (lspci) {
      const lines = lspci.split('\n');
      return lines.map(l => l.replace(/^[^\s]+\s+[^\s]+\s+/, '').trim()).join('\n                 ');
    }
  } catch (e) {}
  try {
    const glxinfo = execSync('glxinfo 2>/dev/null | grep "OpenGL renderer"', { encoding: 'utf8' }).trim();
    if (glxinfo) {
      return glxinfo.replace('OpenGL renderer string: ', '');
    }
  } catch (e) {}
  return 'Unknown GPU';
}

function getResolution() {
  try {
    const xrandr = execSync('xrandr 2>/dev/null | grep " connected" | grep -o "[0-9]*x[0-9]*" | head -1', { encoding: 'utf8' }).trim();
    if (xrandr) return xrandr;
  } catch (e) {}
  try {
    const wmctrl = execSync('wmctrl -d 2>/dev/null | grep "*" | awk \'{print $9}\'', { encoding: 'utf8' }).trim();
    if (wmctrl) return wmctrl;
  } catch (e) {}
  return 'Unknown';
}

function getAsciiLogo() {
  return [
    '           _       ',
    ' _ __ ___ (_)_ __  ',
    '| \'_ ` _ \\| | \'_ \\ ',
    '| | | | | | | |_) |',
    '|_| |_| |_|_| .__/ ',
    '            |_|    ',
    '                   ',
    '                   ',
    '                   ',
    '                   ',
    '                   ',
    '                   ',
    '                   '
  ];
}

function typewriterLine(line, delay = 20) {
  return new Promise((resolve) => {
    if (!line || line === undefined) {
      process.stdout.write('\n');
      resolve();
      return;
    }
    
    const chars = line.split('');
    let i = 0;
    
    const interval = setInterval(() => {
      if (i < chars.length) {
        const char = chars[i];
        if (char !== undefined && char !== null) {
          process.stdout.write(char);
        }
        i++;
      } else {
        clearInterval(interval);
        process.stdout.write('\n');
        resolve();
      }
    }, delay);
  });
}

function parseArgs(args) {
  const options = {
    noTypewriter: false,
    fakeArch: false,
    help: false
  };
  
  for (const arg of args) {
    if (arg === '--notypewriter' || arg === '-nt') {
      options.noTypewriter = true;
    } else if (arg === '--osArch' || arg === '-oa') {
      options.fakeArch = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }
  
  return options;
}

function showHelp() {
  const c = '\x1b[36m';
  const b = '\x1b[1m';
  const r = '\x1b[0m';
  const g = '\x1b[32m';
  const y = '\x1b[33m';
  
  console.log(`
${c}${b}mip hello${r} - Show system information with MIP logo

${y}Options:${r}
  ${c}--notypewriter, -nt${r}    Disable typewriter effect (instant output)
  ${c}--osArch, -oa${r}         Fake Arch Linux (show as Arch with pacman packages)
  ${c}--help, -h${r}            Show this help message

${y}Examples:${r}
  ${g}mip hello${r}                    # Normal output with typewriter
  ${g}mip hello --notypewriter${r}     # Instant output
  ${g}mip hello --osArch${r}          # Show as Arch Linux
  ${g}mip hello -nt -oa${r}           # Instant output + fake Arch
  `);
}

async function hello() {
  const args = process.argv.slice(3);
  const options = parseArgs(args);
  
  if (options.help) {
    showHelp();
    return;
  }
  
  const colorReset = '\x1b[0m';
  const colorBold = '\x1b[1m';
  const colorCyan = '\x1b[36m';
  const colorWhite = '\x1b[37m';
  const colorGray = '\x1b[90m';
  const colorYellow = '\x1b[33m';
  const colorGreen = '\x1b[32m';
  const colorRed = '\x1b[31m';
  const colorMagenta = '\x1b[35m';
  const colorBlue = '\x1b[34m';
  
  const logo = getAsciiLogo();
  const maxLogoWidth = Math.max(...logo.map(l => l.length));
  
  const info = getSystemInfo(options);
  
  const labels = {
    user: 'User',
    os: 'OS',
    host: 'Host',
    arch: 'Arch',
    kernel: 'Kernel',
    uptime: 'Uptime',
    packages: 'Packages',
    shell: 'Shell',
    terminal: 'Terminal',
    cpu: 'CPU',
    gpu: 'GPU',
    memory: 'Memory',
    resolution: 'Resolution',
    desktop: 'DE',
    wm: 'WM',
    theme: 'Theme',
    icons: 'Icons',
    font: 'Font',
    cursor: 'Cursor'
  };
  
  const maxLabelLen = Math.max(...Object.values(labels).map(l => l.length));
  
  const allLines = [];
  
  const userHost = `${info.user}@${info.host}`;
  const logoLine1 = logo[0] || '';
  const padding1 = ' '.repeat(Math.max(0, 40 - maxLogoWidth));
  allLines.push({
    text: `${colorYellow}${logoLine1}${colorReset}${padding1}${colorCyan}${colorBold}${userHost}${colorReset}`,
    delay: 25
  });
  
  const sepLine = '-'.repeat(userHost.length);
  const padding2 = ' '.repeat(maxLogoWidth + Math.max(0, 40 - maxLogoWidth));
  allLines.push({
    text: `${padding2}${colorGray}${sepLine}${colorReset}`,
    delay: 15
  });
  
  const infoKeys = ['os', 'host', 'arch', 'kernel', 'uptime', 'packages', 'shell', 'terminal', 'desktop', 'wm', 'theme', 'icons', 'font', 'cursor', 'cpu', 'gpu', 'memory', 'resolution'];
  
  for (let i = 1; i < Math.max(logo.length, infoKeys.length + 1); i++) {
    const logoPart = i < logo.length ? logo[i] || '' : '';
    const padding = ' '.repeat(Math.max(0, 40 - maxLogoWidth));
    
    if (i - 1 < infoKeys.length) {
      const key = infoKeys[i - 1];
      const label = labels[key] || key;
      const paddedLabel = label.padEnd(maxLabelLen);
      let value = info[key] || 'Unknown';
      
      let valueColor = colorWhite;
      if (key === 'os') valueColor = colorGreen;
      else if (key === 'packages') valueColor = colorMagenta;
      else if (key === 'host') valueColor = colorBlue;
      else if (key === 'kernel') valueColor = colorGray;
      else if (key === 'arch') valueColor = colorCyan;
      else if (key === 'memory') {
        const parts = value.split('/');
        if (parts.length === 2) {
          const used = parseInt(parts[0].trim());
          const total = parseInt(parts[1].trim());
          if (!isNaN(used) && !isNaN(total) && total > 0) {
            const percent = (used / total) * 100;
            if (percent > 80) valueColor = colorRed;
            else if (percent > 60) valueColor = colorYellow;
            else valueColor = colorGreen;
          }
        }
      } else if (key === 'theme' || key === 'icons' || key === 'font' || key === 'cursor') {
        valueColor = colorYellow;
      } else if (key === 'wm' || key === 'desktop') {
        valueColor = colorMagenta;
      } else if (key === 'shell') {
        valueColor = colorCyan;
      }
      
      const line = `${colorYellow}${logoPart}${colorReset}${padding}${colorCyan}${paddedLabel}${colorReset} ${valueColor}${value}${colorReset}`;
      allLines.push({
        text: line,
        delay: key === 'gpu' ? 10 : 20
      });
    }
  }
  
  allLines.push({
    text: '',
    delay: 0
  });
  
  if (options.noTypewriter) {
    for (const line of allLines) {
      console.log(line.text);
    }
  } else {
    for (const line of allLines) {
      await typewriterLine(line.text, line.delay);
    }
  }
}

module.exports = { hello };