#!/bin/bash

# ============================================================================
# MIP Installer - TUI application for automatic installation of MIP
# https://github.com/kiwinatra/mip
# ============================================================================

set -e

# ----------------------------------------------------------------------------
# Terminal color definitions for enhanced user experience
# These are used throughout the application for visual feedback
# ----------------------------------------------------------------------------
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly MAGENTA='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

# ----------------------------------------------------------------------------
# Internationalization support
# MSG associative array holds all user-facing strings
# Currently supports English (default) and Russian
# ----------------------------------------------------------------------------
declare -A MSG

# Load language-specific strings based on user selection
# Arguments:
#   $1 - Language code ("EN" or "RU")
load_language() {
    local lang="$1"
    
    if [[ "$lang" == "RU" ]]; then
        # Russian localization
        MSG[title]="Установщик MIP"
        MSG[subtitle]="Минимальный менеджер пакетов"
        MSG[lang_prompt]="Выберите язык:"
        MSG[lang_en]="English"
        MSG[lang_ru]="Русский"
        MSG[welcome]="Добро пожаловать в установщик MIP!"
        MSG[install_ask]="Хотите установить MIP?"
        MSG[yes]="Да"
        MSG[no]="Нет"
        MSG[cancel]="Отмена"
        MSG[checking]="Проверка зависимостей..."
        MSG[node_ok]="Node.js найден:"
        MSG[node_error]="Node.js не найден или версия ниже 18"
        MSG[npm_ok]="npm найден:"
        MSG[npm_error]="npm не найден"
        MSG[git_ok]="Git найден:"
        MSG[git_error]="Git не найден"
        MSG[all_deps_ok]="Все зависимости установлены!"
        MSG[install_deps]="Установите недостающие зависимости и запустите скрипт снова"
        MSG[cloning]="Клонирование репозитория mip..."
        MSG[clone_ok]="Репозиторий склонирован"
        MSG[clone_error]="Ошибка клонирования репозитория"
        MSG[installing]="Установка зависимостей npm..."
        MSG[npm_install_ok]="Зависимости установлены"
        MSG[npm_install_error]="Ошибка установки зависимостей"
        MSG[building]="Сборка бинарника через pkg..."
        MSG[build_ok]="Бинарник собран успешно"
        MSG[build_error]="Ошибка сборки бинарника"
        MSG[path_prompt]="Добавить mip в PATH? (потребуется sudo)"
        MSG[path_yes]="Да, добавить в PATH"
        MSG[path_no]="Нет, оставить в dist"
        MSG[path_installing]="Установка в /usr/local/bin..."
        MSG[path_sudo]="Введите пароль sudo для установки:"
        MSG[path_ok]="MIP установлен в PATH (/usr/local/bin/mip)"
        MSG[path_error]="Ошибка установки в PATH"
        MSG[path_skip]="Установка в PATH пропущена"
        MSG[path_manual]="Бинарник находится в:"
        MSG[complete]="Установка завершена!"
        MSG[usage]="Использование:"
        MSG[cmd_help]="mip --help  - показать справку"
        MSG[cmd_init]="mip init    - инициализировать проект"
        MSG[cmd_install]="mip install <pkg>  - установить пакет"
        MSG[thanks]="Спасибо за установку MIP!"
        MSG[press_enter]="Нажмите Enter для продолжения..."
        MSG[error]="Ошибка"
        MSG[success]="Успех"
        MSG[info]="Информация"
        MSG[warning]="Предупреждение"
        MSG[size]="Размер бинарника:"
        MSG[use_binary]="Используйте:"
        MSG[clone_progress]="Клонирование..."
        MSG[npm_progress]="Установка npm-пакетов..."
        MSG[build_progress]="Компиляция..."
        MSG[installing_pkg]="Устанавливаем pkg глобально..."
    else
        # Default to English localization
        MSG[title]="MIP Installer"
        MSG[subtitle]="Minimal Package Manager"
        MSG[lang_prompt]="Select language:"
        MSG[lang_en]="English"
        MSG[lang_ru]="Russian"
        MSG[welcome]="Welcome to MIP Installer!"
        MSG[install_ask]="Do you want to install MIP?"
        MSG[yes]="Yes"
        MSG[no]="No"
        MSG[cancel]="Cancel"
        MSG[checking]="Checking dependencies..."
        MSG[node_ok]="Node.js found:"
        MSG[node_error]="Node.js not found or version < 18"
        MSG[npm_ok]="npm found:"
        MSG[npm_error]="npm not found"
        MSG[git_ok]="Git found:"
        MSG[git_error]="Git not found"
        MSG[all_deps_ok]="All dependencies installed!"
        MSG[install_deps]="Please install missing dependencies and run again"
        MSG[cloning]="Cloning mip repository..."
        MSG[clone_ok]="Repository cloned"
        MSG[clone_error]="Failed to clone repository"
        MSG[installing]="Installing npm dependencies..."
        MSG[npm_install_ok]="Dependencies installed"
        MSG[npm_install_error]="Failed to install dependencies"
        MSG[building]="Building binary with pkg..."
        MSG[build_ok]="Binary built successfully"
        MSG[build_error]="Failed to build binary"
        MSG[path_prompt]="Add mip to PATH? (requires sudo)"
        MSG[path_yes]="Yes, add to PATH"
        MSG[path_no]="No, keep in dist"
        MSG[path_installing]="Installing to /usr/local/bin..."
        MSG[path_sudo]="Enter sudo password for installation:"
        MSG[path_ok]="MIP installed to PATH (/usr/local/bin/mip)"
        MSG[path_error]="Failed to install to PATH"
        MSG[path_skip]="PATH installation skipped"
        MSG[path_manual]="Binary is located at:"
        MSG[complete]="Installation complete!"
        MSG[usage]="Usage:"
        MSG[cmd_help]="mip --help  - show help"
        MSG[cmd_init]="mip init    - initialize project"
        MSG[cmd_install]="mip install <pkg>  - install package"
        MSG[thanks]="Thank you for installing MIP!"
        MSG[press_enter]="Press Enter to continue..."
        MSG[error]="Error"
        MSG[success]="Success"
        MSG[info]="Info"
        MSG[warning]="Warning"
        MSG[size]="Binary size:"
        MSG[use_binary]="Use:"
        MSG[clone_progress]="Cloning..."
        MSG[npm_progress]="Installing npm packages..."
        MSG[build_progress]="Compiling..."
        MSG[installing_pkg]="Installing pkg globally..."
    fi
}

