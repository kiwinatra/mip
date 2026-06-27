# /usr/share/bash-completion/completions/mip
# или ~/.bashrc
# или /etc/bash_completion.d/mip


# cat >> ~/.bashrc << 'EOF'
# MIP autocompletion
# _mip_completion() { ... }
# complete -F _mip_completion mip
# EOF
source ~/.bashrc
_mip_completion() {
  local cur prev words cword
  _init_completion || return

  # Получаем список команд
  local commands="init install uninstall list update search info outdated audit ci run link create cache doctor why exec workspaces plugin pe"

  case $prev in
    mip)
      COMPREPLY=($(compgen -W "$commands" -- "$cur"))
      return 0
      ;;

    install|uninstall|why|info|mip)
      # Автодополнение установленных пакетов из mip-lock.yml
      if [[ -f "mip-lock.yml" ]]; then
        local packages=$(node -e "
          const yaml = require('js-yaml');
          const fs = require('fs');
          try {
            const lock = yaml.load(fs.readFileSync('mip-lock.yml', 'utf8'));
            const pkgs = Object.keys(lock.packages || {}).map(p => p.split('@')[0]);
            console.log(pkgs.join(' '));
          } catch(e) {
            console.log('');
          }
        " 2>/dev/null)
        COMPREPLY=($(compgen -W "$packages" -- "$cur"))
      fi
      return 0
      ;;

    run)
      # Автодополнение скриптов из mip.yml
      if [[ -f "mip.yml" ]]; then
        local scripts=$(node -e "
          const yaml = require('js-yaml');
          const fs = require('fs');
          try {
            const config = yaml.load(fs.readFileSync('mip.yml', 'utf8'));
            console.log(Object.keys(config.scripts || {}).join(' '));
          } catch(e) {
            console.log('');
          }
        " 2>/dev/null)
        COMPREPLY=($(compgen -W "$scripts" -- "$cur"))
      fi
      return 0
      ;;

    create)
      COMPREPLY=($(compgen -W "node react cli express" -- "$cur"))
      return 0
      ;;

    plugin)
      local plugin_actions="create compile activate deactivate list remove cleanall get"
      COMPREPLY=($(compgen -W "$plugin_actions" -- "$cur"))
      return 0
      ;;

    pe)
      # Автодополнение плагинов из кэша
      local plugins=$(node -e "
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
      " 2>/dev/null)
      COMPREPLY=($(compgen -W "$plugins" -- "$cur"))
      return 0
      ;;

    workspaces)
      COMPREPLY=($(compgen -W "list run install exec" -- "$cur"))
      return 0
      ;;

    cache)
      COMPREPLY=($(compgen -W "clean size usage" -- "$cur"))
      return 0
      ;;

    # Флаги
    --*)
      COMPREPLY=($(compgen -W "--help --version --json --tree --fix --save-dev --force --global --no-save --super" -- "$cur"))
      return 0
      ;;
  esac

  # Если слово начинается с --
  if [[ "$cur" == --* ]]; then
    COMPREPLY=($(compgen -W "--help --version --json --tree --fix --save-dev --force --global --no-save --super --full" -- "$cur"))
    return 0
  fi

  # Если команда уже введена, предлагаем пакеты из lock-файла
  if [[ " install uninstall why info " =~ " $prev " ]]; then
    if [[ -f "mip-lock.yml" ]]; then
      local packages=$(node -e "
        const yaml = require('js-yaml');
        const fs = require('fs');
        try {
          const lock = yaml.load(fs.readFileSync('mip-lock.yml', 'utf8'));
          const pkgs = Object.keys(lock.packages || {}).map(p => p.split('@')[0]);
          console.log(pkgs.join(' '));
        } catch(e) {
          console.log('');
        }
      " 2>/dev/null)
      COMPREPLY=($(compgen -W "$packages" -- "$cur"))
    fi
  fi

  return 0
}

# Регистрируем автодополнение
complete -F _mip_completion mip