# ============================================================================
# MIP Installer for Windows - TUI application for automatic installation of MIP
# https://github.com/kiwinatra/mip
# ============================================================================

# ----------------------------------------------------------------------------
# Console settings
# ----------------------------------------------------------------------------
$Host.UI.RawUI.WindowTitle = "MIP Installer v1.0"
$Host.UI.RawUI.BackgroundColor = "Black"
$Host.UI.RawUI.ForegroundColor = "White"
Clear-Host

# ----------------------------------------------------------------------------
# Color functions
# ----------------------------------------------------------------------------
function Write-Color {
    param(
        [string]$Text,
        [string]$Color = "White"
    )
    Write-Host $Text -ForegroundColor $Color
}

function Write-ErrorMsg {
    param([string]$Text)
    Write-Color "❌ $Text" "Red"
}

function Write-Success {
    param([string]$Text)
    Write-Color "✅ $Text" "Green"
}

function Write-Warning {
    param([string]$Text)
    Write-Color "⚠️  $Text" "Yellow"
}

function Write-Info {
    param([string]$Text)
    Write-Color "ℹ️  $Text" "Cyan"
}

function Write-Step {
    param([string]$Text)
    Write-Color "▶ $Text" "Magenta"
}

function Write-Header {
    param([string]$Text)
    Write-Color "`n$Text" "Yellow"
}

# ----------------------------------------------------------------------------
# Language strings
# ----------------------------------------------------------------------------
$MSG = @{}

