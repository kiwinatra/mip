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

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const { loadLangForCwd, getI18n } = require('../i18n');
const ui = require('../ui/cli');

/**
 * Minimal GitHub repository browser:
 * - shows tree
 * - cd / .. / exit
 * - get <filename> -> downloads file into --path (default: ./download)
 * - readme/cat -> prints README (or representative md) for current folder
 */
async function repo(arg, opts = {}) {
  const { t } = getI18n(loadLangForCwd(process.cwd()));

  const { branch = 'main', downloadPath = 'download' } = opts;

  const raw = typeof arg === 'string' ? arg.trim() : '';
  const helpIfNoRepo = () => console.log(t('commands.repo.usage'));

  if (!raw) return helpIfNoRepo();

  const parts = raw.split(/\s+/).filter(Boolean);
  const repoRef = parts[0]; // expected username/repo
  if (!repoRef || !repoRef.includes('/')) return helpIfNoRepo();

  const [owner, repository] = repoRef.split('/');
  if (!owner || !repository) return helpIfNoRepo();

  const finalDownloadPath = path.isAbsolute(downloadPath)
    ? downloadPath
    : path.join(process.cwd(), downloadPath);

  fs.mkdirSync(finalDownloadPath, { recursive: true });

  const gh = createGitHubClient(opts);

  const state = {
    owner,
    repository,
    branch,
    cwdPath: '', // empty = repo root
    downloadPath: finalDownloadPath
  };

  async function listDir(dirPath) {
    const apiPath = dirPath ? dirPath.replace(/^\/+|\/+$/g, '') : '';

    const res = await gh.getContents({
      owner,
      repo: repository,
      path: apiPath,
      ref: branch
    });

    if (Array.isArray(res)) return res;
    return [res];
  }

  async function readFileFromRepo(repoPath) {
    const apiPath = repoPath ? repoPath.replace(/^\/+|\/+$/g, '') : '';
    const res = await gh.getContents({
      owner,
      repo: repository,
      path: apiPath,
      ref: branch
    });

    if (!res || Array.isArray(res) || !res.content) return null;

    return {
      name: res.name,
      path: res.path,
      encoding: res.encoding,
      content: decodeGitHubContent(res.content, res.encoding)
    };
  }

  async function guessReadmeForDir(dirListing) {
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
      if (item && item.type === 'file' && item.name && item.name.toLowerCase().startsWith('readme.')) return item;
    }
    for (const item of dirListing) {
      if (item && item.type === 'file' && item.name && item.name.toLowerCase().endsWith('.md')) return item;
    }
    return null;
  }

  function normalizeFolderName(name) {
    return name;
  }

  function printTree(listing) {
    const folders = listing
      .filter((x) => x.type === 'dir')
      .map((x) => `${normalizeFolderName(x.name)}${x.name.endsWith('/') ? '' : '\\'}`);

    const files = listing
      .filter((x) => x.type === 'file')
      .map((x) => x.name);

    folders.sort((a, b) => a.localeCompare(b));
    files.sort((a, b) => a.localeCompare(b));

    for (const f of folders) console.log(f);
    for (const f of files) console.log(f);
  }

  function dim(text) {
    // lib/ui/cli.js не экспортирует dim, оставляем как было.
    return text;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  function enterFullscreenReadme(lines, { title } = {}) {
    // Fullscreen output using raw mode + screen projection.
    // README becomes a scrollable “window” and we repaint in-place.
    const screenClear = '\x1b[2J\x1b[H';
    const cols = process.stdout.columns || 80;
    const rows = process.stdout.rows || 24;
    const bodyRows = Math.max(3, rows - 3);

    const hideCursor = '\x1b[?25l';
    const showCursor = '\x1b[?25h';

    const safeLines = (Array.isArray(lines) ? lines : String(lines).split(/\r?\n/)).map((l) => String(l));
    let offset = 0;

    const cleanup = () => {
      try {
        process.stdin.setRawMode(false);
      } catch {}
      try {
        process.stdin.pause();
      } catch {}
      try {
        process.stdin.removeListener('data', onData);
      } catch {}

      // Restore normal screen.
      try {
        process.stdout.write(showCursor);
        process.stdout.write('\x1b[?1049l');
      } catch {}
      try {
        process.stdout.write('\x1b[0m');
      } catch {}

      rl.prompt();
    };

    const draw = () => {
      process.stdout.write(hideCursor);
      process.stdout.write(screenClear);

      const headerText = title || `mip repo • ${state.owner}/${state.repository}${state.cwdPath ? `/${state.cwdPath}` : ''} • readme • q`;
      process.stdout.write(ui.header(headerText) + os.EOL);

      const slice = safeLines.slice(offset, offset + bodyRows);
      for (const ln of slice) {
        const safe = ln.length > cols ? ln.slice(0, cols - 1) : ln;
        process.stdout.write(safe + os.EOL);
      }

      const footer = dim(`\n${offset + 1}-${Math.min(offset + bodyRows, safeLines.length)} / ${safeLines.length} • j/k or ↑/↓ or PgUp/PgDn • q`);
      process.stdout.write(footer);
    };

    const onData = (buf) => {
      const key = buf.toString('utf8');
      if (key === 'q' || key === 'Q' || key === '\u0003') {
        cleanup();
        return;
      }

      if (key === 'j' || key === ' ' || key === '\n' || key === '\r') offset = Math.min(safeLines.length - 1, offset + 1);
      else if (key === 'k' || key === '\u001b[A') offset = Math.max(0, offset - 1);
      else if (key === '\u001b[B') offset = Math.min(safeLines.length - 1, offset + 1);
      else if (key === '\u001b[6~') offset = Math.min(safeLines.length - 1, offset + (bodyRows - 1));
      else if (key === '\u001b[5~') offset = Math.max(0, offset - (bodyRows - 1));

      draw();
    };

    try {
      // Enter alternate screen.
      process.stdout.write('\x1b[?1049h');
      process.stdout.write(hideCursor);

      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on('data', onData);
      draw();
    } catch {
      // Non-interactive fallback.
      for (const ln of safeLines) console.log(ln);
      rl.prompt();
    }
  }

  async function renderCurrentView(showContent = false) {
    let listing;
    try {
      listing = await listDir(state.cwdPath);
    } catch {
      console.log(ui.error(t('commands.repo.error.cannot_open_dir', { path: state.cwdPath || '/' })));
      return;
    }

    const prettyPath = state.cwdPath ? state.cwdPath : '/';
    console.log(ui.header(`mip repo: ${state.owner}/${state.repository}${prettyPath === '/' ? '' : `/${prettyPath}`}`));

    if (listing.length === 0) console.log(ui.warn(t('commands.repo.empty_dir')));
    else printTree(listing);

    if (!showContent) return;

    const readmeItem = await guessReadmeForDir(listing);
    if (!readmeItem) {
      console.log(dim(t('commands.repo.no_readme')));
      return;
    }

    const relative = state.cwdPath
      ? `${state.cwdPath.replace(/\/+$/g, '')}/${readmeItem.name}`
      : readmeItem.name;

    try {
      const file = await readFileFromRepo(relative);
      if (!file) {
        console.log(dim(t('commands.repo.no_readme')));
        return;
      }

      const maxChars = 20000;
      const content = file.content || '';
      const trimmed = content.length > maxChars
        ? content.slice(0, maxChars) + os.EOL + dim(t('commands.repo.content_truncated'))
        : content;

      enterFullscreenReadme(trimmed.split(/\r?\n/), {
        title: `mip repo • ${state.owner}/${state.repository}${state.cwdPath ? `/${state.cwdPath}` : ''} • ${file.name || 'readme'} • q`
      });
    } catch {
      console.log(dim(t('commands.repo.no_readme')));
    }
  }

  function promptString() {
    return t('commands.repo.prompt');
  }

  async function handleGet(filename) {
    if (!filename) return;

    const safeName = filename.replace(/[/\\]/g, '');
    const relative = state.cwdPath
      ? `${state.cwdPath.replace(/\/+$/g, '')}/${safeName}`
      : safeName;

    const info = await readFileFromRepo(relative);
    if (!info || typeof info.content !== 'string') {
      console.log(ui.error(t('commands.repo.get.not_found', { filename })));
      return;
    }

    const outPath = path.join(state.downloadPath, safeName);
    fs.writeFileSync(outPath, info.content, 'utf8');

    console.log(ui.success(t('commands.repo.get.saved', { filename, path: path.relative(process.cwd(), outPath) })));
  }

  const commandsHelp = () => {
    console.log(t('commands.repo.commands_help'));
  };

  // Initial render: только дерево (как проводник)
  await renderCurrentView(false);
  commandsHelp();

  rl.setPrompt(promptString());
  rl.prompt();

  rl.on('line', async (line) => {
    const cmdline = (line || '').trim();
    if (!cmdline) return rl.prompt();

    const [cmd, ...rest] = cmdline.split(/\s+/);
    const arg1 = rest.join(' ').trim();

    try {
      if (cmd === 'exit') {
        console.log(ui.warn(t('commands.repo.bye')));
        rl.close();
        return;
      }

      if (cmd === 'help' || cmd === '?') {
        commandsHelp();
        rl.prompt();
        return;
      }

      if (cmd === 'ls') {
        await renderCurrentView(false);
        rl.prompt();
        return;
      }

      if (cmd === 'cd') {
        if (!arg1 || arg1 === '.') {
          await renderCurrentView(false);
          rl.prompt();
          return;
        }

        if (arg1 === '..') {
          if (!state.cwdPath) {
            await renderCurrentView(false);
            rl.prompt();
            return;
          }
          const parts = state.cwdPath.split('/').filter(Boolean);
          parts.pop();
          state.cwdPath = parts.join('/');
          await renderCurrentView(false);
          rl.prompt();
          return;
        }

        const next = arg1.replace(/[/\\]/g, '');
        state.cwdPath = state.cwdPath
          ? `${state.cwdPath.replace(/\/+$/g, '')}/${next}`
          : next;

        await renderCurrentView(false);
        rl.prompt();
        return;
      }

      if (cmd === 'readme' || cmd === 'cat') {
        await renderCurrentView(true);
        // renderCurrentView(true) switches the terminal into fullscreen and returns after 'q'
        return;
      }

      if (cmd === 'get') {
        if (!arg1) {
          console.log(ui.error(t('commands.repo.get.usage')));
          rl.prompt();
          return;
        }
        await handleGet(arg1);
        rl.prompt();
        return;
      }

      console.log(ui.error(t('commands.repo.unknown_cmd', { cmd })));
      rl.prompt();
    } catch (e) {
      console.log(ui.error(t('commands.repo.error.generic', { message: e && e.message ? e.message : String(e) })));
      rl.prompt();
    }
  });

  await new Promise((resolve) => rl.on('close', resolve));
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
    'Accept': 'application/vnd.github+json'
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
      headers: headersBase
    };

    return await new Promise((resolve, reject) => {
      const req = lib.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
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

module.exports = { repo };

