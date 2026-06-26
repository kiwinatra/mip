/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { loadLangForCwd, getI18n } = require('../i18n');
const loader = require('../loader');
const config = require('../utils/config');

function exec(command) {
  const { t } = getI18n(loadLangForCwd(process.cwd()));

  if (!command) {
    console.log(t('commands.exec.usage'));
    return;
  }

  // Проверка: если пользователь ввел путь к файлу
  if (command.includes('/') || command.includes('\\') || command.endsWith('.js')) {
    const filePath = path.resolve(process.cwd(), command);
    if (!fs.existsSync(filePath)) {
      console.log(t('commands.exec.file_not_found', { file: command }));
      console.log(t('commands.exec.hint_node'));
      return;
    }
    console.log(t('commands.exec.wrong_usage'));
    console.log(t('commands.exec.hint_run'));
    return;
  }

  // Проверяем манифест
  const manifest = loader.loadManifest(process.cwd());
  let executable = null;

  // Ищем команду в манифесте
  for (const [pkgName, pkgInfo] of Object.entries(manifest)) {
    const pkgPath = pkgInfo.path;
    const binPath = path.join(pkgPath, 'node_modules', '.bin', command);
    const rootBinPath = path.join(pkgPath, '.bin', command);
    const localBinPath = path.join(pkgPath, 'bin', command);

    if (fs.existsSync(binPath)) {
      executable = binPath;
      console.log(`🔧 Found in manifest (${pkgName}): ${path.relative(process.cwd(), executable)}`);
      break;
    }
    if (fs.existsSync(rootBinPath)) {
      executable = rootBinPath;
      console.log(`🔧 Found in manifest (${pkgName}): ${path.relative(process.cwd(), executable)}`);
      break;
    }
    if (fs.existsSync(localBinPath)) {
      executable = localBinPath;
      console.log(`🔧 Found in manifest (${pkgName}): ${path.relative(process.cwd(), executable)}`);
      break;
    }
  }

  // Если не нашли в манифесте — ищем в старом .mip
  if (!executable) {
    const mipDir = path.join(process.cwd(), '.mip');
    if (fs.existsSync(mipDir)) {
      const packages = fs.readdirSync(mipDir);
      for (const pkg of packages) {
        const pkgDir = path.join(mipDir, pkg);
        if (fs.statSync(pkgDir).isDirectory()) {
          const versions = fs.readdirSync(pkgDir);
          for (const version of versions) {
            const nodeModulesBin = path.join(pkgDir, version, 'node_modules', '.bin', command);
            if (fs.existsSync(nodeModulesBin)) {
              executable = nodeModulesBin;
              console.log(`🔧 Found in .mip: ${path.relative(process.cwd(), executable)}`);
              break;
            }
            const rootBin = path.join(pkgDir, version, '.bin', command);
            if (fs.existsSync(rootBin)) {
              executable = rootBin;
              console.log(`🔧 Found in .mip: ${path.relative(process.cwd(), executable)}`);
              break;
            }
          }
        }
        if (executable) break;
      }
    }
  }

  // Если не нашли — проверяем системную команду
  if (!executable) {
    try {
      const which = require('which');
      const systemPath = which.sync(command, { nothrow: true });
      if (systemPath) {
        executable = systemPath;
        console.log(`🔧 Using system command: ${command}`);
      }
    } catch {
      // which не доступен
    }
  }

  // Безопасность
  if (/[;&|><\n\r`]/.test(String(command))) {
    console.log(t('commands.exec.unsafe'));
    return;
  }

  if (!executable) {
    console.log(t('commands.exec.not_found', { command }));
    console.log(t('commands.exec.hint_install'));
    return;
  }

  console.log(`\n✨ Executing: ${command}\n`);

  // Определяем, что это node
  const isNode = executable === 'node' || 
                 executable === 'node.exe' || 
                 executable.endsWith('/node') ||
                 executable.endsWith('\\node.exe');

  // Собираем аргументы
  let args = process.argv.slice(4);
  
  // Если это node — добавляем глобальный лоадер
  if (isNode) {
    const globalLoaderPath = path.join(os.homedir(), '.mip', 'loader.js');
    if (fs.existsSync(globalLoaderPath)) {
      args = ['--require', globalLoaderPath, ...args];
    }
  }

  const child = spawn(executable, args, {
    stdio: 'inherit',
    shell: false,
    cwd: process.cwd(),
    env: process.env,
  });

  child.on('close', code => {
    if (code !== 0) process.exit(code);
  });
}

module.exports = { exec };