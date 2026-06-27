#compdef mip

_mip() {
  local -a commands
  commands=(
    'init:Create new project'
    'install:Install packages'
    'uninstall:Remove packages'
    'list:Show installed packages'
    'update:Update packages'
    'search:Search npm registry'
    'info:Show package info'
    'outdated:Show outdated packages'
    'audit:Security audit'
    'ci:CI installation'
    'run:Run scripts'
    'link:Link local packages'
    'create:Create from template'
    'cache:Manage cache'
    'doctor:System diagnostics'
    'why:Explain why package is installed'
    'exec:Execute local binaries'
    'workspaces:Monorepo management'
    'plugin:Manage plugins'
    'pe:Execute plugin command'
    'global:Manage global packages'
    'repo:Browse GitHub repositories'
    'dedupe:Deduplicate dependencies'
    'exports:View package exports'
    'genlock:Generate lockfile'
    'language:Change interface language'
    'legacy:Work with legacy packages'
    'super-install:Super fast installation'
    'oldrepo:Old GitHub browser'
  )

  local -a subcommands
  case $words[2] in
    install|uninstall|why|info)
      _mip_packages
      return
      ;;
    run)
      _mip_scripts
      return
      ;;
    create)
      _mip_templates
      return
      ;;
    plugin)
      _mip_plugin_actions
      return
      ;;
    pe)
      _mip_plugins
      return
      ;;
    workspaces)
      _mip_workspaces_actions
      return
      ;;
    cache)
      _mip_cache_actions
      return
      ;;
    repo)
      _mip_repo_args
      return
      ;;
  esac

  _describe 'command' commands
}

_mip_packages() {
  local -a packages
  if [[ -f "mip-lock.yml" ]]; then
    packages=($(node -e "
      const yaml = require('js-yaml');
      const fs = require('fs');
      try {
        const lock = yaml.load(fs.readFileSync('mip-lock.yml', 'utf8'));
        const pkgs = Object.keys(lock.packages || {}).map(p => p.split('@')[0]);
        console.log(pkgs.join(' '));
      } catch(e) {
        console.log('');
      }
    " 2>/dev/null))
  fi
  _describe 'package' packages
}

_mip_scripts() {
  local -a scripts
  if [[ -f "mip.yml" ]]; then
    scripts=($(node -e "
      const yaml = require('js-yaml');
      const fs = require('fs');
      try {
        const config = yaml.load(fs.readFileSync('mip.yml', 'utf8'));
        console.log(Object.keys(config.scripts || {}).join(' '));
      } catch(e) {
        console.log('');
      }
    " 2>/dev/null))
  fi
  _describe 'script' scripts
}

_mip_templates() {
  local -a templates=('node:Node.js project' 'react:React app' 'cli:CLI tool' 'express:Express API')
  _describe 'template' templates
}

_mip_plugin_actions() {
  local -a actions=(
    'create:Create new plugin'
    'compile:Compile plugin'
    'activate:Activate plugin'
    'deactivate:Deactivate plugin'
    'list:List plugins'
    'remove:Remove plugin'
    'cleanall:Clean all plugins'
    'get:Get plugin from current dir'
  )
  _describe 'action' actions
}

_mip_plugins() {
  local -a plugins
  plugins=($(node -e "
    const fs = require('fs');
    const home = require('os').homedir();
    const registryPath = home + '/.mip_cache/plugins/registry.json';
    try {
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      const names = registry.plugins.filter(p => p.active).map(p => p.name);
      console.log(names.join(' '));
    } catch(e) {
      console.log('');
    }
  " 2>/dev/null))
  _describe 'plugin' plugins
}

_mip_workspaces_actions() {
  local -a actions=('list:List workspaces' 'run:Run script in workspaces' 'install:Install in workspaces' 'exec:Execute command in workspaces')
  _describe 'action' actions
}

_mip_cache_actions() {
  local -a actions=('clean:Clear cache' 'size:Show cache size' 'usage:Show cache usage')
  _describe 'action' actions
}

_mip_repo_args() {
  _arguments \
    '--branch=[Branch to browse]:branch' \
    '--path=[Download path]:path'
}

compdef _mip mip