# ----------------------------------------------------------------------------
# TUI abstraction layer
# These functions provide a unified interface for both dialog-based and
# fallback console-based user interaction
# ----------------------------------------------------------------------------

# Display a message box to the user
# Arguments:
#   $1 - Message type (error, success, info, warning)
#   $2 - Message text to display
show_message() {
    local type="$1"
    local text="$2"
    local title="${MSG[$type]:-${MSG[info]}}"
    
    # Prefer dialog for better UX, fallback to plain echo
    if command -v dialog &>/dev/null; then
        dialog --title "$title" --msgbox "$text" 10 60
    else
        echo -e "${BOLD}[$title]${NC} $text"
    fi
}

# Present a yes/no question to the user
# Returns 0 for Yes, 1 for No
# Arguments:
#   $1 - Question text
show_yesno() {
    local text="$1"
    local title="${MSG[title]}"
    
    if command -v dialog &>/dev/null; then
        dialog --title "$title" \
               --backtitle "${MSG[subtitle]}" \
               --yes-label "${MSG[yes]}" \
               --no-label "${MSG[no]}" \
               --yesno "$text" 10 60
        return $?
    else
        # Fallback to simple input
        echo -n -e "${YELLOW}$text (y/N): ${NC}"
        read -r answer
        [[ "$answer" =~ ^[Yy]$ ]]
        return $?
    fi
}

