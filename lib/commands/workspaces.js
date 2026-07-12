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
const features = require('../utils/features');

async function workspaces(action, arg) {
  const cwd = process.cwd();
  const { t } = getI18n(loadLangForCwd(cwd));
  const mipFeatures = features.loadFeatures(cwd);

  // Проверка включен ли workspaces
  if (mipFeatures['workspaces.enabled'] === false) {
    console.log('ℹ️ Workspaces are disabled (workspaces.enabled: false)');
    return;
  }

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
  const autoLink = mipFeatures['monorepo.autoLink'] !== false;
  const ignoreRoot = mipFeatures['monorepo.ignoreWorkspaceRoot'] || false;

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

  // Игнорируем корневой workspace если включено
  const filteredDirs = ignoreRoot 
    ? workspaceDirs.filter(dir => path.basename(dir) !== path.basename(cwd))
    : workspaceDirs;

  // Проверка interactive
  if (mipFeatures['interactive.promptOnWorkspaces'] !== false && filteredDirs.length > 0) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      const actionNames = {
        'list': 'list',
        'run': 'run script',
        'install': 'install dependencies',
        'exec': 'execute command'
      };
      rl.question(`📁 Run workspace ${actionNames[action] || action} in ${filteredDirs.length} workspaces? (Y/n) `, resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') {
      console.log('❌ Workspace operation cancelled');
      return;
    }
  }

  switch (action) {
    case 'list': {
      console.log('\n' + t('commands.workspaces.list_title') + '\n');
      filteredDirs.forEach(ws => {
        const wsConf = config.readConfig(ws);
        const relativePath = path.relative(cwd, ws);
        console.log(`  📁 ${wsConf.name || path.basename(ws)}@${wsConf.version || '1.0.0'}`);
        console.log(`     ${relativePath}\n`);
      });
      break;
    }

    case 'run': {
      if (!arg) {
        console.log(t('commands.workspaces.run_usage'));
        return;
      }

      const runInOrder = mipFeatures['monorepo.runScriptsInOrder'] !== false;
      console.log(
        t('commands.workspaces.run_start', { script: arg, count: filteredDirs.length }) + '\n'
      );

      const runWorkspace = async (ws) => {
        const wsConf = config.readConfig(ws);
        const script = wsConf.scripts?.[arg];

        if (script) {
          console.log('\n' + t('commands.workspaces.run_workspace_title', { name: wsConf.name || path.basename(ws) }));
          console.log(t('commands.workspaces.run_script_output_label', { script: script }));
          try {
            execSync(`cd "${ws}" && mip run ${arg}`, { stdio: 'inherit' });
          } catch {
            console.log(t('commands.workspaces.run_failed', { name: wsConf.name || path.basename(ws) }));
          }
        } else {
          console.log(t('commands.workspaces.run_no_script', { name: wsConf.name || path.basename(ws), script: arg }));
        }
      };

      if (runInOrder) {
        for (const ws of filteredDirs) {
          await runWorkspace(ws);
        }
      } else {
        const promises = filteredDirs.map(ws => runWorkspace(ws));
        await Promise.all(promises);
      }
      break;
    }

    case 'install': {
      console.log(t('commands.workspaces.install_start', { count: filteredDirs.length }) + '\n');

      const hoist = mipFeatures['monorepo.hoistWorkspaces'] || false;
      
      for (const ws of filteredDirs) {
        const wsConf = config.readConfig(ws);
        console.log('\n📦 ' + (wsConf.name || path.basename(ws)) + ':');
        try {
          const cmd = hoist 
            ? `cd "${ws}" && mip install --hoist`
            : `cd "${ws}" && mip install --production=false`;
          execSync(cmd, {
            stdio: 'inherit',
            env: { ...process.env, MIP_CI: 'true' },
          });
        } catch {
          console.log('   ❌ Failed to install in ' + (wsConf.name || path.basename(ws)));
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

      const parallel = mipFeatures['monorepo.parallelScripts'] || false;
      console.log(
        t('commands.workspaces.exec_start', { command: arg, count: filteredDirs.length }) + '\n'
      );

      const execWorkspace = (ws) => {
        const wsConf = config.readConfig(ws);
        console.log('\n📦 ' + (wsConf.name || path.basename(ws)) + ':');
        try {
          execSync(`cd "${ws}" && ${arg}`, { stdio: 'inherit' });
        } catch {
          console.log(t('commands.workspaces.exec_failed', { name: wsConf.name || path.basename(ws) }));
        }
      };

      if (parallel) {
        const promises = filteredDirs.map(ws => {
          return new Promise((resolve) => {
            try {
              execWorkspace(ws);
              resolve();
            } catch {
              resolve();
            }
          });
        });
        await Promise.all(promises);
      } else {
        for (const ws of filteredDirs) {
          execWorkspace(ws);
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