function Load-Language {
    param([string]$Lang)
    
    if ($Lang -eq "RU") {
        # Russian
        $MSG.Title = "Установщик MIP"
        $MSG.Subtitle = "Минимальный менеджер пакетов"
        $MSG.LangPrompt = "Выберите язык:"
        $MSG.LangEN = "English"
        $MSG.LangRU = "Русский"
        $MSG.Welcome = "Добро пожаловать в установщик MIP!"
        $MSG.InstallAsk = "Хотите установить MIP?"
        $MSG.Yes = "Да"
        $MSG.No = "Нет"
        $MSG.Checking = "Проверка зависимостей..."
        $MSG.NodeOK = "Node.js найден:"
        $MSG.NodeError = "Node.js не найден или версия ниже 18"
        $MSG.NpmOK = "npm найден:"
        $MSG.NpmError = "npm не найден"
        $MSG.GitOK = "Git найден:"
        $MSG.GitError = "Git не найден"
        $MSG.AllDepsOK = "Все зависимости установлены!"
        $MSG.InstallDeps = "Установите недостающие зависимости и запустите скрипт снова"
        $MSG.Cloning = "Клонирование репозитория mip..."
        $MSG.CloneOK = "Репозиторий склонирован"
        $MSG.CloneError = "Ошибка клонирования репозитория"
        $MSG.Installing = "Установка зависимостей npm..."
        $MSG.NpmInstallOK = "Зависимости установлены"
        $MSG.NpmInstallError = "Ошибка установки зависимостей"
        $MSG.Building = "Сборка бинарника через pkg..."
        $MSG.BuildOK = "Бинарник собран успешно"
        $MSG.BuildError = "Ошибка сборки бинарника"
        $MSG.PathPrompt = "Добавить mip в PATH?"
        $MSG.PathYes = "Да, добавить в PATH"
        $MSG.PathNo = "Нет, оставить в dist"
        $MSG.PathInstalling = "Установка в PATH..."
        $MSG.PathAdmin = "Требуются права администратора"
        $MSG.PathOK = "MIP установлен в PATH"
        $MSG.PathError = "Ошибка установки в PATH"
        $MSG.PathSkip = "Установка в PATH пропущена"
        $MSG.PathManual = "Бинарник находится в:"
        $MSG.Complete = "Установка завершена!"
        $MSG.Usage = "Использование:"
        $MSG.CmdHelp = "mip --help  - показать справку"
        $MSG.CmdInit = "mip init    - инициализировать проект"
        $MSG.CmdInstall = "mip install <pkg>  - установить пакет"
        $MSG.Thanks = "Спасибо за установку MIP!"
        $MSG.PressEnter = "Нажмите Enter для продолжения..."
        $MSG.Error = "Ошибка"
        $MSG.Success = "Успех"
        $MSG.Info = "Информация"
        $MSG.Warning = "Предупреждение"
        $MSG.Size = "Размер бинарника:"
        $MSG.UseBinary = "Используйте:"
        $MSG.CloneProgress = "Клонирование..."
        $MSG.NpmProgress = "Установка npm-пакетов..."
        $MSG.BuildProgress = "Компиляция..."
        $MSG.InstallingPkg = "Устанавливаем pkg глобально..."
        $MSG.AdminRequired = "Запустите скрипт от имени администратора для установки в PATH"
        $MSG.InstallLocation = "Куда установить mip?"
        $MSG.InstallUser = "Только для текущего пользователя (рекомендуется)"
        $MSG.InstallSystem = "Для всех пользователей (требует прав администратора)"
    } else {
        # English (default)
        $MSG.Title = "MIP Installer"
        $MSG.Subtitle = "Minimal Package Manager"
        $MSG.LangPrompt = "Select language:"
        $MSG.LangEN = "English"
        $MSG.LangRU = "Russian"
        $MSG.Welcome = "Welcome to MIP Installer!"
        $MSG.InstallAsk = "Do you want to install MIP?"
        $MSG.Yes = "Yes"
        $MSG.No = "No"
        $MSG.Checking = "Checking dependencies..."
        $MSG.NodeOK = "Node.js found:"
        $MSG.NodeError = "Node.js not found or version < 18"
        $MSG.NpmOK = "npm found:"
        $MSG.NpmError = "npm not found"
        $MSG.GitOK = "Git found:"
        $MSG.GitError = "Git not found"
        $MSG.AllDepsOK = "All dependencies installed!"
        $MSG.InstallDeps = "Please install missing dependencies and run again"
        $MSG.Cloning = "Cloning mip repository..."
        $MSG.CloneOK = "Repository cloned"
        $MSG.CloneError = "Failed to clone repository"
        $MSG.Installing = "Installing npm dependencies..."
        $MSG.NpmInstallOK = "Dependencies installed"
        $MSG.NpmInstallError = "Failed to install dependencies"
        $MSG.Building = "Building binary with pkg..."
        $MSG.BuildOK = "Binary built successfully"
        $MSG.BuildError = "Failed to build binary"
        $MSG.PathPrompt = "Add mip to PATH?"
        $MSG.PathYes = "Yes, add to PATH"
        $MSG.PathNo = "No, keep in dist"
        $MSG.PathInstalling = "Installing to PATH..."
        $MSG.PathAdmin = "Administrator privileges required"
        $MSG.PathOK = "MIP installed to PATH"
        $MSG.PathError = "Failed to install to PATH"
        $MSG.PathSkip = "PATH installation skipped"
        $MSG.PathManual = "Binary is located at:"
        $MSG.Complete = "Installation complete!"
        $MSG.Usage = "Usage:"
        $MSG.CmdHelp = "mip --help  - show help"
        $MSG.CmdInit = "mip init    - initialize project"
        $MSG.CmdInstall = "mip install <pkg>  - install package"
        $MSG.Thanks = "Thank you for installing MIP!"
        $MSG.PressEnter = "Press Enter to continue..."
        $MSG.Error = "Error"
        $MSG.Success = "Success"
        $MSG.Info = "Info"
        $MSG.Warning = "Warning"
        $MSG.Size = "Binary size:"
        $MSG.UseBinary = "Use:"
        $MSG.CloneProgress = "Cloning..."
        $MSG.NpmProgress = "Installing npm packages..."
        $MSG.BuildProgress = "Compiling..."
        $MSG.InstallingPkg = "Installing pkg globally..."
        $MSG.AdminRequired = "Run script as Administrator to install to PATH"
        $MSG.InstallLocation = "Where to install mip?"
        $MSG.InstallUser = "Current user only (recommended)"
        $MSG.InstallSystem = "All users (requires admin rights)"
    }
}

