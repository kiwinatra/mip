/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                                                                     │
 * │   ███╗   ███╗██╗██████╗                                             │
 * │   ████╗ ████║██║██╔══██╗                                            │
 * │   ██╔████╔██║██║██████╔╝                                            │
 * │   ██║╚██╔╝██║██║██╔══██╗                                            │
 * │   ██║ ╚═╝ ██║██║██║  ██║                                            │
 * │   ╚═╝     ╚═╝╚═╝╚═╝  ╚═╝                                            │
 * │                                                                     │
 * │   Minimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │                                                                     │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { loadLangForCwd, getI18n } = require('../i18n');
const ui = require('../ui/cli');

const TAB_CHAR = '\t';

function write(str) {
  process.stdout.write(str);
}

function hideCursor() {
  write('\x1b[?25l');
}

function showCursor() {
  write('\x1b[?25h');
}

function enterAltScreen() {
  write('\x1b[?1049h');
}

function leaveAltScreen() {
  write('\x1b[?1049l');
}

function clearScreen() {
  write('\x1b[2J\x1b[H');
}

function safeCols() {
  return process.stdout.columns || 100;
}

function safeRows() {
  return process.stdout.rows || 30;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function splitLines(text) {
  if (!text) return [];
  return String(text).split(/\r?\n/);
}

function truncateLine(s, width) {
  const str = String(s);
  if (width <= 0) return '';
  if (str.length <= width) return str;
  if (width === 1) return '…';
  return str.slice(0, width - 1) + '…';
}

function padRight(s, width) {
  const str = String(s);
  if (str.length >= width) return str.slice(0, width);
  return str + ' '.repeat(width - str.length);
}

function normalizeFolderName(name) {
  return name;
}

function guessReadmeForDir(dirListing) {
  const candidates = ['README.md', 'README.MD', 'README.rst', 'README.txt'];
  const byName = new Map();
  for (const item of dirListing) {
    if (item && item.name) byName.set(item.name.toLowerCase(), item);
  }
  for (const c of candidates) {
    const hit = byName.get(c.toLowerCase());
    if (hit && hit.type === 'file') return hit;
  }
  for (const item of dirListing) {
    if (item && item.type === 'file' && item.name && item.name.toLowerCase().startsWith('readme.'))
      return item;
  }
  for (const item of dirListing) {
    if (item && item.type === 'file' && item.name && item.name.toLowerCase().endsWith('.md'))
      return item;
  }
  return null;
}

function decodeGitHubContent(content, encoding) {
  if (!content) return '';
  if (encoding === 'base64') return Buffer.from(content, 'base64').toString('utf8');
  try {
    return Buffer.from(content, 'base64').toString('utf8');
  } catch {
    return String(content);
  }
}

function createGitHubClient() {
  const https = require('https');
  const http = require('http');

  const fetch = global.fetch ? global.fetch : null;
  const token = process.env.GITHUB_TOKEN;

  const headersBase = {
    'User-Agent': 'mip-repo',
    Accept: 'application/vnd.github+json',
  };
  if (token) headersBase.Authorization = `Bearer ${token}`;

  async function httpGet(url) {
    if (fetch) {
      const res = await fetch(url, { headers: headersBase });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        const err = new Error(`GitHub request failed: ${res.status} ${text}`.trim());
        err.status = res.status;
        throw err;
      }
      return res.json();
    }

    const lib = url.startsWith('https://') ? https : http;
    const urlObj = new URL(url);

    const options = {
      method: 'GET',
      protocol: urlObj.protocol,
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      headers: headersBase,
    };

    return await new Promise((resolve, reject) => {
      const req = lib.request(options, res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          } else {
            const err = new Error(`GitHub request failed: ${res.statusCode} ${data}`.trim());
            err.status = res.statusCode;
            reject(err);
          }
        });
      });
      req.on('error', reject);
      req.end();
    });
  }

  async function getContents({ owner, repo, path: filePath, ref }) {
    const encodedPath = filePath ? encodeURIComponent(filePath) : '';
    const refParam = ref ? `?ref=${encodeURIComponent(ref)}` : '';
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}${refParam}`;
    return await httpGet(url);
  }

  return { getContents };
}

async function repo(arg, opts = {}) {
  const { t } = getI18n(loadLangForCwd(process.cwd()));

  const { branch = 'main', downloadPath = 'download' } = opts;

  const raw = typeof arg === 'string' ? arg.trim() : '';
  const helpIfNoRepo = () => console.log(t('commands.repo.usage'));

  if (!raw) return helpIfNoRepo();

  const parts = raw.split(/\s+/).filter(Boolean);
  const repoRef = parts[0];
  if (!repoRef || !repoRef.includes('/')) return helpIfNoRepo();

  const [owner, repository] = repoRef.split('/');
  if (!owner || !repository) return helpIfNoRepo();

  const finalDownloadPath = path.isAbsolute(downloadPath)
    ? downloadPath
    : path.join(process.cwd(), downloadPath);
  fs.mkdirSync(finalDownloadPath, { recursive: true });

  const gh = createGitHubClient();

  const state = {
    owner,
    repository,
    branch,
    cwdPath: '', // '' => repo root
    downloadPath: finalDownloadPath,

    leftListing: [],
    leftSelectedIndex: 0,
    leftOffset: 0,

    rightLines: [],
    rightTitle: 'README',
    rightOffset: 0,

    leftFocus: true,

    commandBuffer: '',
  };

  async function listDir(dirPath) {
    const apiPath = dirPath ? dirPath.replace(/^\/+|\/+$/g, '') : '';
    const res = await gh.getContents({ owner, repo: repository, path: apiPath, ref: branch });
    if (Array.isArray(res)) return res;
    return [res];
  }

  async function readFileFromRepo(repoPath) {
    const apiPath = repoPath ? repoPath.replace(/^\/+|\/+$/g, '') : '';
    const res = await gh.getContents({ owner, repo: repository, path: apiPath, ref: branch });
    if (!res || Array.isArray(res) || !res.content) return null;
    return {
      name: res.name,
      path: res.path,
      encoding: res.encoding,
      content: decodeGitHubContent(res.content, res.encoding),
    };
  }

  async function refreshLeft() {
    const listing = await listDir(state.cwdPath);

    const folders = listing.filter(x => x.type === 'dir').map(x => ({ ...x, name: x.name }));
    const files = listing.filter(x => x.type === 'file').map(x => ({ ...x, name: x.name }));

    folders.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));

    state.leftListing = [...folders, ...files];
    state.leftSelectedIndex = clamp(
      state.leftSelectedIndex,
      0,
      Math.max(0, state.leftListing.length - 1)
    );

    // keep selection visible
    const { contentRows } = buildFrame();
    const maxLeftRows = contentRows - 1;
    state.leftOffset = clamp(
      state.leftOffset,
      0,
      Math.max(0, state.leftListing.length - maxLeftRows)
    );

    if (state.leftSelectedIndex < state.leftOffset) {
      state.leftOffset = state.leftSelectedIndex;
    } else if (state.leftSelectedIndex >= state.leftOffset + maxLeftRows) {
      state.leftOffset = state.leftSelectedIndex - (maxLeftRows - 1);
    }
  }

  async function loadRightForCurrentDir() {
    const listing = state.leftListing;
    const readmeItem = guessReadmeForDir(listing);

    if (!readmeItem) {
      state.rightTitle = 'README (none)';
      state.rightLines = [ui.dim(t('commands.repo.no_readme'))];
      state.rightOffset = 0;
      return;
    }

    const relative = state.cwdPath
      ? `${state.cwdPath.replace(/\/+$/g, '')}/${readmeItem.name}`
      : readmeItem.name;

    const file = await readFileFromRepo(relative);
    if (!file) {
      state.rightTitle = readmeItem.name;
      state.rightLines = [ui.dim(t('commands.repo.no_readme'))];
      state.rightOffset = 0;
      return;
    }

    const maxChars = 20000;
    const content = file.content || '';
    const trimmed =
      content.length > maxChars
        ? content.slice(0, maxChars) + os.EOL + ui.dim(t('commands.repo.content_truncated'))
        : content;

    state.rightTitle = file.name || readmeItem.name;
    state.rightLines = splitLines(trimmed);
    state.rightOffset = 0;
  }

  async function loadRightForSelectedFile() {
    const item = state.leftListing[state.leftSelectedIndex];
    if (!item || item.type !== 'file') return;

    const relative = state.cwdPath
      ? `${state.cwdPath.replace(/\/+$/g, '')}/${item.name}`
      : item.name;

    const file = await readFileFromRepo(relative);
    if (!file) {
      state.rightTitle = item.name;
      state.rightLines = [ui.dim(t('commands.repo.no_readme'))];
      state.rightOffset = 0;
      return;
    }

    const maxChars = 20000;
    const content = file.content || '';
    const trimmed =
      content.length > maxChars
        ? content.slice(0, maxChars) + os.EOL + ui.dim(t('commands.repo.content_truncated'))
        : content;

    state.rightTitle = file.name || item.name;
    state.rightLines = splitLines(trimmed);
    state.rightOffset = 0;
  }

  function buildFrame() {
    const cols = safeCols();
    const rows = safeRows();

    // Layout (based on example):
    // row0: header line
    // rows 1..(rows-2): content area (tree + file)
    // last row: command input
    const cmdRow = rows - 1;

    // Content area height: header + body + command input.
    // - row0: header line
    // - rows 1..(rows-2): panels
    // - last row: command
    const contentRows = Math.max(3, rows - 2);

    // Leave room for borders.
    const innerWidth = Math.max(10, cols - 2);
    const leftWidth = Math.max(20, Math.floor(innerWidth * 0.38));
    const rightWidth = Math.max(10, innerWidth - leftWidth);

    return { cols, rows, cmdRow, contentRows, innerWidth, leftWidth, rightWidth };
  }

  function render() {
    const { cols, rows, contentRows, leftWidth, rightWidth } = buildFrame();

    const leftPanelTitle = `📁 ${state.cwdPath || '.'}`;
    const rightPanelTitle = `# ${state.rightTitle || 'README'}`;

    const headerText = `mip ${state.owner}/${state.repository}                              [q] exit   `;

    clearScreen();
    hideCursor();

    // Top header box-ish line
    write(ui.header(truncateLine(headerText, cols)) + os.EOL);

    // Panels: we draw each content row as: | left | | right |
    const leftX = 0;
    const rightX = leftWidth;

    const maxLeftRows = contentRows - 1; // leave 1 row for divider like example
    const maxRightRows = contentRows - 1;

    // divider row
    const divider = '┬';

    // border lines (simple)
    const top = '┌' + '─'.repeat(cols - 2) + '┐';
    const midSplit = '├' + '─'.repeat(leftWidth) + '┴' + '─'.repeat(rightWidth) + '┤';
    const bottom = '└' + '─'.repeat(cols - 2) + '┘';

    write(top + os.EOL);

    const contentStartRow = 1;

    // Line with titles (row 1)
    // We'll do: | leftTitle padded | rightTitle |
    const leftTitle = ui.dim(truncateLine(leftPanelTitle, leftWidth));
    const rightTitleLine = ui.dim(truncateLine(rightPanelTitle, rightWidth));
    write(
      '│' +
        padRight(leftTitle, leftWidth) +
        '│' +
        padRight(rightTitleLine, rightWidth) +
        '│' +
        os.EOL
    );

    write('├' + '─'.repeat(leftWidth) + '┬' + '─'.repeat(rightWidth) + '┤' + os.EOL);

    const leftFocusMark = state.leftFocus ? ui.success('▸') : ui.dim(' ');
    const rightFocusMark = !state.leftFocus ? ui.success('▸') : ui.dim(' ');

    // Render body rows (scrolling only right; left uses selection but no scroll for now)
    const leftSel = state.leftListing[state.leftSelectedIndex];

    for (let r = 0; r < maxLeftRows; r++) {
      const leftIdx = state.leftOffset + r;
      const item = state.leftListing[leftIdx];

      const isSelected = leftIdx === state.leftSelectedIndex;

      const selPrefix = isSelected ? ui.success('▶') : ui.dim(' ');

      let leftLine = '';
      if (item) {
        const typeIcon = item.type === 'dir' ? '📁' : '📄';
        const name = normalizeFolderName(item.name);
        leftLine = `${selPrefix} ${typeIcon} ${name}`;
      } else {
        leftLine = '';
      }

      leftLine = truncateLine(leftLine, leftWidth);
      const leftCell = padRight(leftLine, leftWidth);

      const rightIdx = state.rightOffset + r;
      let rightLine = '';
      if (rightIdx >= 0 && rightIdx < state.rightLines.length) {
        rightLine = truncateLine(state.rightLines[rightIdx], rightWidth);
      }
      const rightCell = padRight(rightLine, rightWidth);

      write('│' + leftCell + '│' + rightCell + '│' + os.EOL);
    }

    write('└' + '─'.repeat(leftWidth) + '┴' + '─'.repeat(rightWidth) + '┘' + os.EOL);

    // Command row
    const prompt = 'mip:>';
    const marker = state.leftFocus ? '▮' : ' ';
    const inputDisplay = `${prompt} ${state.commandBuffer}${marker}`;

    const tail = os.EOL;
    const cmdLine = truncateLine(inputDisplay, cols);
    write(cmdLine + tail);

    // Footer hint line is already included in right content; keep minimal.
  }

  async function safeRedraw() {
    try {
      await refreshLeft();
      if (!state.commandBuffer && state.rightLines.length === 0) {
        await loadRightForCurrentDir();
      } else {
        // keep current right view only when appropriate; for simplicity reload README
        await loadRightForCurrentDir();
      }
    } catch (e) {
      state.rightTitle = 'Error';
      state.rightLines = [ui.error(String(e && e.message ? e.message : e))];
      state.rightOffset = 0;
    }
    render();
  }

  function parseCommandLine(cmdline) {
    const parts = cmdline.trim().split(/\s+/).filter(Boolean);
    const cmd = parts[0] || '';
    const arg = parts.slice(1).join(' ');
    return { cmd, arg };
  }

  async function runCommandFromBuffer(cmdline) {
    const { cmd, arg } = parseCommandLine(cmdline);

    if (!cmd) return;

    if (cmd === 'exit' || cmd === 'q') {
      shutdown();
      return;
    }

    if (cmd === 'help') {
      state.rightTitle = 'help';
      state.rightLines = splitLines(
        [
          'Commands:',
          '  ls',
          '  cd <folder> | ..',
          '  get <filename>',
          '  view <filename>',
          '  help',
          '  exit | q',
        ].join(os.EOL)
      );
      state.rightOffset = 0;
      render();
      return;
    }

    if (cmd === 'ls') {
      await safeRedraw();
      return;
    }

    if (cmd === 'cd') {
      if (!arg || arg === '.') {
        await safeRedraw();
        return;
      }
      if (arg === '..') {
        if (!state.cwdPath) {
          await safeRedraw();
          return;
        }
        const parts = state.cwdPath.split('/').filter(Boolean);
        parts.pop();
        state.cwdPath = parts.join('/');
        await safeRedraw();
        return;
      }

      const next = arg.replace(/[/\\]/g, '');
      state.cwdPath = state.cwdPath ? `${state.cwdPath.replace(/\/+$/g, '')}/${next}` : next;
      await safeRedraw();
      return;
    }

    if (cmd === 'get') {
      if (!arg) return;
      const safeName = arg.replace(/[/\\]/g, '');
      const relative = state.cwdPath
        ? `${state.cwdPath.replace(/\/+$/g, '')}/${safeName}`
        : safeName;

      const info = await readFileFromRepo(relative);
      if (!info || typeof info.content !== 'string') {
        state.rightTitle = 'get';
        state.rightLines = [ui.error(`Not found: ${arg}`)];
        state.rightOffset = 0;
        render();
        return;
      }

      const outPath = path.join(state.downloadPath, safeName);
      fs.writeFileSync(outPath, info.content, 'utf8');

      state.rightTitle = 'get';
      state.rightLines = [ui.success(`Saved: ${path.relative(process.cwd(), outPath)}`)];
      state.rightOffset = 0;
      render();
      return;
    }

    if (cmd === 'view') {
      if (!arg) return;
      const safeName = arg.replace(/[/\\]/g, '');
      const relative = state.cwdPath
        ? `${state.cwdPath.replace(/\/+$/g, '')}/${safeName}`
        : safeName;

      const file = await readFileFromRepo(relative);
      if (!file) {
        state.rightTitle = safeName;
        state.rightLines = [ui.dim('Not found')];
        state.rightOffset = 0;
        render();
        return;
      }

      const maxChars = 20000;
      const content = file.content || '';
      const trimmed =
        content.length > maxChars
          ? content.slice(0, maxChars) + os.EOL + ui.dim(t('commands.repo.content_truncated'))
          : content;

      state.rightTitle = file.name || safeName;
      state.rightLines = splitLines(trimmed);
      state.rightOffset = 0;
      render();
      return;
    }

    // unknown
    state.rightTitle = 'unknown';
    state.rightLines = [ui.error(`Unknown command: ${cmd}`), ui.dim('Type: help')];
    state.rightOffset = 0;
    render();
  }

  let shuttingDown = false;
  function shutdown() {
    if (shuttingDown) return;
    shuttingDown = true;

    try {
      process.stdin.setRawMode(false);
    } catch {}

    try {
      process.stdin.pause();
    } catch {}

    try {
      leaveAltScreen();
    } catch {}

    try {
      showCursor();
    } catch {}

    try {
      write('\x1b[0m');
    } catch {}

    try {
      process.stdin.removeListener('data', onData);
    } catch {}

    // Ensure cursor ends on fresh line
    try {
      write(os.EOL);
    } catch {}
  }

  function onData(buf) {
    const s = buf.toString('utf8');

    // Global exit
    if (s === 'q' || s === 'Q' || s === '\u0003') {
      shutdown();
      return;
    }

    // Tab focus switch
    if (s === TAB_CHAR || s === '\x1b[Z') {
      state.leftFocus = !state.leftFocus;
      render();
      return;
    }

    // Backspace in command input
    if (!state.leftFocus) {
      if (s === '\x7f' || s === '\b') {
        state.commandBuffer = state.commandBuffer.slice(0, -1);
        render();
        return;
      }

      // Enter runs command
      if (s === '\r' || s === '\n') {
        const cmdline = state.commandBuffer;
        state.commandBuffer = '';
        state.leftFocus = true; // after command, go back to left
        // run async after rendering
        setImmediate(async () => {
          await runCommandFromBuffer(cmdline);
          state.leftFocus = true;
          render();
        });

        return;
      }

      // Printable characters
      if (s && s.length === 1 && s >= ' ' && s <= '~') {
        state.commandBuffer += s;
        render();
      }
      return;
    }

    // Left focus key handling
    if (s === 'j' || s === '\u001b[B') {
      state.leftSelectedIndex = clamp(
        state.leftSelectedIndex + 1,
        0,
        Math.max(0, state.leftListing.length - 1)
      );
      // keep selection visible
      if (!state.leftFocus) {
        // right-focused handled below
      } else {
        const { contentRows } = buildFrame();
        const maxLeftRows = contentRows - 1;
        const maxLeftOffset = Math.max(0, state.leftListing.length - maxLeftRows);
        state.leftOffset = clamp(state.leftOffset, 0, maxLeftOffset);
        if (state.leftSelectedIndex < state.leftOffset) {
          state.leftOffset = state.leftSelectedIndex;
        } else if (state.leftSelectedIndex >= state.leftOffset + maxLeftRows) {
          state.leftOffset = state.leftSelectedIndex - (maxLeftRows - 1);
        }
      }

      const item = state.leftListing[state.leftSelectedIndex];

      if (item && item.type === 'file') {
        setImmediate(async () => {
          await loadRightForSelectedFile();
          render();
        });
      } else {
        // for dirs, show README for current dir
        setImmediate(async () => {
          await loadRightForCurrentDir();
          render();
        });
      }
      return;
    }

    if (s === 'k' || s === '\u001b[A') {
      state.leftSelectedIndex = clamp(
        state.leftSelectedIndex - 1,
        0,
        Math.max(0, state.leftListing.length - 1)
      );
      // keep selection visible
      if (state.leftFocus) {
        const { contentRows } = buildFrame();
        const maxLeftRows = contentRows - 1;
        const maxLeftOffset = Math.max(0, state.leftListing.length - maxLeftRows);
        state.leftOffset = clamp(state.leftOffset, 0, maxLeftOffset);
        if (state.leftSelectedIndex < state.leftOffset) {
          state.leftOffset = state.leftSelectedIndex;
        } else if (state.leftSelectedIndex >= state.leftOffset + maxLeftRows) {
          state.leftOffset = state.leftSelectedIndex - (maxLeftRows - 1);
        }
      }
      const item = state.leftListing[state.leftSelectedIndex];

      if (item && item.type === 'file') {
        setImmediate(async () => {
          await loadRightForSelectedFile();
          render();
        });
      } else {
        setImmediate(async () => {
          await loadRightForCurrentDir();
          render();
        });
      }
      return;
    }

    if (s === '\r' || s === '\n') {
      const item = state.leftListing[state.leftSelectedIndex];
      if (!item) return;
      if (item.type === 'dir') {
        state.cwdPath = state.cwdPath
          ? `${state.cwdPath.replace(/\/+$/g, '')}/${item.name}`
          : item.name;
        state.leftSelectedIndex = 0;
        setImmediate(async () => {
          await safeRedraw();
        });
      } else {
        setImmediate(async () => {
          await loadRightForSelectedFile();
          render();
        });
      }
      return;
    }

    // Right-focus scrolling
    if (!state.leftFocus) {
      const { contentRows } = buildFrame();
      const maxRightRows = contentRows - 1;
      const maxRightOffset = Math.max(0, state.rightLines.length - maxRightRows);

      if (s === 'j' || s === '\u001b[B') {
        state.rightOffset = clamp(state.rightOffset + 1, 0, maxRightOffset);
        render();
        return;
      }

      if (s === 'k' || s === '\u001b[A') {
        state.rightOffset = clamp(state.rightOffset - 1, 0, maxRightOffset);
        render();
        return;
      }
    }
  }

  // Init
  // We also need prompt line even when leftFocus=true; our renderer always shows command buffer.
  // Start TUI only if terminal is TTY.
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    // fallback to old behavior: print something minimal
    await refreshLeft().catch(() => {});
    await loadRightForCurrentDir().catch(() => {});
    console.log('mip repo (TUI requires a TTY)');
    return;
  }

  // Initial content
  await refreshLeft();
  await loadRightForCurrentDir();

  enterAltScreen();
  hideCursor();

  // Raw mode
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', onData);

  render();

  // Keep running
  await new Promise(resolve => {
    const checkInterval = setInterval(() => {
      if (shuttingDown) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 50);
  });
}

/**
 * Управление TUI
 *
 * Использование:
 *   mip repo <owner>/<repo> [--branch <name>] [--downloadPath <path>]
 *
 * Навигация:
 *   Tab            — переключить фокус между левой и правой панелью
 *   j / k          — движение выделения:
 *                    - в левой панели: следующая/предыдущая запись (скроллит список)
 *                    - в правой панели: прокрутка текста (scroll)
 *   Enter          —
 *                    - если выделена папка слева: открыть её
 *                    - если выделен файл слева: открыть содержимое справа
 *   q или Ctrl+C   — выйти из TUI
 *
 * Команды (вводятся внизу, когда фокус может быть на любой панели):
 *   help           — показать справку
 *   ls             — перезагрузить текущую папку
 *   cd <dir>       — перейти в папку (изменит правую README/контент)
 *                   cd .. — назад
 *   view <file>    — показать файл справа
 *   get <file>     — скачать файл в downloadPath
 *   exit | q       — выйти
 */

module.exports = { repo };
