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
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    magenta: '\x1b[35m',
    white: '\x1b[37m',
  },
};

/**
 * Wraps text with ANSI color codes.
 * 
 * @param {string} text - Text to colorize
 * @param {string} code - ANSI escape code
 * @returns {string} Colorized text
 */
function color(text, code) {
  return code + text + ANSI.reset;
}

/**
 * Removes ANSI escape sequences from a string.
 * 
 * @param {string} s - String potentially containing ANSI codes
 * @returns {string} Plain text without ANSI codes
 */
function stripAnsi(s) {
  // Replace ANSI escape sequences without using an inline literal regex.
  // eslint-disable-next-line no-control-regex
  const pattern = /\x1b\[[0-9;]*m/g;
  return s.replace(pattern, '');
}



/**
 * Determines if color output is supported in the current environment.
 * Respects NO_COLOR and FORCE_COLOR environment variables for explicit user control.
 * 
 * @returns {boolean} Whether color output is supported
 */
function supportsColor() {
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR === '0') return false;
  return process.stdout && process.stdout.isTTY;
}

/**
 * Applies color only if the terminal supports it.
 * 
 * @param {string} text - Text to colorize
 * @param {string} code - ANSI escape code
 * @returns {string} Colorized text or plain text
 */
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

/**
 * Formats a percentage value to one decimal place.
 * 
 * @param {number|string} percent - Percentage value
 * @returns {string} Formatted percentage string
 */
function formatPercent(percent) {
  const p = Number(percent);
  if (!Number.isFinite(p)) return '0.0';
  return p.toFixed(1);
}

/**
 * Renders a progress bar with color coding based on completion:
 * - Green for >= 90% (near complete)
 * - Yellow for >= 50% (in progress)
 * - Cyan for < 50% (just started)
 * 
 * @param {Object} options - Progress bar options
 * @param {number} options.percent - Completion percentage (0-100)
 * @param {number} [options.width=30] - Total bar width in characters
 * @returns {string} Rendered progress bar
 */
function renderProgressBar({ percent, width = 30 }) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  const total = Math.max(10, width);
  const filled = Math.round((p / 100) * total);
  const empty = total - filled;

  const fillChar = '█';
  const emptyChar = '░';

  let bar = '';
  if (supportsColor()) {
    const barColor = p >= 90 ? ANSI.fg.green : p >= 50 ? ANSI.fg.yellow : ANSI.fg.cyan;
    bar = maybeColor(fillChar.repeat(filled), barColor) + emptyChar.repeat(empty);
  } else {
    bar = fillChar.repeat(filled) + emptyChar.repeat(empty);
  }

  return `${bar}`;
}

/**
 * Writes a progress line to stdout, overwriting the current line.
 * Uses carriage return (\r) to update in place without scrolling.
 * 
 * @param {Object} options - Progress line options
 * @param {string} [options.label=''] - Label prefix
 * @param {number} options.percent - Completion percentage
 * @param {string} [options.postfix=''] - Suffix text
 * @returns {void}
 */
function writeProgressLine({ label = '', percent, postfix = '' }) {
  const bar = renderProgressBar({ percent });
  const p = formatPercent(percent);

  const left = label ? `${label} ` : '';
  const post = postfix ? ` ${postfix}` : '';
  const line = `${left}${bar} ${p}%${post}`;

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

/**
 * Pads a string to the right with a specified character.
 * 
 * @param {string} s - String to pad
 * @param {number} n - Desired length
 * @param {string} [fill=' '] - Padding character
 * @returns {string} Padded string
 */
function padRight(s, n, fill = ' ') {
  const str = String(s);
  if (str.length >= n) return str.slice(0, n);
  return str + fill.repeat(n - str.length);
}

/**
 * Truncates a string with an ellipsis.
 * 
 * @param {string} s - String to truncate
 * @param {number} n - Maximum length
 * @param {string} [tail='…'] - Ellipsis character
 * @returns {string} Truncated string
 */
function ellipsize(s, n, tail = '…') {
  const str = String(s);
  if (n <= 0) return '';
  if (str.length <= n) return str;
  if (n === 1) return tail;
  return str.slice(0, n - 1) + tail;
}

/**
 * Draws a box border with an optional title.
 * 
 * @param {Object} options - Box options
 * @param {number} options.width - Box width
 * @param {number} options.height - Box height
 * @param {string} [options.title=''] - Title text (centered if provided)
 * @returns {string} ASCII box as a string with newlines
 */
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

/**
 * Formats two columns of text for side-by-side display.
 * Useful for displaying package names and versions in a grid.
 * 
 * @param {Object} options - Two-column options
 * @param {Array<string>} options.leftLines - Left column content
 * @param {Array<string>} options.rightLines - Right column content
 * @param {number} options.leftWidth - Width of left column
 * @param {number} options.rightWidth - Width of right column
 * @param {number} [options.leftSelectedIndex=-1] - Selected index (unused, reserved)
 * @param {number} [options.rowOffset=0] - Starting row offset
 * @param {number} [options.totalRows] - Total number of rows to display
 * @returns {Array<string>} Array of formatted row strings
 */
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