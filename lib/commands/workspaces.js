/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { loadLangForCwd, getI18n } = require('../i18n');
const config = require('../utils/config');

async function workspaces(action, arg) {
  const cwd = process.cwd();
  const { t } = getI18n(loadLangForCwd(cwd));

  // Определяем конфиг
  const cfg = config.detectConfig(cwd);
  if (!cfg) {
    console.log(t('commands.workspaces.no_config'));
    return;
  }

  const conf = config.readConfig(cwd);
  if (!conf) {
    console.log(t('commands.workspaces.no_config'));
    return;
  }

  const workspacesPatterns = conf.workspaces || [];

  if (workspacesPatterns.length === 0) {
    console.log(t('commands.workspaces.no_workspaces_defined'));
    console.log('\n' + t('commands.workspaces.add_hint_title'));
    console.log(t('commands.workspaces.add_hint_value'));
    return;
  }

  // Находим все workspace директории
  const workspaceDirs = [];

  for (const pattern of workspacesPatterns) {
    if (pattern.includes('*')) {
      const baseDir = pattern.split('*')[0];
      if (fs.existsSync(baseDir)) {
        const dirs = fs.readdirSync(baseDir);
        dirs.forEach(dir => {
          const fullPath = path.join(baseDir, dir);
          if (fs.statSync(fullPath).isDirectory()) {
            // Проверяем наличие конфига в workspace
            const wsConfig = config.detectConfig(fullPath);
            if (wsConfig) {
              workspaceDirs.push(fullPath);
            }
          }
        });
      }
    } else {
      const fullPath = path.join(cwd, pattern);
      const wsConfig = config.detectConfig(fullPath);
      if (fs.existsSync(fullPath) && wsConfig) {
        workspaceDirs.push(fullPath);
      }
    }
  }

  switch (action) {
    case 'list': {
      console.log('\n' + t('commands.workspaces.list_title') + '\n');
      workspaceDirs.forEach(ws => {
        const wsConf = config.readConfig(ws);
        const relativePath = path.relative(cwd, ws);
        console.log(`  📁 ${wsConf.name}@${wsConf.version}`);
        console.log(`     ${relativePath}\n`);
      });
      break;
    }

    case 'run': {
      if (!arg) {
        console.log(t('commands.workspaces.run_usage'));
        return;
      }

      console.log(
        t('commands.workspaces.run_start', { script: arg, count: workspaceDirs.length }) + '\n'
      );

      for (const ws of workspaceDirs) {
        const wsConf = config.readConfig(ws);
        const script = wsConf.scripts?.[arg];

        if (script) {
          console.log('\n' + t('commands.workspaces.run_workspace_title', { name: wsConf.name }));
          console.log(t('commands.workspaces.run_script_output_label', { script: script }));
          try {
            execSync(`cd "${ws}" && mip run ${arg}`, { stdio: 'inherit' });
          } catch {
            console.log(t('commands.workspaces.run_failed', { name: wsConf.name }));
          }
        } else {
          console.log(t('commands.workspaces.run_no_script', { name: wsConf.name, script: arg }));
        }
      }
      break;
    }

    case 'install': {
      console.log(t('commands.workspaces.install_start', { count: workspaceDirs.length }) + '\n');

      for (const ws of workspaceDirs) {
        const wsConf = config.readConfig(ws);
        console.log('\n📦 ' + wsConf.name + ':');
        try {
          execSync(`cd "${ws}" && mip install --production=false`, {
            stdio: 'inherit',
            env: { ...process.env, MIP_CI: 'true' },
          });
        } catch {
          console.log('   ❌ Failed to install in ' + wsConf.name);
        }
      }
      console.log('\n' + t('commands.workspaces.install_success'));
      break;
    }

    case 'exec': {
      if (!arg) {
        console.log(t('commands.workspaces.exec_usage'));
        return;
      }

      console.log(
        t('commands.workspaces.exec_start', { command: arg, count: workspaceDirs.length }) + '\n'
      );

      for (const ws of workspaceDirs) {
        const wsConf = config.readConfig(ws);
        console.log('\n📦 ' + wsConf.name + ':');
        try {
          execSync(`cd "${ws}" && ${arg}`, { stdio: 'inherit' });
        } catch {
          console.log(t('commands.workspaces.exec_failed', { name: wsConf.name }));
        }
      }
      break;
    }

    default: {
      console.log(t('commands.workspaces.default_help'));
    }
  }
}

module.exports = { workspaces };