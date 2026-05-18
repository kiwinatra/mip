_mip_completion() {
  local cur prev words cword
  _init_completion || return
  
  case $prev in
    mip)
      COMPREPLY=($(compgen -W "init install uninstall list update search info outdated audit ci run link create cache doctor why exec workspaces" -- "$cur"))
      ;;
    install|uninstall|why|info)
      # Автодополнение установленных пакетов
      if [[ -f "mip-lock.json" ]]; then
        local packages=$(node -e "console.log(Object.keys(require('./mip-lock.json').packages || {}).map(p=>p.split('@')[0]).join(' '))")
        COMPREPLY=($(compgen -W "$packages" -- "$cur"))
      fi
      ;;
    run)
      if [[ -f "mip.json" ]]; then
        local scripts=$(node -e "console.log(Object.keys(require('./mip.json').scripts || {}).join(' '))")
        COMPREPLY=($(compgen -W "$scripts" -- "$cur"))
      fi
      ;;
    create)
      COMPREPLY=($(compgen -W "node react cli express" -- "$cur"))
      ;;
  esac
}

complete -F _mip_completion mip