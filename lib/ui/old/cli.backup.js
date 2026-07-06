/*
 * Minimal Package Manager
 * https://github.com/kiwinatra/mip
 * MIT License · Copyright (c) 2026 kiwinatra
 */

const os = require('os');

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  underline: '\x1b[4m',

  fg: {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
  },

  bg: {
    red: '\x1b[41m',
    green: '\x1b[42m',
    yellow: '\x1b[43m',
    blue: '\x1b[44m',
    magenta: '\x1b[45m',
    cyan: '\x1b[46m',
    white: '\x1b[47m',
  },
};

/**
 * Determines if color output is supported in the current environment.
 */
function supportsColor() {
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR === '0') return false;
  if (process.env.FORCE_COLOR) return true;
  return process.stdout && process.stdout.isTTY;
}

/**
 * Applies color only if the terminal supports it.
 */
function maybeColor(text, code) {
  if (!supportsColor()) return text;
  return code + text + ANSI.reset;
}

/**
 * Colorizes text with any ANSI code.
 */
function color(text, code) {
  return maybeColor(text, code);
}

// ==========================================
// ЦВЕТНЫЕ ФУНКЦИИ — ВСЕГДА ВОЗВРАЩАЮТ ЦВЕТНОЙ ТЕКСТ
// ==========================================

function header(text) {
  return maybeColor(text, ANSI.fg.cyan + ANSI.bold);
}

function success(text) {
  return maybeColor(text, ANSI.fg.green + ANSI.bold);
}

function warn(text) {
  return maybeColor(text, ANSI.fg.yellow + ANSI.bold);
}

function error(text) {
  return maybeColor(text, ANSI.fg.red + ANSI.bold);
}

function dim(text) {
  return maybeColor(text, ANSI.dim);
}

function highlight(text) {
  return maybeColor(text, ANSI.fg.magenta + ANSI.bold);
}

function info(text) {
  return maybeColor(text, ANSI.fg.blue);
}

function successDim(text) {
  return maybeColor(text, ANSI.fg.green + ANSI.dim);
}

function errorDim(text) {
  return maybeColor(text, ANSI.fg.red + ANSI.dim);
}

function cyan(text) {
  return maybeColor(text, ANSI.fg.cyan);
}

function green(text) {
  return maybeColor(text, ANSI.fg.green);
}

function yellow(text) {
  return maybeColor(text, ANSI.fg.yellow);
}

function red(text) {
  return maybeColor(text, ANSI.fg.red);
}

function magenta(text) {
  return maybeColor(text, ANSI.fg.magenta);
}

function blue(text) {
  return maybeColor(text, ANSI.fg.blue);
}

function white(text) {
  return maybeColor(text, ANSI.fg.white);
}

function gray(text) {
  return maybeColor(text, ANSI.fg.gray);
}

function bold(text) {
  return maybeColor(text, ANSI.bold);
}

function underline(text) {
  return maybeColor(text, ANSI.underline);
}

// ==========================================
// КОМБИНИРОВАННЫЕ СТИЛИ
// ==========================================

function greenBold(text) {
  return maybeColor(text, ANSI.fg.green + ANSI.bold);
}

function redBold(text) {
  return maybeColor(text, ANSI.fg.red + ANSI.bold);
}

function yellowBold(text) {
  return maybeColor(text, ANSI.fg.yellow + ANSI.bold);
}

function cyanBold(text) {
  return maybeColor(text, ANSI.fg.cyan + ANSI.bold);
}

function magentaBold(text) {
  return maybeColor(text, ANSI.fg.magenta + ANSI.bold);
}

function whiteBold(text) {
  return maybeColor(text, ANSI.fg.white + ANSI.bold);
}

// ==========================================
// ФОНОВЫЕ ЦВЕТА
// ==========================================

function bgRed(text) {
  return maybeColor(text, ANSI.bg.red);
}

function bgGreen(text) {
  return maybeColor(text, ANSI.bg.green);
}

function bgYellow(text) {
  return maybeColor(text, ANSI.bg.yellow);
}

function bgBlue(text) {
  return maybeColor(text, ANSI.bg.blue);
}

function bgMagenta(text) {
  return maybeColor(text, ANSI.bg.magenta);
}

function bgCyan(text) {
  return maybeColor(text, ANSI.bg.cyan);
}

function bgWhite(text) {
  return maybeColor(text, ANSI.bg.white);
}

// ==========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==========================================

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
    let barColor;
    if (p >= 90) barColor = ANSI.fg.green;
    else if (p >= 50) barColor = ANSI.fg.yellow;
    else barColor = ANSI.fg.cyan;
    bar = maybeColor(fillChar.repeat(filled), barColor) + maybeColor(emptyChar.repeat(empty), ANSI.fg.gray);
  } else {
    bar = fillChar.repeat(filled) + emptyChar.repeat(empty);
  }

  return `${bar}`;
}

function writeProgressLine({ label = '', percent, postfix = '' }) {
  const bar = renderProgressBar({ percent });
  const p = formatPercent(percent);

  let left = label ? `${label} ` : '';
  const post = postfix ? ` ${postfix}` : '';

  if (supportsColor()) {
    left = maybeColor(left, ANSI.fg.cyan);
  }

  const line = `${left}${bar} ${p}%${post}`;
  process.stdout.write(`\r${line} `);
}

