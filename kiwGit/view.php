<?php
// ============================================================
// kiwiGit - view.php (GitHub Style)
// ============================================================

error_reporting(E_ALL);
ini_set('display_errors', 0);

require_once __DIR__ . '/config.php';

// ============================================================
// ПОЛУЧАЕМ РЕПОЗИТОРИЙ
// ============================================================

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
$currentPath = $subPath ? '/' . $subPath : '/';
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

// ===== ПРОСМОТР ФАЙЛА =====
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
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif; background: #f6f8fa; color: #24292f; line-height: 1.5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }

        .header { background: #24292f; padding: 16px 0; border-bottom: 1px solid #1c2128; }
        .header .container { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
        .header-left { display: flex; align-items: center; gap: 12px; }
        .header-left .back { color: #8b949e; text-decoration: none; font-size: 20px; }
        .header-left .back:hover { color: #f0f6fc; }
        .header-left .repo-name { font-size: 18px; font-weight: 600; color: #ffffff; text-decoration: none; display: flex; align-items: center; gap: 8px; }
        .header-left .repo-name:hover { color: #f0f6fc; }
        .header-left .badge { font-size: 11px; font-weight: 500; padding: 0 7px; border-radius: 20px; border: 1px solid #8b949e; color: #8b949e; background: transparent; }
        .header-left .badge.private { border-color: #58a6ff; color: #58a6ff; }
        .header-right { display: flex; align-items: center; gap: 8px; }
        .header-right a { padding: 6px 16px; border-radius: 6px; font-size: 13px; font-weight: 500; text-decoration: none; transition: 0.15s; border: 1px solid transparent; }
        .header-right .clone-btn { background: #238636; color: #fff; border-color: #238636; }
        .header-right .clone-btn:hover { background: #2ea043; }
        .header-right .copy-btn { background: #21262d; color: #f0f6fc; border-color: #30363d; }
        .header-right .copy-btn:hover { background: #30363d; }

        .main { padding: 24px 0 40px; }

        .repo-info { background: #ffffff; border: 1px solid #d0d7de; border-radius: 6px; padding: 16px 20px; margin-bottom: 20px; }
        .repo-info .name { font-size: 20px; font-weight: 600; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .repo-info .name .badge { font-size: 12px; font-weight: 500; padding: 0 8px; border-radius: 20px; border: 1px solid #d0d7de; color: #57606a; background: #f6f8fa; }
        .repo-info .name .badge.private { border-color: #d0d7de; }
        .repo-info .description { font-size: 15px; color: #57606a; margin-top: 4px; }
        .repo-info .meta { font-size: 13px; color: #57606a; margin-top: 8px; display: flex; gap: 20px; flex-wrap: wrap; }
        .repo-info .meta span { display: flex; align-items: center; gap: 4px; }

        .tabs { display: flex; gap: 0; border-bottom: 1px solid #d0d7de; margin-bottom: 20px; background: #ffffff; border-radius: 6px 6px 0 0; padding: 0 16px; }
        .tabs a { padding: 12px 16px; color: #57606a; text-decoration: none; font-size: 14px; font-weight: 500; border-bottom: 2px solid transparent; transition: 0.15s; display: inline-flex; align-items: center; gap: 6px; }
        .tabs a:hover { color: #24292f; }
        .tabs a.active { color: #24292f; border-bottom-color: #fd8c73; }

        .branch-info { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; font-size: 14px; color: #57606a; flex-wrap: wrap; }
        .branch-info .branch-name { background: #f6f8fa; padding: 4px 12px; border-radius: 20px; color: #24292f; border: 1px solid #d0d7de; font-family: monospace; font-size: 13px; }

        .breadcrumb { padding: 8px 0 12px; font-size: 14px; color: #57606a; }
        .breadcrumb a { color: #0969da; text-decoration: none; }
        .breadcrumb a:hover { text-decoration: underline; }
        .breadcrumb .separator { margin: 0 4px; color: #8b949e; }

        .file-list { background: #ffffff; border: 1px solid #d0d7de; border-radius: 6px; overflow: hidden; }
        .file-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; border-bottom: 1px solid #d0d7de; transition: 0.1s; }
        .file-item:last-child { border-bottom: none; }
        .file-item:hover { background: #f6f8fa; }
        .file-item .name { display: flex; align-items: center; gap: 8px; color: #0969da; text-decoration: none; font-size: 14px; font-weight: 500; }
        .file-item .name:hover { text-decoration: underline; }
        .file-item .name .icon { font-size: 18px; }
        .file-item .name.folder { color: #24292f; cursor: pointer; }
        .file-item .name.folder:hover { color: #0969da; }
        .file-item .meta { font-size: 13px; color: #57606a; display: flex; gap: 16px; align-items: center; }
        .file-item .meta .lang { color: #57606a; font-size: 12px; }

        .file-viewer { background: #ffffff; border: 1px solid #d0d7de; border-radius: 6px; overflow: hidden; }
        .file-viewer .header { background: #f6f8fa; padding: 12px 16px; border-bottom: 1px solid #d0d7de; display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: 500; }
        .file-viewer .header .file-info { color: #57606a; font-weight: 400; font-size: 13px; }
        .file-viewer .header .file-info a { color: #0969da; text-decoration: none; margin-left: 12px; }
        .file-viewer .header .file-info a:hover { text-decoration: underline; }
        .file-viewer .body { padding: 16px; overflow: auto; max-height: 600px; }
        .file-viewer .body pre { margin: 0; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 13px; line-height: 1.6; color: #24292f; white-space: pre-wrap; word-break: break-word; }
        .file-viewer .body .binary { text-align: center; padding: 40px 20px; color: #57606a; }
        .file-viewer .body .binary .icon { font-size: 48px; display: block; margin-bottom: 8px; }

        .empty-state { padding: 40px 20px; text-align: center; color: #57606a; }
        .empty-state .icon { font-size: 40px; display: block; margin-bottom: 8px; opacity: 0.5; }

        .commits-section { margin-top: 20px; background: #ffffff; border: 1px solid #d0d7de; border-radius: 6px; overflow: hidden; }
        .commits-section .header { padding: 12px 16px; border-bottom: 1px solid #d0d7de; font-weight: 600; font-size: 14px; color: #24292f; background: #f6f8fa; display: flex; justify-content: space-between; align-items: center; }
        .commit-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; border-bottom: 1px solid #d0d7de; flex-wrap: wrap; gap: 6px; }
        .commit-item:last-child { border-bottom: none; }
        .commit-item:hover { background: #f6f8fa; }
        .commit-item .hash { font-family: monospace; color: #0969da; font-size: 13px; font-weight: 500; }
        .commit-item .msg { flex: 1; min-width: 120px; }
        .commit-item .author { color: #57606a; font-size: 13px; }
        .commit-item .date { color: #57606a; font-size: 12px; white-space: nowrap; }

        .readme-section { margin-top: 20px; background: #ffffff; border: 1px solid #d0d7de; border-radius: 6px; overflow: hidden; }
        .readme-section .header { padding: 12px 16px; border-bottom: 1px solid #d0d7de; font-weight: 600; font-size: 14px; color: #24292f; background: #f6f8fa; }
        .readme-section .body { padding: 24px 28px; font-size: 15px; line-height: 1.8; color: #24292f; overflow: auto; }
        .readme-section .body h1, .readme-section .body h2, .readme-section .body h3 { margin: 20px 0 10px 0; font-weight: 600; }
        .readme-section .body h1:first-child, .readme-section .body h2:first-child, .readme-section .body h3:first-child { margin-top: 0; }
        .readme-section .body code { background: #f6f8fa; padding: 2px 6px; border-radius: 4px; font-size: 85%; font-family: 'SF Mono', 'Fira Code', monospace; }
        .readme-section .body pre { background: #f6f8fa; padding: 14px; border-radius: 6px; overflow: auto; border: 1px solid #d0d7de; margin: 12px 0; }
        .readme-section .body pre code { background: none; padding: 0; border: none; }

        .back-link { margin-top: 12px; display: inline-block; color: #0969da; text-decoration: none; }
        .back-link:hover { text-decoration: underline; }

        .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #d0d7de; font-size: 13px; color: #57606a; text-align: center; }
        .footer a { color: #0969da; text-decoration: none; }
        .footer a:hover { text-decoration: underline; }

        @media (max-width: 768px) {
            .header .container { flex-wrap: wrap; }
            .header-right { width: 100%; }
            .header-right a { flex: 1; text-align: center; }
            .repo-info .name { font-size: 18px; }
            .commit-item { flex-direction: column; align-items: flex-start; gap: 4px; }
            .file-item { flex-direction: column; align-items: flex-start; gap: 4px; }
            .readme-section .body { padding: 16px; }
            .tabs { overflow-x: auto; padding: 0 8px; flex-wrap: nowrap; }
            .tabs a { padding: 10px 12px; font-size: 13px; white-space: nowrap; }
            .file-viewer .body { padding: 12px; font-size: 12px; }
            .file-viewer .header { flex-wrap: wrap; gap: 8px; }
        }
    </style>
</head>
<body>

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

    <div class="main">
        <div class="container">

            <!-- Repo Info -->
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

            <!-- Branch Info -->
            <div class="branch-info">
                <span>🌿 Branch:</span>
                <span class="branch-name"><?= htmlspecialchars($currentBranch) ?></span>
            </div>

            <!-- Tabs -->
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
                                        <a href="api.php?action=download&repo=<?= urlencode($repoName) ?>&path=<?= urlencode($viewFile) ?>" style="color:#0969da;">Download it</a> to view locally.
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

                <!-- Breadcrumb -->
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

                <!-- Files -->
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

                <!-- README (только в корне) -->
                <?php if (!$subPath && $readmeContent): ?>
                    <div class="readme-section">
                        <div class="header">📖 README.md</div>
                        <div class="body"><?= nl2br(htmlspecialchars($readmeContent)) ?></div>
                    </div>
                <?php endif; ?>
            <?php endif; ?>

            <!-- Commits -->
            <div id="commits" class="commits-section">
                <div class="header">
                    <span>📝 Commits</span>
                    <span style="font-weight:400;font-size:13px;color:#57606a;"><?= count($commits) ?> commits</span>
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
                        <div style="padding:10px 16px;text-align:center;color:#57606a;font-size:13px;border-top:1px solid #d0d7de;">
                            … and <?= count($commits) - 20 ?> more commits
                        </div>
                    <?php endif; ?>
                <?php endif; ?>
            </div>

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