const { maybeColor, ANSI } = require('./colors');

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
  header,
  success,
  warn,
  error,
  dim,
  highlight,
  info,
  successDim,
  errorDim,
  cyan,
  green,
  yellow,
  red,
  magenta,
  blue,
  white,
  gray,
  bold,
  underline,
  greenBold,
  redBold,
  yellowBold,
  cyanBold,
  magentaBold,
  whiteBold,
  bgRed,
  bgGreen,
  bgYellow,
  bgBlue,
  bgMagenta,
  bgCyan,
  bgWhite,
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
};