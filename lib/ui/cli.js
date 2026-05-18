const os = require('os');

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  underline: '\x1b[4m',

  // foreground
  fg: {
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    magenta: '\x1b[35m',
    white: '\x1b[37m'
  }
};

function color(text, code) {
  return code + text + ANSI.reset;
}

function stripAnsi(s) {
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

function supportsColor() {
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR === '0') return false;
  return process.stdout && process.stdout.isTTY;
}

function maybeColor(text, code) {
  if (!supportsColor()) return text;
  return color(text, code);
}

function header(text) {
  return maybeColor(text, ANSI.fg.cyan);
}

function success(text) {
  return maybeColor(text, ANSI.fg.green);
}

function warn(text) {
  return maybeColor(text, ANSI.fg.yellow);
}

function error(text) {
  return maybeColor(text, ANSI.fg.red);
}

function formatPercent(percent) {
  const p = Number(percent);
  if (!Number.isFinite(p)) return '0.0';
  return p.toFixed(1);
}

function renderProgressBar({ percent, width = 30 }) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  const total = Math.max(10, width);
  const filled = Math.round((p / 100) * total);
  const empty = total - filled;

  const fillChar = '█';
  const emptyChar = '░';

  let bar = '';
  if (supportsColor()) {
    // Use color based on progress.
    const barColor = p >= 90 ? ANSI.fg.green : p >= 50 ? ANSI.fg.yellow : ANSI.fg.cyan;
    bar = maybeColor(fillChar.repeat(filled), barColor) + emptyChar.repeat(empty);
  } else {
    bar = fillChar.repeat(filled) + emptyChar.repeat(empty);
  }

  return `${bar}`;
}

function writeProgressLine({ label = '', percent, postfix = '' }) {
  const bar = renderProgressBar({ percent });
  const p = formatPercent(percent);

  const left = label ? `${label} ` : '';
  const post = postfix ? ` ${postfix}` : '';
  const line = `${left}${bar} ${p}%${post}`;

  // Keep cursor on one line.
  process.stdout.write(`\r${line} `);
}

function newLine() {
  process.stdout.write(os.EOL);
}

module.exports = {
  header,
  success,
  warn,
  error,
  writeProgressLine,
  newLine,
  stripAnsi
};

