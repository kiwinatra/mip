const os = require('os');
const { maybeColor, ANSI } = require('./colors');
const { padRight, ellipsize, stripAnsi } = require('./helpers');

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

    if (process.stdout.isTTY && !process.env.NO_COLOR) {
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

    if (process.stdout.isTTY && !process.env.NO_COLOR) {
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

module.exports = {
  drawBorder,
  formatTwoCols,
  formatKeyValueTable,
  sectionHeader,
  subHeader,
};