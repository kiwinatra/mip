/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const { execSync } = require('child_process');
const config = require('../utils/config');
const store = require('../utils/store');
const loader = require('../loader');
const features = require('../utils/features');

/**
 * Команда для запуска веб-сервера с дашбордом MIP
 * mip server start [port]
 * mip server stop
 * mip server status
 */
function server(argv) {
  const subcommand = argv[0] || 'start';

  switch (subcommand) {
    case 'start':
      return serverStart(argv.slice(1));
    case 'stop':
      return serverStop();
    case 'status':
      return serverStatus();
    case 'help':
    case '--help':
    case '-h':
      return showHelp();
    default:
      console.error(`❌ Unknown server subcommand: ${subcommand}`);
      showHelp();
      process.exit(1);
  }
}

/**
 * Запуск сервера
 */
function serverStart(argv) {
  const mipFeatures = features.loadFeatures(process.cwd());

  // Получаем порт и хост из фич или из аргументов
  let port = parseInt(argv[0]) || mipFeatures['server.port'] || 3000;
  let host = argv.includes('--host') ? '0.0.0.0' : mipFeatures['server.host'] || 'localhost';
  const openBrowser = argv.includes('--open') || argv.includes('-o') || mipFeatures['server.autoOpen'];

  // Проверяем, не запущен ли уже сервер
  const pidFile = getPidFile();
  if (fs.existsSync(pidFile)) {
    try {
      const pid = parseInt(fs.readFileSync(pidFile, 'utf8'));
      if (isProcessRunning(pid)) {
        console.log(`⚠️ Server is already running on http://localhost:${port}`);
        console.log(`   PID: ${pid}`);
        console.log(`   Use "mip server stop" to stop it`);
        process.exit(1);
      }
    } catch (e) {
      fs.unlinkSync(pidFile);
    }
  }

  // Создаём сервер
  const server = http.createServer((req, res) => {
    handleRequest(req, res);
  });

  server.listen(port, host, () => {
    console.log(`🌐 MIP Server running at http://${host}:${port}`);
    console.log(`📊 Dashboard: http://${host}:${port}/`);
    console.log(`📁 Project: ${process.cwd()}`);
    console.log(`🔧 Press Ctrl+C to stop`);

    fs.writeFileSync(pidFile, process.pid.toString());

    if (openBrowser) {
      const url = `http://${host}:${port}`;
      openBrowserUrl(url);
    }
  });

  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
    process.exit(0);
  });
}

/**
 * Остановка сервера
 */
function serverStop() {
  const pidFile = getPidFile();
  if (!fs.existsSync(pidFile)) {
    console.log('ℹ️ Server is not running');
    process.exit(0);
  }

  try {
    const pid = parseInt(fs.readFileSync(pidFile, 'utf8'));
    if (isProcessRunning(pid)) {
      process.kill(pid, 'SIGTERM');
      console.log(`✅ Server stopped (PID: ${pid})`);
    } else {
      console.log('ℹ️ Server process is not running');
    }
    fs.unlinkSync(pidFile);
  } catch (error) {
    console.error(`❌ Failed to stop server: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Статус сервера
 */
function serverStatus() {
  const pidFile = getPidFile();
  if (!fs.existsSync(pidFile)) {
    console.log('ℹ️ Server is not running');
    process.exit(0);
  }

  try {
    const pid = parseInt(fs.readFileSync(pidFile, 'utf8'));
    if (isProcessRunning(pid)) {
      console.log(`✅ Server is running (PID: ${pid})`);
      console.log(`   To stop: mip server stop`);
    } else {
      console.log('⚠️ Server is not running (stale PID file)');
      fs.unlinkSync(pidFile);
    }
  } catch (error) {
    console.error(`❌ Failed to check status: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Обработка HTTP запросов
 */
function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const mipFeatures = features.loadFeatures(process.cwd());

  // CORS
  if (mipFeatures['server.enableCors'] !== false) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  // API маршруты
  if (pathname === '/api/project') {
    return sendJSON(res, getProjectInfo());
  }
  if (pathname === '/api/packages') {
    return sendJSON(res, getPackagesInfo());
  }
  if (pathname === '/api/store') {
    return sendJSON(res, getStoreInfo());
  }
  if (pathname === '/api/registries') {
    return sendJSON(res, getRegistriesInfo());
  }
  if (pathname === '/api/system') {
    return sendJSON(res, getSystemInfo());
  }
  if (pathname === '/api/health') {
    return sendJSON(res, { status: 'ok', timestamp: new Date().toISOString() });
  }

  // HTML страница
  if (pathname === '/' || pathname === '/dashboard' || pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getHTML());
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found', path: pathname }));
}

/**
 * Отправка JSON ответа
 */
function sendJSON(res, data) {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data, null, 2));
}

