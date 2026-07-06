const { maybeColor, ANSI } = require('./colors');
const { formatPercent } = require('./helpers');

function renderProgressBar({ percent, width = 30 }) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  const total = Math.max(10, width);
  const filled = Math.round((p / 100) * total);
  const empty = total - filled;

  const fillChar = '█';
  const emptyChar = '░';

  let bar = '';
  if (process.stdout.isTTY && !process.env.NO_COLOR) {
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

  if (process.stdout.isTTY && !process.env.NO_COLOR) {
    left = maybeColor(left, ANSI.fg.cyan);
  }

  const line = `${left}${bar} ${p}%${post}`;
  process.stdout.write(`\r${line} `);
}

module.exports = {
  renderProgressBar,
  writeProgressLine,
};