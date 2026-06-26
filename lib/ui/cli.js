/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                                                                     │
 * │   ███╗   ███╗██╗██████╗                                             │
 * │   ████╗ ████║██║██╔══██╗                                            │
 * │   ██╔████╔██║██║██████╔╝                                            │
 * │   ██║╚██╔╝██║██║██╔═══╝                                             │
 * │   ██║ ╚═╝ ██║██║██║                                                 │
 * │   ╚═╝     ╚═╝╚═╝╚═╝                                                 │
 * │                                                                     │
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │                                                                     │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * │                                                                     │
 * └─────────────────────────────────────────────────────────────────────┘
 */

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
    white: '\x1b[37m',
  },
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

function dim(text) {
  return maybeColor(text, ANSI.dim);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function padRight(s, n, fill = ' ') {
  const str = String(s);
  if (str.length >= n) return str.slice(0, n);
  return str + fill.repeat(n - str.length);
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

    out.push(leftCell + rightCell);
  }

  return out;
}

module.exports = {
  header,
  success,
  warn,
  error,
  dim,
  writeProgressLine,
  newLine,
  stripAnsi,
  clamp,
  padRight,
  ellipsize,
  drawBorder,
  formatTwoCols,
};