# ----------------------------------------------------------------------------
# UI Functions
# ----------------------------------------------------------------------------
function Show-Menu {
    param(
        [string]$Title,
        [array]$Options
    )
    
    Write-Header $Title
    for ($i = 0; $i -lt $Options.Count; $i++) {
        Write-Color "  $($i + 1)) $($Options[$i])" "Cyan"
    }
    Write-Color "  0) $($MSG.Cancel)" "Red"
    
    $choice = Read-Host "`n$($MSG.Choose)"
    return $choice
}

function Show-YesNo {
    param([string]$Message)
    
    $response = Read-Host "$Message (y/N)"
    return ($response -match "^[Yy]$")
}

function Show-Progress {
    param(
        [string]$Title,
        [string]$Message
    )
    
    Write-Step $Title
    Write-Info $Message
}

function Show-MessageBox {
    param(
        [string]$Type,
        [string]$Message
    )
    
    $title = switch ($Type) {
        "error" { $MSG.Error }
        "success" { $MSG.Success }
        "warning" { $MSG.Warning }
        default { $MSG.Info }
    }
    
    $color = switch ($Type) {
        "error" { "Red" }
        "success" { "Green" }
        "warning" { "Yellow" }
        default { "Cyan" }
    }
    
    Write-Color "`n[$title]" $color
    Write-Color $Message "White"
}

# ----------------------------------------------------------------------------
# Utility functions
# ----------------------------------------------------------------------------
function Get-NodeVersion {
    try {
        $nodeVersion = & node -v 2>$null
        if ($nodeVersion) {
            return $nodeVersion -replace 'v', ''
        }
    } catch {}
    return $null
}

function Check-NodeVersion {
    param([string]$Version)
    
    if (-not $Version) { return $false }
    
    $major = ($Version -split '\.')[0]
    return [int]$major -ge 18
}

function Get-PathVariable {
    param([string]$Scope)
    
    if ($Scope -eq "User") {
        return [Environment]::GetEnvironmentVariable("Path", "User")
    } else {
        return [Environment]::GetEnvironmentVariable("Path", "Machine")
    }
}

function Set-PathVariable {
    param(
        [string]$Scope,
        [string]$Value
    )
    
    [Environment]::SetEnvironmentVariable("Path", $Value, $Scope)
}

function Add-ToPath {
    param(
        [string]$Directory,
        [string]$Scope
    )
    
    $currentPath = Get-PathVariable $Scope
    
    if ($currentPath -notlike "*$Directory*") {
        $newPath = "$currentPath;$Directory"
        Set-PathVariable $Scope $newPath
        return $true
    }
    return $false
}

