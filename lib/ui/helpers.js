const os = require('os');

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

function newLine() {
  process.stdout.write(os.EOL);
}

function formatPercent(percent) {
  const p = Number(percent);
  if (!Number.isFinite(p)) return '0.0';
  return p.toFixed(1);
}

module.exports = {
  clamp,
  padRight,
  stripAnsi,
  ellipsize,
  newLine,
  formatPercent,
};