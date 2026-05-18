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
  )
  
  _describe 'command' commands
}

compdef _mip mip