# ----------------------------------------------------------------------------
# Check administrator rights
# ----------------------------------------------------------------------------
function Test-Admin {
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# ----------------------------------------------------------------------------
# Dependency checking
# ----------------------------------------------------------------------------
function Check-Dependencies {
    Show-Progress $MSG.Checking $MSG.Checking
    
    $allOk = $true
    $status = @()
    
    # Check Node.js
    $nodeVersion = Get-NodeVersion
    if ($nodeVersion -and (Check-NodeVersion $nodeVersion)) {
        $status += "✅ $($MSG.NodeOK) v$nodeVersion"
        Write-Success "$($MSG.NodeOK) v$nodeVersion"
    } else {
        $status += "❌ $($MSG.NodeError)"
        Write-ErrorMsg $MSG.NodeError
        $allOk = $false
    }
    
    # Check npm
    try {
        $npmVersion = & npm -v 2>$null
        if ($npmVersion) {
            $status += "✅ $($MSG.NpmOK) v$npmVersion"
            Write-Success "$($MSG.NpmOK) v$npmVersion"
        } else {
            $status += "❌ $($MSG.NpmError)"
            Write-ErrorMsg $MSG.NpmError
            $allOk = $false
        }
    } catch {
        $status += "❌ $($MSG.NpmError)"
        Write-ErrorMsg $MSG.NpmError
        $allOk = $false
    }
    
    # Check Git
    try {
        $gitVersion = & git --version 2>$null
        if ($gitVersion) {
            $gitVer = ($gitVersion -split ' ')[2]
            $status += "✅ $($MSG.GitOK) $gitVer"
            Write-Success "$($MSG.GitOK) $gitVer"
        } else {
            $status += "❌ $($MSG.GitError)"
            Write-ErrorMsg $MSG.GitError
            $allOk = $false
        }
    } catch {
        $status += "❌ $($MSG.GitError)"
        Write-ErrorMsg $MSG.GitError
        $allOk = $false
    }
    
    if ($allOk) {
        Write-Success $MSG.AllDepsOK
    } else {
        Show-MessageBox "error" "$($MSG.InstallDeps)"
    }
    
    return $allOk
}

# ----------------------------------------------------------------------------
# Main installation
# ----------------------------------------------------------------------------
function Install-MIP {
    param([string]$Lang)
    
    Clear-Host
    
    # Show ASCII logo
    Write-Color @"
    ███╗   ███╗██╗██████╗ 
    ████╗ ████║██║██╔══██╗
    ██╔████╔██║██║██████╔╝
    ██║╚██╔╝██║██║██╔═══╝ 
    ██║ ╚═╝ ██║██║██║     
    ╚═╝     ╚═╝╚═╝╚═╝     
"@ "Cyan"
    
    Write-Color "$($MSG.Title) v1.0" "Magenta"
    Write-Color $MSG.Subtitle "Blue"
    Write-Color "https://github.com/kiwinatra/mip" "Yellow"
    Write-Color "`n$($MSG.Welcome)" "White"
    
    # Check dependencies
    if (-not (Check-Dependencies)) {
        Read-Host "`n$($MSG.PressEnter)"
        return
    }
    
    # Clone repository
    Show-Progress $MSG.Cloning $MSG.CloneProgress
    
    if (Test-Path "mip") {
        Remove-Item -Recurse -Force "mip"
    }
    
    try {
        git clone https://github.com/kiwinatra/mip.git --quiet 2>$null
        Show-MessageBox "success" $MSG.CloneOK
    } catch {
        Show-MessageBox "error" $MSG.CloneError
        return
    }
    
    # Install npm dependencies
    Set-Location "mip"
    
    Show-Progress $MSG.Installing $MSG.NpmProgress
    
    try {
        npm install --silent 2>$null
        Show-MessageBox "success" $MSG.NpmInstallOK
    } catch {
        Show-MessageBox "error" $MSG.NpmInstallError
        Set-Location ..
        return
    }
    
    # Install pkg globally if not available
    try {
        $pkgVersion = & pkg --version 2>$null
        if (-not $pkgVersion) {
            Show-Progress $MSG.InstallingPkg $MSG.InstallingPkg
            npm install -g pkg --silent 2>$null
        }
    } catch {
        npm install -g pkg --silent 2>$null
    }
    
    # Build binary
    Show-Progress $MSG.Building $MSG.BuildProgress
    
    New-Item -ItemType Directory -Path "dist" -Force | Out-Null
    
    try {
        npx pkg bin/mip.js --targets node18-win-x64 --output dist/mip.exe 2>&1 | Out-Null
        $binarySize = (Get-Item "dist/mip.exe").Length / 1MB
        $binarySize = "{0:N2} MB" -f $binarySize
        
        Show-MessageBox "success" "$($MSG.BuildOK)`n`n$($MSG.Size) $binarySize"
    } catch {
        Show-MessageBox "error" $MSG.BuildError
        Set-Location ..
        return
    }
    
    # Install to PATH
    $binaryPath = "$(Get-Location)\dist"
    
    Write-Header "`n$($MSG.InstallLocation)"
    Write-Color "  1) $($MSG.InstallUser)" "Cyan"
    Write-Color "  2) $($MSG.InstallSystem) $($MSG.AdminRequired)" "Cyan"
    Write-Color "  0) $($MSG.PathNo)" "Red"
    
    $choice = Read-Host "`n$($MSG.Choose)"
    
    $pathInstalled = $false
    $installScope = "User"
    
    switch ($choice) {
        "1" {
            Show-Progress $MSG.PathInstalling "$($MSG.PathInstalling) ($($MSG.InstallUser))"
            
            try {
                $userBin = "$env:USERPROFILE\.local\bin"
                if (-not (Test-Path $userBin)) {
                    New-Item -ItemType Directory -Path $userBin -Force | Out-Null
                }
                
                Copy-Item "dist\mip.exe" "$userBin\mip.exe" -Force
                
                if (Add-ToPath $userBin "User") {
                    Show-MessageBox "success" "$($MSG.PathOK)`n$userBin"
                    $pathInstalled = $true
                } else {
                    Show-MessageBox "warning" "$($MSG.PathOK) (already in PATH)`n$userBin"
                    $pathInstalled = $true
                }
            } catch {
                Show-MessageBox "error" $MSG.PathError
            }
        }
        "2" {
            if (Test-Admin) {
                Show-Progress $MSG.PathInstalling "$($MSG.PathInstalling) ($($MSG.InstallSystem))"
                
                try {
                    $systemBin = "$env:ProgramFiles\MIP"
                    if (-not (Test-Path $systemBin)) {
                        New-Item -ItemType Directory -Path $systemBin -Force | Out-Null
                    }
                    
                    Copy-Item "dist\mip.exe" "$systemBin\mip.exe" -Force
                    
                    if (Add-ToPath $systemBin "Machine") {
                        Show-MessageBox "success" "$($MSG.PathOK)`n$systemBin"
                        $pathInstalled = $true
                    } else {
                        Show-MessageBox "warning" "$($MSG.PathOK) (already in PATH)`n$systemBin"
                        $pathInstalled = $true
                    }
                } catch {
                    Show-MessageBox "error" $MSG.PathError
                }
            } else {
                Show-MessageBox "error" "$($MSG.PathError)`n$($MSG.AdminRequired)"
            }
        }
        default {
            Show-MessageBox "info" "$($MSG.PathSkip)`n`n$($MSG.PathManual) $binaryPath\mip.exe"
        }
    }
    
    Set-Location ..
    
    # Show completion
    $finalMsg = "$($MSG.Complete)`n`n"
    $finalMsg += "$($MSG.Usage)`n"
    $finalMsg += "  mip --help  - $($MSG.CmdHelp)`n"
    $finalMsg += "  mip init    - $($MSG.CmdInit)`n"
    $finalMsg += "  mip install <pkg>  - $($MSG.CmdInstall)`n`n"
    
    if (-not $pathInstalled) {
        $finalMsg += "$($MSG.PathManual) $binaryPath\mip.exe`n"
        $finalMsg += "$($MSG.UseBinary) $binaryPath\mip.exe --help`n`n"
    }
    
    $finalMsg += $MSG.Thanks
    
    Show-MessageBox "success" $finalMsg
}

# ----------------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------------
function Main {
    Clear-Host
    
    # Show ASCII logo
    Write-Color @"
    ███╗   ███╗██╗██████╗ 
    ████╗ ████║██║██╔══██╗
    ██╔████╔██║██║██████╔╝
    ██║╚██╔╝██║██║██╔═══╝ 
    ██║ ╚═╝ ██║██║██║     
    ╚═╝     ╚═╝╚═╝╚═╝     
"@ "Cyan"
    
    Write-Color "$($MSG.Title) v1.0" "Magenta"
    Write-Color $MSG.Subtitle "Blue"
    Write-Color "https://github.com/kiwinatra/mip" "Yellow"
    
    # Language selection
    Write-Header "`n$($MSG.LangPrompt)"
    Write-Color "  1) $($MSG.LangEN)" "Cyan"
    Write-Color "  2) $($MSG.LangRU)" "Cyan"
    
    $langChoice = Read-Host "`n$($MSG.Choose)"
    
    switch ($langChoice) {
        "2" { Load-Language "RU" }
        default { Load-Language "EN" }
    }
    
    Clear-Host
    
    # Ask for installation
    if (Show-YesNo "`n$($MSG.Welcome)`n`n$($MSG.InstallAsk)") {
        Install-MIP $langChoice
    } else {
        Show-MessageBox "info" $MSG.Thanks
    }
    
    Read-Host "`n$($MSG.PressEnter)"
    Clear-Host
}

# ----------------------------------------------------------------------------
# Entry point
# ----------------------------------------------------------------------------
Load-Language "EN"
Main