/**
 * Получение HTML страницы
 */
function getHTML() {
  const htmlPath = path.join(__dirname, '../server.html');
  if (fs.existsSync(htmlPath)) {
    let html = fs.readFileSync(htmlPath, 'utf8');
    const mipFeatures = features.loadFeatures(process.cwd());
    
    // Применяем тему
    if (mipFeatures['server.darkTheme'] === false) {
      html = html.replace(/background:#0a0e17;/g, 'background:#ffffff;');
      html = html.replace(/color:#e0e6f0;/g, 'color:#1a1a2e;');
    }
    
    return html;
  }
  // Fallback
  return `
<!DOCTYPE html>
<html>
<head><title>MIP Server</title></head>
<body style="background:#0a0e17;color:#e0e6f0;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;">
  <h1>📦 MIP Server</h1>
  <p style="color:#6b7a8f;">HTML file not found. Please create <code>lib/server.html</code></p>
</body>
</html>
  `;
}

/**
 * Получение информации о проекте
 */
function getProjectInfo() {
  const conf = config.readConfig(process.cwd()) || {};
  const configPath = config.detectConfig(process.cwd()) || {};

  const deps = { ...conf.dependencies, ...conf.devDependencies };
  const scripts = conf.scripts || {};
  const workspaces = conf.workspaces || [];

  return {
    name: conf.name || path.basename(process.cwd()),
    version: conf.version || '1.0.0',
    description: conf.description || '',
    configFile: configPath.path ? path.basename(configPath.path) : 'none',
    dependencies: Object.keys(conf.dependencies || {}).length,
    devDependencies: Object.keys(conf.devDependencies || {}).length,
    totalDependencies: Object.keys(deps).length,
    scripts: Object.keys(scripts).length,
    workspaces: workspaces.length,
    language: conf.language || 'en'
  };
}

/**
 * Получение информации о пакетах
 */
function getPackagesInfo() {
  try {
    const manifest = loader.loadManifest(process.cwd());
    const packages = [];

    for (const [name, info] of Object.entries(manifest)) {
      const exists = fs.existsSync(info.path);
      
      let size = 0;
      if (exists) {
        try {
          size = getDirectorySize(info.path);
        } catch (e) {
          size = 0;
        }
      }

      packages.push({
        name,
        version: info.version,
        path: info.path,
        exists,
        size: formatSize(size),
        sizeBytes: size
      });
    }

    packages.sort((a, b) => b.sizeBytes - a.sizeBytes);

    return {
      total: packages.length,
      packages
    };
  } catch (error) {
    return {
      total: 0,
      packages: [],
      error: error.message
    };
  }
}

/**
 * Получение информации о глобальном хранилище
 */
function getStoreInfo() {
  const homeDir = os.homedir();
  const mipDir = path.join(homeDir, '.mip');
  const storePath = path.join(mipDir, 'store');

  let totalSize = 0;
  let packageCount = 0;
  const packages = [];

  if (fs.existsSync(storePath)) {
    try {
      const items = fs.readdirSync(storePath);
      for (const name of items) {
        const pkgPath = path.join(storePath, name);
        if (fs.statSync(pkgPath).isDirectory()) {
          const versions = fs.readdirSync(pkgPath);
          for (const version of versions) {
            const versionPath = path.join(pkgPath, version);
            if (fs.statSync(versionPath).isDirectory()) {
              const size = getDirectorySize(versionPath);
              totalSize += size;
              packageCount++;
              packages.push({
                name,
                version,
                size: formatSize(size),
                sizeBytes: size
              });
            }
          }
        }
      }
    } catch (error) {}
  }

  packages.sort((a, b) => b.sizeBytes - a.sizeBytes);

  return {
    path: storePath,
    exists: fs.existsSync(storePath),
    totalSize: formatSize(totalSize),
    totalSizeBytes: totalSize,
    packageCount,
    packages: packages.slice(0, 50)
  };
}

/**
 * Получение информации о реестрах
 */
function getRegistriesInfo() {
  const conf = config.readConfig(process.cwd()) || {};
  const registries = conf.registries || {};
  const defaultRegistry = conf.defaultRegistry || 'npm';
  const mipFeatures = features.loadFeatures(process.cwd());
  
  // Используем default из фич если есть
  const finalDefault = mipFeatures['registry.default'] || defaultRegistry;

  const result = {
    default: finalDefault,
    registries: {}
  };

  result.registries.npm = {
    url: 'https://registry.npmjs.org/',
    builtin: true,
    isDefault: finalDefault === 'npm'
  };

  for (const [name, registry] of Object.entries(registries)) {
    result.registries[name] = {
      url: registry.url,
      hasToken: !!registry.token,
      token: registry.token ? maskToken(registry.token) : null,
      added: registry.added,
      isDefault: finalDefault === name,
      builtin: false
    };
  }

  return result;
}

/**
 * Получение системной информации
 */
function getSystemInfo() {
  let mipVersion = 'unknown';
  try {
    const pkg = require('../../package.json');
    mipVersion = pkg.version;
  } catch (e) {}

  return {
    nodeVersion: process.version,
    mipVersion: mipVersion,
    platform: process.platform,
    arch: process.arch,
    cwd: process.cwd(),
    homedir: os.homedir(),
    freeMemory: formatSize(os.freemem()),
    totalMemory: formatSize(os.totalmem()),
    freeMemoryBytes: os.freemem(),
    totalMemoryBytes: os.totalmem(),
    cpus: os.cpus().length,
    uptime: os.uptime(),
    loadAverage: os.loadavg()
  };
}

/**
 * Вычисление размера директории
 */
function getDirectorySize(dirPath) {
  let total = 0;
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      total += getDirectorySize(filePath);
    } else {
      total += stats.size;
    }
  }

  return total;
}