# Display a selection menu
# Returns the selected option value
# Arguments:
#   $1 - Menu title
#   $@ - Array of options (label1, value1, label2, value2, ...)
show_menu() {
    local title="$1"
    shift
    local options=("$@")
    
    if command -v dialog &>/dev/null; then
        dialog --title "$title" \
               --backtitle "${MSG[subtitle]}" \
               --menu "" 12 50 4 \
               "${options[@]}" \
               2>&1 >/dev/tty
        return $?
    else
        # Fallback to numeric selection
        echo -e "${BOLD}$title${NC}"
        local i=1
        while [[ $i -lt ${#options[@]} ]]; do
            echo "  $i) ${options[$i]}"
            i=$((i + 2))
        done
        echo -n -e "${BLUE}${BOLD}Choose (1-${#options[@]/2}): ${NC}"
        read -r choice
        echo "$choice"
        return 0
    fi
}

# Show a progress/status indicator
# Arguments:
#   $1 - Title
#   $2 - Status text
show_progress() {
    local title="$1"
    local text="$2"
    
    if command -v dialog &>/dev/null; then
        dialog --title "$title" \
               --backtitle "${MSG[subtitle]}" \
               --infobox "$text" 8 50
    else
        echo -e "${BLUE}▶ $title${NC}"
        echo -e "  $text"
    fi
}

# ----------------------------------------------------------------------------
# Utility functions for colored output
# These provide consistent formatting across the application
# ----------------------------------------------------------------------------

print_color() {
    echo -e "${2}${1}${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_step() {
    echo -e "\n${CYAN}▶ $1${NC}"
}

print_header() {
    echo -e "\n${BOLD}${MAGENTA}$1${NC}"
}

# ----------------------------------------------------------------------------
# Dependency validation
# ----------------------------------------------------------------------------

# Check if Node.js version meets minimum requirement (>= 18)
# Returns 0 if version is sufficient, 1 otherwise
check_node_version() {
    local current=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1)
    local required="18"
    
    [[ -z "$current" ]] && return 1
    [[ "$current" -ge "$required" ]] 2>/dev/null
    return $?
}

# Verify that all required tools are installed and meet version requirements
# Returns 0 if all dependencies are satisfied, 1 otherwise
check_dependencies() {
    show_progress "${MSG[checking]}" "${MSG[checking]}"
    
    local all_ok=0
    local deps_status=""
    
    # Check for Node.js with version validation
    if command -v node &>/dev/null; then
        if check_node_version; then
            local node_ver=$(node -v)
            deps_status="${deps_status}✅ ${MSG[node_ok]} $node_ver\n"
        else
            local node_ver=$(node -v)
            deps_status="${deps_status}❌ ${MSG[node_error]} (current: $node_ver)\n"
            all_ok=1
        fi
    else
        deps_status="${deps_status}❌ ${MSG[node_error]}\n"
        all_ok=1
    fi
    
    # Check for npm package manager
    if command -v npm &>/dev/null; then
        local npm_ver=$(npm -v)
        deps_status="${deps_status}✅ ${MSG[npm_ok]} v$npm_ver\n"
    else
        deps_status="${deps_status}❌ ${MSG[npm_error]}\n"
        all_ok=1
    fi
    
    # Check for Git version control
    if command -v git &>/dev/null; then
        local git_ver=$(git --version | awk '{print $3}')
        deps_status="${deps_status}✅ ${MSG[git_ok]} $git_ver\n"
    else
        deps_status="${deps_status}❌ ${MSG[git_error]}\n"
        all_ok=1
    fi
    
    # Display dependency check results
    if command -v dialog &>/dev/null; then
        if [[ $all_ok -eq 0 ]]; then
            dialog --title "${MSG[success]}" \
                   --backtitle "${MSG[subtitle]}" \
                   --msgbox "$deps_status\n${MSG[all_deps_ok]}" 12 60
        else
            dialog --title "${MSG[error]}" \
                   --backtitle "${MSG[subtitle]}" \
                   --msgbox "$deps_status\n\n${MSG[install_deps]}" 14 60
        fi
    else
        echo -e "$deps_status"
        if [[ $all_ok -eq 0 ]]; then
            print_success "${MSG[all_deps_ok]}"
        else
            print_error "${MSG[install_deps]}"
        fi
    fi
    
    return $all_ok
}

# ----------------------------------------------------------------------------
# Core installation logic
# ----------------------------------------------------------------------------

# Main installation routine
# Handles repository cloning, dependency installation, binary compilation,
# and system PATH integration
# Arguments:
#   $1 - Language code ("EN" or "RU")
install_mip() {
    local lang="$1"
    
    # Verify system requirements before proceeding
    if ! check_dependencies; then
        echo
        read -p "${MSG[press_enter]}"
        return 1
    fi
    
    echo
    
    # Clone the MIP repository from GitHub
    show_progress "${MSG[cloning]}" "${MSG[clone_progress]}"
    
    # Clean up any existing directory to ensure fresh clone
    if [[ -d "mip" ]]; then
        rm -rf mip
    fi
    
    if git clone https://github.com/kiwinatra/mip.git --quiet 2>/dev/null; then
        if command -v dialog &>/dev/null; then
            dialog --title "${MSG[success]}" \
                   --backtitle "${MSG[subtitle]}" \
                   --msgbox "${MSG[clone_ok]}" 8 50
        else
            print_success "${MSG[clone_ok]}"
        fi
    else
        show_message "error" "${MSG[clone_error]}"
        return 1
    fi
    
    # Navigate to the cloned repository
    cd mip
    
    # Install npm dependencies as defined in package.json
    show_progress "${MSG[installing]}" "${MSG[npm_progress]}"
    
    if npm install --silent 2>/dev/null; then
        if command -v dialog &>/dev/null; then
            dialog --title "${MSG[success]}" \
                   --backtitle "${MSG[subtitle]}" \
                   --msgbox "${MSG[npm_install_ok]}" 8 50
        else
            print_success "${MSG[npm_install_ok]}"
        fi
    else
        show_message "error" "${MSG[npm_install_error]}"
        cd ..
        return 1
    fi
    
    # Ensure pkg is available globally for binary compilation
    if ! command -v pkg &>/dev/null; then
        show_progress "${MSG[installing_pkg]}" "${MSG[installing_pkg]}"
        npm install -g pkg --silent 2>/dev/null || sudo npm install -g pkg --silent 2>/dev/null
    fi
    
    # Build the standalone binary using pkg
    show_progress "${MSG[building]}" "${MSG[build_progress]}"
    
    mkdir -p dist
    
    # Suppress pkg warnings for cleaner output
    if npx pkg bin/mip.js --targets node18-linux-x64 --output dist/mip 2>&1 | grep -v "warning" >/dev/null || true; then
        chmod +x dist/mip
        local binary_size=$(du -h dist/mip | cut -f1)
        
        if command -v dialog &>/dev/null; then
            dialog --title "${MSG[success]}" \
                   --backtitle "${MSG[subtitle]}" \
                   --msgbox "${MSG[build_ok]}\n\n${MSG[size]} $binary_size" 10 50
        else
            print_success "${MSG[build_ok]}"
            print_info "${MSG[size]} $binary_size"
        fi
    else
        show_message "error" "${MSG[build_error]}"
        cd ..
        return 1
    fi
    
    # Prompt user for system-wide installation
    local path_choice
    if command -v dialog &>/dev/null; then
        path_choice=$(dialog --title "${MSG[title]}" \
                             --backtitle "${MSG[subtitle]}" \
                             --menu "${MSG[path_prompt]}" 12 60 4 \
                             1 "${MSG[path_yes]}" \
                             2 "${MSG[path_no]}" \
                             2>&1 >/dev/tty)
    else
        echo
        echo -e "${YELLOW}${MSG[path_prompt]}${NC}"
        echo "  1) ${MSG[path_yes]}"
        echo "  2) ${MSG[path_no]}"
        echo -n -e "${BLUE}${BOLD}Choose (1-2): ${NC}"
        read -r path_choice
    fi
    
    # Handle PATH installation with sudo
    if [[ "$path_choice" == "1" ]]; then
        show_progress "${MSG[path_installing]}" "${MSG[path_installing]}"
        
        local sudo_pass
        if command -v dialog &>/dev/null; then
            sudo_pass=$(dialog --title "${MSG[title]}" \
                              --backtitle "${MSG[subtitle]}" \
                              --passwordbox "${MSG[path_sudo]}" 10 50 \
                              2>&1 >/dev/tty)
        else
            echo -n -e "${YELLOW}${MSG[path_sudo]} ${NC}"
            read -rs sudo_pass
            echo
        fi
        
        # Attempt to copy binary to system PATH
        if echo "$sudo_pass" | sudo -S cp dist/mip /usr/local/bin/mip 2>/dev/null; then
            echo "$sudo_pass" | sudo -S chmod +x /usr/local/bin/mip 2>/dev/null
            show_message "success" "${MSG[path_ok]}"
        else
            show_message "error" "${MSG[path_error]}"
            print_warning "${MSG[path_manual]} $(pwd)/dist/mip"
        fi
    else
        # Provide location of binary for manual use
        show_message "info" "${MSG[path_skip]}\n\n${MSG[path_manual]} $(pwd)/dist/mip\n\n${MSG[use_binary]} $(pwd)/dist/mip --help"
    fi
    
    cd ..
    
    # Display installation completion summary with usage instructions
    local final_msg="${MSG[complete]}\n\n"
    final_msg="${final_msg}${MSG[usage]}\n"
    final_msg="${final_msg}  mip --help  - ${MSG[cmd_help]}\n"
    final_msg="${final_msg}  mip init    - ${MSG[cmd_init]}\n"
    final_msg="${final_msg}  mip install <pkg>  - ${MSG[cmd_install]}\n\n"
    final_msg="${final_msg}${MSG[thanks]}"
    
    show_message "success" "$final_msg"
    
    return 0
}

# ----------------------------------------------------------------------------
# Application entry point
# ----------------------------------------------------------------------------

# Main function - initializes the installer, handles language selection,
# and orchestrates the installation workflow
main() {
    # Clear screen for clean presentation
    clear
    
    # Display ASCII logo and branding
    echo -e "${CYAN}"
    cat << "EOF"
    ███╗   ███╗██╗██████╗ 
    ████╗ ████║██║██╔══██╗
    ██╔████╔██║██║██████╔╝
    ██║╚██╔╝██║██║██╔═══╝ 
    ██║ ╚═╝ ██║██║██║     
    ╚═╝     ╚═╝╚═╝╚═╝     
EOF
    echo -e "${NC}"
    echo -e "${BOLD}${MAGENTA}MIP Installer v1.0${NC}"
    echo -e "${BLUE}Minimal Package Manager${NC}"
    echo -e "${YELLOW}https://github.com/kiwinatra/mip${NC}"
    echo
    
    # Prompt for language preference
    local lang_choice
    if command -v dialog &>/dev/null; then
        lang_choice=$(dialog --title "${MSG[title]}" \
                             --backtitle "${MSG[subtitle]}" \
                             --menu "${MSG[lang_prompt]}" 10 50 4 \
                             1 "${MSG[lang_en]}" \
                             2 "${MSG[lang_ru]}" \
                             2>&1 >/dev/tty)
    else
        echo -e "${BOLD}${MSG[lang_prompt]}${NC}"
        echo "  1) ${MSG[lang_en]}"
        echo "  2) ${MSG[lang_ru]}"
        echo -n -e "${BLUE}${BOLD}Choose (1-2): ${NC}"
        read -r lang_choice
    fi
    
    # Load selected language
    case $lang_choice in
        2) load_language "RU" ;;
        *) load_language "EN" ;;
    esac
    
    clear
    
    # Ask user if they want to proceed with installation
    if show_yesno "${MSG[welcome]}\n\n${MSG[install_ask]}"; then
        install_mip "$lang_choice"
    else
        show_message "info" "${MSG[thanks]}"
    fi
    
    # Wait for user input before exiting
    echo
    read -p "${MSG[press_enter]}"
    clear
}

# ----------------------------------------------------------------------------
# Script initialization
# ----------------------------------------------------------------------------

# Load default language (English) and start the application
load_language "EN"
main "$@"