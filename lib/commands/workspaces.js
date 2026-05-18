const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const { loadLangForCwd, getI18n } = require('../i18n');

async function workspaces(action, arg) {
  const cwd = process.cwd();
  const configPath = path.join(cwd, 'mip.json');
  const { t } = getI18n(loadLangForCwd(cwd));

  if (!fs.existsSync(configPath)) {
    console.log(t('commands.workspaces.no_mip_json'));
    return;
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const workspacesPatterns = config.workspaces || [];

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
            const pkgPath = path.join(fullPath, 'mip.json');
            if (fs.existsSync(pkgPath)) {
              workspaceDirs.push(fullPath);
            }
          }
        });
      }
    } else {
      const fullPath = path.join(cwd, pattern);
      if (fs.existsSync(fullPath) && fs.existsSync(path.join(fullPath, 'mip.json'))) {
        workspaceDirs.push(fullPath);
      }
    }
  }

  switch (action) {
    case 'list': {
      console.log('\n' + t('commands.workspaces.list_title') + '\n');
      workspaceDirs.forEach(ws => {
        const pkg = JSON.parse(fs.readFileSync(path.join(ws, 'mip.json'), 'utf8'));
        const relativePath = path.relative(cwd, ws);
        console.log(`  📁 ${pkg.name}@${pkg.version}`);
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
        const pkg = JSON.parse(fs.readFileSync(path.join(ws, 'mip.json'), 'utf8'));
        const script = pkg.scripts?.[arg];

        if (script) {
          console.log('\n' + t('commands.workspaces.run_workspace_title', { name: pkg.name }));
          console.log(t('commands.workspaces.run_script_output_label', { script: script }));
          try {
            execSync(`cd "${ws}" && mip run ${arg}`, { stdio: 'inherit' });
          } catch {
            console.log(t('commands.workspaces.run_failed', { name: pkg.name }));
          }
        } else {
          console.log(t('commands.workspaces.run_no_script', { name: pkg.name, script: arg }));
        }
      }
      break;
    }

    case 'install': {
      console.log(
        t('commands.workspaces.install_start', { count: workspaceDirs.length }) + '\n'
      );

      for (const ws of workspaceDirs) {
        const pkg = JSON.parse(fs.readFileSync(path.join(ws, 'mip.json'), 'utf8'));
        console.log('\n📦 ' + pkg.name + ':');
        try {
          execSync(`cd "${ws}" && mip install --production=false`, {
            stdio: 'inherit',
            env: { ...process.env, MIP_CI: 'true' }
          });
        } catch {
          console.log('   ❌ Failed to install in ' + pkg.name);
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
        const pkg = JSON.parse(fs.readFileSync(path.join(ws, 'mip.json'), 'utf8'));
        console.log('\n📦 ' + pkg.name + ':');
        try {
          execSync(`cd "${ws}" && ${arg}`, { stdio: 'inherit' });
        } catch {
          console.log(t('commands.workspaces.exec_failed', { name: pkg.name }));
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
