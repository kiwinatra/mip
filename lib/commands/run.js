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
const { spawn } = require('child_process');

const { loadLangForCwd, getI18n } = require('../i18n');

function runScript(scriptName) {
  const { t } = getI18n(loadLangForCwd(process.cwd()));

  const configPath = path.join(process.cwd(), 'mip.json');

  if (!fs.existsSync(configPath)) {
    console.log(t('commands.run.no_mip_json'));
    return;
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const script = config.scripts?.[scriptName];

  if (!script) {
    console.log(t('commands.run.script_not_found', { script: scriptName }));

    const availableScripts = Object.keys(config.scripts || {});
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

  // 🔥 ИЗМЕНЕНИЕ: НЕ парсим script через split(' ')
  // На Windows пробелы/кавычки в путях ломают распознавание команды.
  // Запускаем как есть через оболочку.

  const env = { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' };
  
  // Собираем все .bin директории из установленных пакетов в .mip
  const mipDir = path.join(process.cwd(), '.mip');
  const binPaths = [];

  
  if (fs.existsSync(mipDir)) {
    const packages = fs.readdirSync(mipDir);
    for (const pkg of packages) {
      const pkgDir = path.join(mipDir, pkg);
      if (fs.statSync(pkgDir).isDirectory()) {
        const versions = fs.readdirSync(pkgDir);
        for (const version of versions) {
          // Проверяем стандартный путь node_modules/.bin
          const nodeModulesBin = path.join(pkgDir, version, 'node_modules', '.bin');
          if (fs.existsSync(nodeModulesBin)) {
            binPaths.push(nodeModulesBin);
          }
          // Проверяем корневой .bin
          const rootBin = path.join(pkgDir, version, '.bin');
          if (fs.existsSync(rootBin)) {
            binPaths.push(rootBin);
          }
        }
      }
    }
  }
  
  // Добавляем найденные пути в PATH (в приоритет над системными)
  if (binPaths.length > 0) {
    env.PATH = `${binPaths.join(path.delimiter)}${path.delimiter}${process.env.PATH}`;
  }

  const isWin = process.platform === 'win32';

  // Мы не разбираем script на cmd/args. Запускаем строку через оболочку.
  // Для Windows используем cmd.exe /d /s /c, чтобы корректно обработать кавычки.
  const child = spawn(
    isWin ? 'cmd.exe' : 'sh',
    isWin ? ['/d', '/s', '/c', script] : ['-c', script],
    {
      stdio: 'inherit',
      cwd: process.cwd(),
      env
    }
  );

  child.on('close', (code) => {
    if (code !== 0) {

      console.log(t('commands.run.exited_code', { code }));
      process.exit(code);
    }
  });
}


module.exports = { run: runScript }; 

