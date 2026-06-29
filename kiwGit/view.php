<?php
// ============================================================
// kiwiGit - view.php (GitHub Dark Theme)
// ============================================================

error_reporting(E_ALL);
ini_set('display_errors', 0);

require_once __DIR__ . '/config.php';

$repoName = $_GET['repo'] ?? '';
$subPath = $_GET['path'] ?? '';

if (!$repoName) {
    header('Location: index.php');
    exit;
}

$repoPath = REPO_PATH . '/' . $repoName;
if (!file_exists($repoPath) || !is_dir($repoPath)) {
    header('Location: index.php');
    exit;
}

$gkitPath = $repoPath . '/.gkit';

// ============================================================
// ФУНКЦИИ
// ============================================================

function getCommits($repoPath) {
    $logFile = $repoPath . '/.gkit/logs/commits.log';
    if (!file_exists($logFile)) return [];
    $lines = file($logFile);
    $commits = [];
    foreach ($lines as $line) {
        $data = json_decode($line, true);
        if ($data) {
            $commits[] = $data;
        }
    }
    return array_reverse($commits);
}

function getBranches($repoPath) {
    $branches = [];
    $headsDir = $repoPath . '/.gkit/refs/heads';
    if (!is_dir($headsDir)) return ['main'];
    $files = scandir($headsDir);
    foreach ($files as $file) {
        if ($file === '.' || $file === '..') continue;
        $branches[] = $file;
    }
    return $branches ?: ['main'];
}

function getCurrentBranch($repoPath) {
    $headFile = $repoPath . '/.gkit/HEAD';
    if (!file_exists($headFile)) return 'main';
    $content = trim(file_get_contents($headFile));
    if (strpos($content, 'ref:') === 0) {
        $parts = explode('/', $content);
        return end($parts);
    }
    return $content;
}

function getDirectoryContents($path) {
    $items = [];
    if (!is_dir($path)) return $items;

    $files = scandir($path);
    foreach ($files as $file) {
        if ($file === '.' || $file === '..' || $file === '.gkit') continue;
        $full = $path . '/' . $file;
        $items[] = [
            'name' => $file,
            'isDir' => is_dir($full),
            'size' => is_file($full) ? filesize($full) : 0,
            'modified' => date('c', filemtime($full)),
        ];
    }

    usort($items, function($a, $b) {
        if ($a['isDir'] && !$b['isDir']) return -1;
        if (!$a['isDir'] && $b['isDir']) return 1;
        return strcasecmp($a['name'], $b['name']);
    });

    return $items;
}

function formatSize($bytes) {
    if ($bytes >= 1073741824) return number_format($bytes / 1073741824, 2) . ' GB';
    if ($bytes >= 1048576) return number_format($bytes / 1048576, 2) . ' MB';
    if ($bytes >= 1024) return number_format($bytes / 1024, 1) . ' KB';
    return $bytes . ' B';
}

function getFileIcon($name) {
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    $icons = [
        'js' => '📜', 'ts' => '📜', 'jsx' => '⚛️', 'tsx' => '⚛️',
        'json' => '📋', 'html' => '🌐', 'css' => '🎨', 'scss' => '🎨',
        'php' => '🐘', 'py' => '🐍', 'go' => '🐹', 'rs' => '🦀',
        'java' => '☕', 'c' => '⚙️', 'cpp' => '⚙️', 'h' => '⚙️',
        'sh' => '📟', 'bash' => '📟', 'md' => '📝', 'txt' => '📄',
        'log' => '📄', 'csv' => '📊', 'xml' => '📋', 'yml' => '📋',
        'yaml' => '📋', 'jpg' => '🖼️', 'jpeg' => '🖼️', 'png' => '🖼️',
        'gif' => '🖼️', 'svg' => '🖼️', 'mp4' => '🎬', 'mkv' => '🎬',
        'mp3' => '🎵', 'wav' => '🎵', 'zip' => '📦', 'rar' => '📦',
        'tar' => '📦', 'gz' => '📦', 'pdf' => '📕', 'doc' => '📘',
        'docx' => '📘', 'xls' => '📗', 'xlsx' => '📗', 'ppt' => '📙'
    ];
    return $icons[$ext] ?? '📄';
}