/**
 * Форматирование размера
 */
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Маскировка токена
 */
function maskToken(token) {
  if (!token) return null;
  if (token.length <= 8) return '••••';
  return token.substring(0, 4) + '••••' + token.substring(token.length - 4);
}

/**
 * Проверка, запущен ли процесс
 */
function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Получение пути к PID файлу
 */
function getPidFile() {
  const homeDir = os.homedir();
  const mipDir = path.join(homeDir, '.mip');
  if (!fs.existsSync(mipDir)) {
    fs.mkdirSync(mipDir, { recursive: true });
  }
  return path.join(mipDir, 'server.pid');
}

/**
 * Открытие браузера
 */
function openBrowserUrl(url) {
  const platform = process.platform;
  let command;

  if (platform === 'darwin') {
    command = `open "${url}"`;
  } else if (platform === 'win32') {
    command = `start "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }

  try {
    execSync(command, { stdio: 'ignore' });
  } catch (e) {
    // Игнорируем ошибки открытия браузера
  }
}

/**
 * Показать справку
 */
function showHelp() {
  console.log(`
🌐 mip server - Run web dashboard for MIP

USAGE
  mip server <subcommand> [options]

SUBCOMMANDS
  start [port]    Start the web server (default port: 3000)
  stop            Stop the running server
  status          Show server status

OPTIONS
  --open, -o      Open browser automatically
  --host          Listen on all interfaces (0.0.0.0)

FEATURES
  server.port         - Port (default: 3000)
  server.host         - Host (default: localhost)
  server.autoOpen     - Auto-open browser (default: false)
  server.refreshInterval - Refresh interval in ms (default: 3000)
  server.darkTheme    - Dark theme (default: true)
  server.authToken    - Authentication token
  server.enableCors   - Enable CORS (default: true)

EXAMPLES
  # Start server on port 3000
  mip server start

  # Start on port 8080 with browser
  mip server start 8080 --open

  # Start on all interfaces (for network access)
  mip server start --host

  # Stop server
  mip server stop

  # Check status
  mip server status

📊 Dashboard features:
  • Real-time package list with sizes
  • Global storage overview
  • Registry configuration
  • System information
  • Auto-refresh every 3 seconds
  • Multiple tabs: Overview, Packages, Store, Registries, Scripts, System
`);
}

module.exports = { server };