function newLine() {
  process.stdout.write(os.EOL);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function padRight(s, n, fill = ' ') {
  const str = String(s);
  if (str.length >= n) return str.slice(0, n);
  return str + fill.repeat(n - str.length);
}

function stripAnsi(s) {
  // eslint-disable-next-line no-control-regex
  const pattern = /\x1b\[[0-9;]*m/g;
  return s.replace(pattern, '');
}

function ellipsize(s, n, tail = '…') {
  const str = String(s);
  if (n <= 0) return '';
  if (str.length <= n) return str;
  if (n === 1) return tail;
  return str.slice(0, n - 1) + tail;
}

function drawBorder({ width, height, title = '' }) {
  const w = Math.max(2, width);
  const top = '┌' + '─'.repeat(w - 2) + '┐';
  const midTitle = title ? ` ${title} ` : '';
  const t = ellipsize(midTitle, w - 2);
  const topLine = title ? '┌' + padRight(t, w - 2) + '┐' : top;
  const empty = '│' + ' '.repeat(w - 2) + '│';
  const lines = [];
  lines.push(topLine);
  for (let i = 0; i < height - 2; i++) lines.push(empty);
  lines.push('└' + '─'.repeat(w - 2) + '┘');
  return lines.join(os.EOL);
}

function formatTwoCols({
  leftLines,
  rightLines,
  leftWidth,
  rightWidth,
  leftSelectedIndex = -1,
  rowOffset = 0,
  totalRows,
}) {
  const ls = Array.isArray(leftLines) ? leftLines : [];
  const rs = Array.isArray(rightLines) ? rightLines : [];
  const rows = totalRows || Math.max(ls.length, rs.length);
  const out = [];

  for (let r = 0; r < rows; r++) {
    const li = r + rowOffset;
    const ri = r + rowOffset;

    const left = li >= 0 && li < ls.length ? String(ls[li]) : '';
    const right = ri >= 0 && ri < rs.length ? String(rs[ri]) : '';

    let leftCell = ellipsize(left, leftWidth);
    let rightCell = ellipsize(right, rightWidth);

    if (supportsColor()) {
      leftCell = maybeColor(leftCell, ANSI.fg.green);
      rightCell = maybeColor(rightCell, ANSI.fg.white);
    }

    out.push(leftCell + rightCell);
  }

  return out;
}

function formatKeyValueTable({ rows, keyWidth, indent = '' }) {
  if (!rows || rows.length === 0) return '';

  const maxKeyLen = keyWidth || Math.max(...rows.map(r => stripAnsi(r.key).length));
  const lines = [];

  for (const row of rows) {
    const key = row.key.padEnd(maxKeyLen);
    const value = row.value;

    if (supportsColor()) {
      lines.push(`${indent}${maybeColor(key, ANSI.fg.cyan)} ${maybeColor('→', ANSI.fg.gray)} ${maybeColor(value, ANSI.fg.white)}`);
    } else {
      lines.push(`${indent}${key} → ${value}`);
    }
  }

  return lines.join('\n');
}

function sectionHeader(text, icon = '') {
  const prefix = icon ? `${icon} ` : '';
  return maybeColor(`${prefix}${text}`, ANSI.fg.cyan + ANSI.bold);
}

function subHeader(text) {
  return maybeColor(text, ANSI.fg.white + ANSI.bold);
}

function code(text) {
  return maybeColor(text, ANSI.fg.yellow);
}

function path(text) {
  return maybeColor(text, ANSI.fg.cyan);
}

function version(text) {
  return maybeColor(text, ANSI.fg.green);
}

function packageName(text) {
  return maybeColor(text, ANSI.fg.magenta);
}

function packageVersion(text) {
  return maybeColor(text, ANSI.fg.yellow);
}

function url(text) {
  return maybeColor(text, ANSI.fg.blue + ANSI.underline);
}

function command(text) {
  return maybeColor(text, ANSI.fg.cyan + ANSI.bold);
}

function flag(text) {
  return maybeColor(text, ANSI.fg.yellow);
}

function arg(text) {
  return maybeColor(text, ANSI.fg.gray);
}

function emoji(text) {
  return text;
}

module.exports = {
  // Основные
  header,
  success,
  warn,
  error,
  dim,
  highlight,
  info,
  successDim,
  errorDim,

  // Базовые цвета
  cyan,
  green,
  yellow,
  red,
  magenta,
  blue,
  white,
  gray,

  // Стили
  bold,
  underline,

  // Комбинированные
  greenBold,
  redBold,
  yellowBold,
  cyanBold,
  magentaBold,
  whiteBold,

  // Фоновые
  bgRed,
  bgGreen,
  bgYellow,
  bgBlue,
  bgMagenta,
  bgCyan,
  bgWhite,

  // Специализированные
  code,
  path,
  version,
  packageName,
  packageVersion,
  url,
  command,
  flag,
  arg,
  emoji,

  // Форматирование
  formatPercent,
  renderProgressBar,
  writeProgressLine,
  newLine,
  clamp,
  padRight,
  stripAnsi,
  ellipsize,
  drawBorder,
  formatTwoCols,
  formatKeyValueTable,
  sectionHeader,
  subHeader,

  // Системные
  supportsColor,
  maybeColor,
  color,
};