function getLanguage($filename) {
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    $langs = [
        'js' => 'JavaScript', 'ts' => 'TypeScript', 'jsx' => 'JavaScript', 'tsx' => 'TypeScript',
        'json' => 'JSON', 'html' => 'HTML', 'css' => 'CSS', 'scss' => 'SCSS',
        'php' => 'PHP', 'py' => 'Python', 'go' => 'Go', 'rs' => 'Rust',
        'java' => 'Java', 'c' => 'C', 'cpp' => 'C++', 'h' => 'C++',
        'sh' => 'Shell', 'bash' => 'Shell', 'md' => 'Markdown', 'txt' => 'Text',
        'log' => 'Text', 'csv' => 'CSV', 'xml' => 'XML', 'yml' => 'YAML',
        'yaml' => 'YAML', 'sql' => 'SQL', 'env' => 'Dotenv'
    ];
    return $langs[$ext] ?? 'Unknown';
}

function getFileContent($path) {
    $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    $textExts = ['txt', 'md', 'json', 'xml', 'yml', 'yaml', 'sh', 'bash', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss', 'php', 'py', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'log', 'csv', 'sql', 'env'];
    if (!in_array($ext, $textExts)) {
        return null;
    }
    return htmlspecialchars(file_get_contents($path));
}

function isTextFile($path) {
    $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    $textExts = ['txt', 'md', 'json', 'xml', 'yml', 'yaml', 'sh', 'bash', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss', 'php', 'py', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'log', 'csv', 'sql', 'env'];
    return in_array($ext, $textExts);
}

// ============================================================
// ПОЛУЧАЕМ ДАННЫЕ
// ============================================================

$commits = getCommits($repoPath);
$branches = getBranches($repoPath);
$currentBranch = getCurrentBranch($repoPath);
$fullPath = $repoPath . ($subPath ? '/' . $subPath : '');
$items = getDirectoryContents($fullPath);
$fileCount = 0;
foreach ($items as $item) {
    if (!$item['isDir']) $fileCount++;
}

$readmePath = $repoPath . '/README.md';
$readmeContent = file_exists($readmePath) ? file_get_contents($readmePath) : null;

$description = file_exists($gkitPath . '/description') ? trim(file_get_contents($gkitPath . '/description')) : '';
$isPrivate = file_exists($gkitPath . '/private');

$viewFile = $_GET['file'] ?? '';
$fileContent = null;
$fileInfo = null;
$isText = false;
if ($viewFile) {
    $filePath = $repoPath . '/' . $viewFile;
    if (file_exists($filePath) && is_file($filePath)) {
        $isText = isTextFile($filePath);
        if ($isText) {
            $fileContent = getFileContent($filePath);
        }
        $fileInfo = [
            'name' => basename($filePath),
            'size' => filesize($filePath),
            'modified' => date('c', filemtime($filePath)),
            'lang' => getLanguage($filePath)
        ];
    }
}

// ============================================================
// HTML
// ============================================================

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($repoName) ?> · kiwiGit</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🥝</text></svg>">

    <style>
        /* ============================================================
           GITHUB DARK THEME — точная копия
           ============================================================ */

        * { margin: 0; padding: 0; box-sizing: border-box; }

        :root {
            --bg-primary: #0d1117;
            --bg-secondary: #161b22;
            --bg-tertiary: #1c2333;
            --bg-hover: #1f242f;
            --border-color: #30363d;
            --text-primary: #e6edf3;
            --text-secondary: #8b949e;
            --text-muted: #484f58;
            --accent: #58a6ff;
            --accent-hover: #79c0ff;
            --green: #238636;
            --green-hover: #2ea043;
            --red: #da3633;
            --red-hover: #f85149;
            --orange: #d29922;
            --shadow: 0 8px 32px rgba(0,0,0,0.4);
            --radius: 6px;
            --transition: 0.15s ease;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.5;
            min-height: 100vh;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }

        /* ===== HEADER ===== */
        .header {
            background: var(--bg-secondary);
            padding: 16px 0;
            border-bottom: 1px solid var(--border-color);
        }

        .header .container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 12px;
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .header-left .back {
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 20px;
            line-height: 1;
            transition: var(--transition);
        }

        .header-left .back:hover {
            color: var(--text-primary);
        }

        .header-left .repo-name {
            font-size: 18px;
            font-weight: 600;
            color: var(--text-primary);
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .header-left .repo-name:hover {
            color: var(--text-primary);
        }

        .header-left .badge {
            font-size: 11px;
            font-weight: 500;
            padding: 0 7px;
            border-radius: 20px;
            border: 1px solid var(--border-color);
            color: var(--text-secondary);
            background: transparent;
            white-space: nowrap;
        }

        .header-left .badge.private {
            border-color: var(--accent);
            color: var(--accent);
        }

        .header-right {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .header-right a {
            padding: 6px 16px;
            border-radius: var(--radius);
            font-size: 13px;
            font-weight: 500;
            text-decoration: none;
            transition: var(--transition);
            border: 1px solid transparent;
        }

        .header-right .clone-btn {
            background: var(--green);
            color: #fff;
            border-color: var(--green);
        }

        .header-right .clone-btn:hover {
            background: var(--green-hover);
            border-color: var(--green-hover);
        }

        .header-right .copy-btn {
            background: var(--bg-tertiary);
            color: var(--text-primary);
            border-color: var(--border-color);
        }

        .header-right .copy-btn:hover {
            background: var(--bg-hover);
        }

        /* ===== MAIN ===== */
        .main {
            padding: 24px 0 40px;
        }

        /* ===== REPO INFO ===== */
        .repo-info {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius);
            padding: 16px 20px;
            margin-bottom: 20px;
        }

        .repo-info .name {
            font-size: 20px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }

        .repo-info .name .badge {
            font-size: 12px;
            font-weight: 500;
            padding: 0 8px;
            border-radius: 20px;
            border: 1px solid var(--border-color);
            color: var(--text-secondary);
            background: var(--bg-tertiary);
        }

        .repo-info .name .badge.private {
            border-color: var(--border-color);
        }

        .repo-info .description {
            font-size: 15px;
            color: var(--text-secondary);
            margin-top: 4px;
        }

        .repo-info .meta {
            font-size: 13px;
            color: var(--text-secondary);
            margin-top: 8px;
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
        }

        .repo-info .meta span {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        /* ===== TABS ===== */
        .tabs {
            display: flex;
            gap: 0;
            border-bottom: 1px solid var(--border-color);
            margin-bottom: 20px;
            background: var(--bg-secondary);
            border-radius: var(--radius) var(--radius) 0 0;
            padding: 0 16px;
        }

        .tabs a {
            padding: 12px 16px;
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 14px;
            font-weight: 500;
            border-bottom: 2px solid transparent;
            transition: var(--transition);
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        .tabs a:hover {
            color: var(--text-primary);
        }

        .tabs a.active {
            color: var(--text-primary);
            border-bottom-color: var(--orange);
        }

        /* ===== BRANCH INFO ===== */
        .branch-info {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
            font-size: 14px;
            color: var(--text-secondary);
            flex-wrap: wrap;
        }

        .branch-info .branch-name {
            background: var(--bg-tertiary);
            padding: 4px 12px;
            border-radius: 20px;
            color: var(--text-primary);
            border: 1px solid var(--border-color);
            font-family: 'SF Mono', 'Fira Code', monospace;
            font-size: 13px;
        }

        /* ===== BREADCRUMB ===== */
        .breadcrumb {
            padding: 8px 0 12px;
            font-size: 14px;
            color: var(--text-secondary);
        }

        .breadcrumb a {
            color: var(--accent);
            text-decoration: none;
        }

        .breadcrumb a:hover {
            text-decoration: underline;
        }

        .breadcrumb .separator {
            margin: 0 4px;
            color: var(--text-muted);
        }

        /* ===== FILE LIST ===== */
        .file-list {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius);
            overflow: hidden;
        }

        .file-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 16px;
            border-bottom: 1px solid var(--border-color);
            transition: var(--transition);
        }

        .file-item:last-child {
            border-bottom: none;
        }

        .file-item:hover {
            background: var(--bg-hover);
        }

        .file-item .name {
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--accent);
            text-decoration: none;
            font-size: 14px;
            font-weight: 500;
        }

        .file-item .name:hover {
            text-decoration: underline;
        }

        .file-item .name .icon {
            font-size: 18px;
        }

        .file-item .name.folder {
            color: var(--text-primary);
            cursor: pointer;
        }

        .file-item .name.folder:hover {
            color: var(--accent);
        }

        .file-item .meta {
            font-size: 13px;
            color: var(--text-secondary);
            display: flex;
            gap: 16px;
            align-items: center;
        }

        .file-item .meta .lang {
            color: var(--text-secondary);
            font-size: 12px;
        }

        /* ===== FILE VIEWER ===== */
        .file-viewer {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius);
            overflow: hidden;
        }

        .file-viewer .header {
            background: var(--bg-tertiary);
            padding: 12px 16px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
            font-weight: 500;
            color: var(--text-primary);
        }

        .file-viewer .header .file-info {
            color: var(--text-secondary);
            font-weight: 400;
            font-size: 13px;
        }

        .file-viewer .header .file-info a {
            color: var(--accent);
            text-decoration: none;
            margin-left: 12px;
        }

        .file-viewer .header .file-info a:hover {
            text-decoration: underline;
        }

        .file-viewer .body {
            padding: 16px;
            overflow: auto;
            max-height: 600px;
            background: var(--bg-primary);
        }

        .file-viewer .body pre {
            margin: 0;
            font-family: 'SF Mono', 'Fira Code', monospace;
            font-size: 13px;
            line-height: 1.6;
            color: var(--text-primary);
            white-space: pre-wrap;
            word-break: break-word;
        }

        .file-viewer .body .binary {
            text-align: center;
            padding: 40px 20px;
            color: var(--text-secondary);
        }

        .file-viewer .body .binary .icon {
            font-size: 48px;
            display: block;
            margin-bottom: 8px;
        }

        .back-link {
            margin-top: 12px;
            display: inline-block;
            color: var(--accent);
            text-decoration: none;
        }

        .back-link:hover {
            text-decoration: underline;
        }

        /* ===== EMPTY STATE ===== */
        .empty-state {
            padding: 40px 20px;
            text-align: center;
            color: var(--text-secondary);
        }

        .empty-state .icon {
            font-size: 40px;
            display: block;
            margin-bottom: 8px;
            opacity: 0.5;
        }

        /* ===== COMMITS ===== */
        .commits-section {
            margin-top: 20px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius);
            overflow: hidden;
        }

        .commits-section .header {
            padding: 12px 16px;
            border-bottom: 1px solid var(--border-color);
            font-weight: 600;
            font-size: 14px;
            color: var(--text-primary);
            background: var(--bg-tertiary);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .commit-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 16px;
            border-bottom: 1px solid var(--border-color);
            flex-wrap: wrap;
            gap: 6px;
        }

        .commit-item:last-child {
            border-bottom: none;
        }

        .commit-item:hover {
            background: var(--bg-hover);
        }

        .commit-item .hash {
            font-family: 'SF Mono', 'Fira Code', monospace;
            color: var(--accent);
            font-size: 13px;
            font-weight: 500;
        }

        .commit-item .msg {
            flex: 1;
            min-width: 120px;
            color: var(--text-primary);
        }

        .commit-item .author {
            color: var(--text-secondary);
            font-size: 13px;
        }

        .commit-item .date {
            color: var(--text-secondary);
            font-size: 12px;
            white-space: nowrap;
        }

        /* ===== README ===== */
        .readme-section {
            margin-top: 20px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius);
            overflow: hidden;
        }

        .readme-section .header {
            padding: 12px 16px;
            border-bottom: 1px solid var(--border-color);
            font-weight: 600;
            font-size: 14px;
            color: var(--text-primary);
            background: var(--bg-tertiary);
        }

        .readme-section .body {
            padding: 24px 28px;
            font-size: 15px;
            line-height: 1.8;
            color: var(--text-primary);
            overflow: auto;
        }

        .readme-section .body h1,
        .readme-section .body h2,
        .readme-section .body h3 {
            margin: 20px 0 10px 0;
            font-weight: 600;
        }

        .readme-section .body h1:first-child,
        .readme-section .body h2:first-child,
        .readme-section .body h3:first-child {
            margin-top: 0;
        }

        .readme-section .body code {
            background: var(--bg-tertiary);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 85%;
            font-family: 'SF Mono', 'Fira Code', monospace;
            color: var(--text-primary);
        }

        .readme-section .body pre {
            background: var(--bg-primary);
            padding: 14px;
            border-radius: var(--radius);
            overflow: auto;
            border: 1px solid var(--border-color);
            margin: 12px 0;
        }

        .readme-section .body pre code {
            background: none;
            padding: 0;
            border: none;
        }

        /* ===== FOOTER ===== */
        .footer {
            margin-top: 40px;
            padding-top: 16px;
            border-top: 1px solid var(--border-color);
            font-size: 13px;
            color: var(--text-secondary);
            text-align: center;
        }

        .footer a {
            color: var(--accent);
            text-decoration: none;
        }

        .footer a:hover {
            text-decoration: underline;
        }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 768px) {
            .header .container {
                flex-wrap: wrap;
            }
            .header-right {
                width: 100%;
            }
            .header-right a {
                flex: 1;
                text-align: center;
            }
            .repo-info .name {
                font-size: 18px;
            }
            .commit-item {
                flex-direction: column;
                align-items: flex-start;
                gap: 4px;
            }
            .file-item {
                flex-direction: column;
                align-items: flex-start;
                gap: 4px;
            }
            .readme-section .body {
                padding: 16px;
            }
            .tabs {
                overflow-x: auto;
                padding: 0 8px;
                flex-wrap: nowrap;
            }
            .tabs a {
                padding: 10px 12px;
                font-size: 13px;
                white-space: nowrap;
            }
            .file-viewer .body {
                padding: 12px;
                font-size: 12px;
            }
            .file-viewer .header {
                flex-wrap: wrap;
                gap: 8px;
            }
        }

        @media (max-width: 480px) {
            .container {
                padding: 0 12px;
            }
            .repo-info .meta {
                font-size: 12px;
                gap: 12px;
            }
        }
    </style>
