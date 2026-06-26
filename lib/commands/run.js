const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { loadLangForCwd, getI18n } = require('../i18n');
const loader = require('../loader');
const config = require('../utils/config');

function runScript(scriptName) {
  const { t } = getI18n(loadLangForCwd(process.cwd()));

  // Определяем конфиг
  const cfg = config.detectConfig(process.cwd());
  if (!cfg) {
    console.log(t('commands.run.no_config'));
    return;
  }

  const conf = config.readConfig(process.cwd());
  if (!conf) {
    console.log(t('commands.run.no_config'));
    return;
  }

  const script = conf.scripts?.[scriptName];

  if (!script) {
    console.log(t('commands.run.script_not_found', { script: scriptName }));

    const availableScripts = Object.keys(conf.scripts || {});
    if (availableScripts.length > 0) {
      console.log(t('commands.run.available_title'));
      availableScripts.forEach(name => {
        console.log(`  • ${name}`);
      });
    } else {
      console.log(t('commands.run.add_scripts_hint'));
      console.log(t('commands.run.add_scripts_block_start'));
      console.log(t('commands.run.add_scripts_example'));
      console.log(t('commands.run.add_scripts_example2'));
      console.log(t('commands.run.add_scripts_block_end'));
    }
    return;
  }

  console.log(t('commands.run.running', { script: scriptName }));
  console.log(t('commands.run.command', { cmd: script }));

  const env = { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' };

  // Добавляем пути из манифеста в PATH
  const manifest = loader.loadManifest(process.cwd());
  const binPaths = [];

  for (const [pkgName, pkgInfo] of Object.entries(manifest)) {
    const pkgPath = pkgInfo.path;
    const nodeModulesBin = path.join(pkgPath, 'node_modules', '.bin');
    if (fs.existsSync(nodeModulesBin)) {
      binPaths.push(nodeModulesBin);
    }
    const rootBin = path.join(pkgPath, '.bin');
    if (fs.existsSync(rootBin)) {
      binPaths.push(rootBin);
    }
  }

  // Для обратной совместимости — добавляем пути из .mip
  const mipDir = path.join(process.cwd(), '.mip');
  if (fs.existsSync(mipDir)) {
    const packages = fs.readdirSync(mipDir);
    for (const pkg of packages) {
      const pkgDir = path.join(mipDir, pkg);
      if (fs.statSync(pkgDir).isDirectory()) {
        const versions = fs.readdirSync(pkgDir);
        for (const version of versions) {
          const nodeModulesBin = path.join(pkgDir, version, 'node_modules', '.bin');
          if (fs.existsSync(nodeModulesBin)) {
            binPaths.push(nodeModulesBin);
          }
          const rootBin = path.join(pkgDir, version, '.bin');
          if (fs.existsSync(rootBin)) {
            binPaths.push(rootBin);
          }
        }
      }
    }
  }

  if (binPaths.length > 0) {
    env.PATH = `${binPaths.join(path.delimiter)}${path.delimiter}${process.env.PATH}`;
  }

  // Глобальный лоадер
  const globalLoaderPath = path.join(os.homedir(), '.mip', 'loader.js');
  let finalScript = script;

  if (script.startsWith('node ')) {
    const parts = script.split(' ');
    const nodeArgs = ['--require', globalLoaderPath, ...parts.slice(1)];
    finalScript = `node ${nodeArgs.join(' ')}`;
  }

  const isWin = process.platform === 'win32';
  const child = spawn(
    isWin ? 'cmd.exe' : 'sh',
    isWin ? ['/d', '/s', '/c', finalScript] : ['-c', finalScript],
    {
      stdio: 'inherit',
      cwd: process.cwd(),
      env,
    }
  );

  child.on('close', code => {
    if (code !== 0) {
      console.log(t('commands.run.exited_code', { code }));
      process.exit(code);
    }
  });
}

module.exports = { run: runScript };