</head>
<body>

    <!-- ===== HEADER ===== -->
    <header class="header">
        <div class="container">
            <div class="header-left">
                <a href="index.php" class="back" title="Back to repositories">←</a>
                <a href="view.php?repo=<?= urlencode($repoName) ?>" class="repo-name">
                    🥝 <?= htmlspecialchars($repoName) ?>
                    <span class="badge <?= $isPrivate ? 'private' : '' ?>">
                        <?= $isPrivate ? '🔒 Private' : 'Public' ?>
                    </span>
                </a>
            </div>
            <div class="header-right">
                <a href="#" class="clone-btn" onclick="showClone('<?= htmlspecialchars($repoName) ?>')">📋 Clone</a>
                <a href="#" class="copy-btn" onclick="copyCloneCommand('<?= htmlspecialchars($repoName) ?>')">📝 Copy</a>
            </div>
        </div>
    </header>

    <!-- ===== MAIN ===== -->
    <div class="main">
        <div class="container">

            <!-- ===== REPO INFO ===== -->
            <div class="repo-info">
                <div class="name">
                    <?= htmlspecialchars($repoName) ?>
                    <span class="badge <?= $isPrivate ? 'private' : '' ?>">
                        <?= $isPrivate ? '🔒 Private' : 'Public' ?>
                    </span>
                </div>
                <?php if ($description): ?>
                    <div class="description"><?= htmlspecialchars($description) ?></div>
                <?php endif; ?>
                <div class="meta">
                    <span>📝 <?= count($commits) ?> commits</span>
                    <span>🌿 <?= count($branches) ?> branches</span>
                    <span>📁 <?= $fileCount ?> files</span>
                </div>
            </div>

            <!-- ===== BRANCH INFO ===== -->
            <div class="branch-info">
                <span>🌿 Branch:</span>
                <span class="branch-name"><?= htmlspecialchars($currentBranch) ?></span>
            </div>

            <!-- ===== TABS ===== -->
            <div class="tabs">
                <a href="view.php?repo=<?= urlencode($repoName) ?><?= $subPath ? '&path=' . urlencode($subPath) : '' ?>" class="<?= !$viewFile ? 'active' : '' ?>">📄 Code</a>
                <a href="#commits" onclick="document.getElementById('commits').scrollIntoView({behavior:'smooth'}); return false;">📝 Commits</a>
            </div>

            <?php if ($viewFile): ?>
                <!-- ===== ПРОСМОТР ФАЙЛА ===== -->
                <?php if ($fileInfo): ?>
                    <div class="file-viewer">
                        <div class="header">
                            <span><?= getFileIcon($viewFile) ?> <?= htmlspecialchars($fileInfo['name']) ?></span>
                            <span class="file-info">
                                <?= $fileInfo['lang'] ?> · <?= formatSize($fileInfo['size']) ?>
                                <?php if ($isText): ?>
                                    <a href="api.php?action=download&repo=<?= urlencode($repoName) ?>&path=<?= urlencode($viewFile) ?>">⬇ Download</a>
                                <?php else: ?>
                                    <a href="api.php?action=download&repo=<?= urlencode($repoName) ?>&path=<?= urlencode($viewFile) ?>" style="font-weight:600;">⬇ Download</a>
                                <?php endif; ?>
                            </span>
                        </div>
                        <div class="body">
                            <?php if ($isText && $fileContent !== null): ?>
                                <pre><?= $fileContent ?></pre>
                            <?php else: ?>
                                <div class="binary">
                                    <span class="icon">📄</span>
                                    <p>This is a binary file.</p>
                                    <p style="font-size:13px;margin-top:8px;">
                                        <a href="api.php?action=download&repo=<?= urlencode($repoName) ?>&path=<?= urlencode($viewFile) ?>" style="color:var(--accent);">Download it</a> to view locally.
                                    </p>
                                </div>
                            <?php endif; ?>
                        </div>
                    </div>
                    <a href="view.php?repo=<?= urlencode($repoName) ?><?= $subPath ? '&path=' . urlencode($subPath) : '' ?>" class="back-link">← Back to files</a>
                <?php else: ?>
                    <div class="empty-state">
                        <span class="icon">❌</span>
                        File not found
                    </div>
                <?php endif; ?>
            <?php else: ?>
                <!-- ===== СПИСОК ФАЙЛОВ ===== -->

                <!-- ===== BREADCRUMB ===== -->
                <div class="breadcrumb">
                    <a href="view.php?repo=<?= urlencode($repoName) ?>">📂 <?= htmlspecialchars($repoName) ?></a>
                    <?php
                    $parts = explode('/', trim($subPath, '/'));
                    $current = '';
                    foreach ($parts as $part) {
                        if (empty($part)) continue;
                        $current .= ($current ? '/' : '') . $part;
                        echo ' <span class="separator">/</span> ';
                        echo '<a href="view.php?repo=' . urlencode($repoName) . '&path=' . urlencode($current) . '">' . htmlspecialchars($part) . '</a>';
                    }
                    ?>
                </div>

                <!-- ===== FILES ===== -->
                <div class="file-list">
                    <?php if (empty($items)): ?>
                        <div class="empty-state">
                            <span class="icon">📭</span>
                            This folder is empty
                        </div>
                    <?php else: ?>
                        <?php foreach ($items as $item): ?>
                            <div class="file-item">
                                <?php if ($item['isDir']): ?>
                                    <a href="view.php?repo=<?= urlencode($repoName) ?>&path=<?= urlencode($subPath ? $subPath . '/' . $item['name'] : $item['name']) ?>" class="name folder">
                                        <span class="icon">📁</span> <?= htmlspecialchars($item['name']) ?>
                                    </a>
                                <?php else: ?>
                                    <a href="view.php?repo=<?= urlencode($repoName) ?>&file=<?= urlencode($subPath ? $subPath . '/' . $item['name'] : $item['name']) ?>" class="name">
                                        <span class="icon"><?= getFileIcon($item['name']) ?></span> <?= htmlspecialchars($item['name']) ?>
                                    </a>
                                <?php endif; ?>
                                <div class="meta">
                                    <?php if (!$item['isDir']): ?>
                                        <span class="lang"><?= getLanguage($item['name']) ?></span>
                                        <span><?= formatSize($item['size']) ?></span>
                                        <span><?= date('d M Y', strtotime($item['modified'])) ?></span>
                                    <?php endif; ?>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>

                <!-- ===== README (только в корне) ===== -->
                <?php if (!$subPath && $readmeContent): ?>
                    <div class="readme-section">
                        <div class="header">📖 README.md</div>
                        <div class="body"><?= nl2br(htmlspecialchars($readmeContent)) ?></div>
                    </div>
                <?php endif; ?>
            <?php endif; ?>

            <!-- ===== COMMITS ===== -->
            <div id="commits" class="commits-section">
                <div class="header">
                    <span>📝 Commits</span>
                    <span style="font-weight:400;font-size:13px;color:var(--text-secondary);"><?= count($commits) ?> commits</span>
                </div>
                <?php if (empty($commits)): ?>
                    <div class="empty-state" style="padding:20px;">
                        <span class="icon">📭</span>
                        No commits yet.
                    </div>
                <?php else: ?>
                    <?php $shown = array_slice($commits, 0, 20); ?>
                    <?php foreach ($shown as $commit): ?>
                        <div class="commit-item">
                            <span class="hash"><?= htmlspecialchars($commit['hash'] ?? '0000000') ?></span>
                            <span class="msg"><?= htmlspecialchars($commit['message'] ?? 'No message') ?></span>
                            <span class="author"><?= htmlspecialchars($commit['author'] ?? 'kiwiGit') ?></span>
                            <span class="date"><?= htmlspecialchars($commit['date'] ?? '') ?></span>
                        </div>
                    <?php endforeach; ?>
                    <?php if (count($commits) > 20): ?>
                        <div style="padding:10px 16px;text-align:center;color:var(--text-secondary);font-size:13px;border-top:1px solid var(--border-color);">
                            … and <?= count($commits) - 20 ?> more commits
                        </div>
                    <?php endif; ?>
                <?php endif; ?>
            </div>

            <!-- ===== FOOTER ===== -->
            <div class="footer">
                🥝 kiwiGit &middot; <a href="index.php">← Back to repositories</a>
            </div>

        </div>
    </div>

    <script>
        function showClone(repoName) {
            const url = 'https://strg.kiwinatra.space/api.php?action=clone&repo=' + encodeURIComponent(repoName);
            const cmd = 'kiwigit clone ' + repoName;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(cmd + '\n# ' + url).then(() => {
                    alert('Clone command copied!\n\n' + cmd + '\n\nURL: ' + url);
                }).catch(() => {
                    alert('Clone command:\n' + cmd + '\n\nURL: ' + url);
                });
            } else {
                alert('Clone command:\n' + cmd + '\n\nURL: ' + url);
            }
        }

        function copyCloneCommand(repoName) {
            const cmd = 'kiwigit clone ' + repoName;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(cmd).then(() => {
                    alert('📋 Command copied: ' + cmd);
                }).catch(() => {
                    prompt('📋 Copy this command:', cmd);
                });
            } else {
                prompt('📋 Copy this command:', cmd);
            }
        }
    </script>

</body>
</html>