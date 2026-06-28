<?php
// ============================================================
// kiwiGit - index.php (GitHub Style)
// ============================================================

error_reporting(E_ALL);
ini_set('display_errors', 0);

require_once __DIR__ . '/config.php';

// ============================================================
// ОБРАБОТКА ДЕЙСТВИЙ
// ============================================================

$action = $_POST['action'] ?? $_GET['action'] ?? '';

if ($action === 'create' && isset($_POST['repo_name'])) {
    $repoName = trim($_POST['repo_name']);
    $description = trim($_POST['description'] ?? '');
    $private = isset($_POST['private']) ? true : false;

    if (!preg_match('/^[a-zA-Z0-9_\-\.]+$/', $repoName)) {
        $error = 'Недопустимое имя репозитория. Только буквы, цифры, _, -, .';
    } else {
        $repoPath = REPO_PATH . '/' . $repoName;
        if (file_exists($repoPath)) {
            $error = 'Репозиторий с таким именем уже существует';
        } else {
            mkdir($repoPath, 0755, true);
            mkdir($repoPath . '/.gkit', 0755);
            mkdir($repoPath . '/.gkit/objects', 0755);
            mkdir($repoPath . '/.gkit/refs/heads', 0755, true);
            mkdir($repoPath . '/.gkit/refs/tags', 0755, true);
            mkdir($repoPath . '/.gkit/logs', 0755);
            mkdir($repoPath . '/src', 0755);

            file_put_contents($repoPath . '/.gkit/HEAD', 'ref: refs/heads/main');
            file_put_contents($repoPath . '/.gkit/refs/heads/main', '');

            $readme = "# " . $repoName . "\n\n";
            if ($description) {
                $readme .= $description . "\n\n";
            }
            $readme .= "## Структура\n\n- `src/` — исходный код\n- `.gkit/` — внутренние данные\n\n";
            $readme .= "## Команды\n\n```bash\nkiwigit clone " . $repoName . "\nkiwigit add .\nkiwigit commit -m \"your message\"\nkiwigit push\n```";
            file_put_contents($repoPath . '/README.md', $readme);

            $logFile = $repoPath . '/.gkit/logs/commits.log';
            $initialCommit = [
                'hash' => '0000000',
                'author' => 'kiwiGit',
                'date' => date('c'),
                'message' => 'Initial commit'
            ];
            file_put_contents($logFile, json_encode($initialCommit) . "\n", FILE_APPEND);

            // Сохраняем описание в отдельный файл
            if ($description) {
                file_put_contents($repoPath . '/.gkit/description', $description);
            }
            if ($private) {
                file_put_contents($repoPath . '/.gkit/private', 'true');
            }

            $success = "Репозиторий \"$repoName\" успешно создан!";
        }
    }
}

if ($action === 'delete' && isset($_GET['repo'])) {
    $repoName = $_GET['repo'];
    $repoPath = REPO_PATH . '/' . $repoName;
    if (!file_exists($repoPath)) {
        $error = 'Репозиторий не найден';
    } else {
        function deleteDir($dir) {
            if (!file_exists($dir)) return true;
            if (!is_dir($dir)) return unlink($dir);
            foreach (scandir($dir) as $item) {
                if ($item === '.' || $item === '..') continue;
                deleteDir($dir . '/' . $item);
            }
            return rmdir($dir);
        }
        deleteDir($repoPath);
        $success = "Репозиторий \"$repoName\" удалён";
    }
}

// ============================================================
// ПОЛУЧАЕМ РЕПОЗИТОРИИ
// ============================================================

$repositories = getRepositories();
$reposInfo = [];
foreach ($repositories as $name) {
    $path = REPO_PATH . '/' . $name;
    $description = file_exists($path . '/.gkit/description') ? trim(file_get_contents($path . '/.gkit/description')) : '';
    $isPrivate = file_exists($path . '/.gkit/private');
    $commits = 0;
    $logFile = $path . '/.gkit/logs/commits.log';
    if (file_exists($logFile)) {
        $commits = count(file($logFile)) - 1; // минус initial commit
    }

    $reposInfo[] = [
        'name' => $name,
        'description' => $description,
        'private' => $isPrivate,
        'commits' => $commits,
        'modified' => filemtime($path),
        'created' => filectime($path),
    ];
}
usort($reposInfo, function($a, $b) {
    return $b['modified'] <=> $a['modified'];
});

// Поиск
$search = $_GET['search'] ?? '';
if ($search) {
    $reposInfo = array_filter($reposInfo, function($repo) use ($search) {
        return stripos($repo['name'], $search) !== false || stripos($repo['description'], $search) !== false;
    });
}

$totalRepos = count($reposInfo);

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
    <title>kiwiGit</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🥝</text></svg>">

    <style>
        /* ============================================================
           GITHUB STYLE — полная копия
           ============================================================ */

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
            background: #f6f8fa;
            color: #24292f;
            line-height: 1.5;
        }

        .container {
            max-width: 1100px;
            margin: 0 auto;
            padding: 0 20px;
        }

        /* ===== HEADER ===== */
        .header {
            background: #24292f;
            padding: 16px 0;
            border-bottom: 1px solid #1c2128;
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

        .header-left .logo {
            font-size: 22px;
            font-weight: 600;
            color: #ffffff;
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .header-left .logo:hover {
            color: #f0f6fc;
        }

        .header-left .version {
            color: #8b949e;
            font-size: 12px;
            background: rgba(255,255,255,0.08);
            padding: 0 8px;
            border-radius: 20px;
        }

        .header-right {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .header-right .btn-new {
            padding: 6px 16px;
            background: #238636;
            color: #fff;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            transition: 0.15s;
        }

        .header-right .btn-new:hover {
            background: #2ea043;
        }

        /* ===== MAIN ===== */
        .main {
            padding: 24px 0 40px;
        }

        /* ===== TOOLBAR ===== */
        .toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 12px;
            margin-bottom: 20px;
        }

        .toolbar .search-form {
            flex: 1;
            max-width: 400px;
            min-width: 200px;
        }

        .toolbar .search-form input {
            width: 100%;
            padding: 6px 12px;
            border: 1px solid #d0d7de;
            border-radius: 6px;
            font-size: 14px;
            background: #ffffff;
            color: #24292f;
            outline: none;
            transition: 0.15s;
        }

        .toolbar .search-form input:focus {
            border-color: #0969da;
            box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.2);
        }

        .toolbar .stats {
            font-size: 14px;
            color: #57606a;
            white-space: nowrap;
        }

        /* ===== REPO LIST ===== */
        .repo-list {
            background: #ffffff;
            border: 1px solid #d0d7de;
            border-radius: 6px;
            overflow: hidden;
        }

        .repo-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid #d0d7de;
            transition: 0.1s;
        }

        .repo-item:last-child {
            border-bottom: none;
        }

        .repo-item:hover {
            background: #f6f8fa;
        }

        .repo-item .info {
            flex: 1;
            min-width: 0;
        }

        .repo-item .info .name {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
        }

        .repo-item .info .name a {
            font-size: 18px;
            font-weight: 600;
            color: #0969da;
            text-decoration: none;
        }

        .repo-item .info .name a:hover {
            text-decoration: underline;
        }

        .repo-item .info .name .badge {
            font-size: 11px;
            font-weight: 500;
            padding: 0 7px;
            border-radius: 20px;
            border: 1px solid #d0d7de;
            color: #57606a;
            background: #f6f8fa;
            white-space: nowrap;
        }

        .repo-item .info .name .badge.private {
            border-color: #d0d7de;
            color: #57606a;
        }

        .repo-item .info .description {
            font-size: 14px;
            color: #57606a;
            margin-top: 4px;
            word-break: break-word;
        }

        .repo-item .info .description.empty {
            color: #8b949e;
            font-style: italic;
        }

        .repo-item .info .meta {
            font-size: 12px;
            color: #57606a;
            margin-top: 6px;
            display: flex;
            gap: 16px;
            flex-wrap: wrap;
        }

        .repo-item .info .meta span {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .repo-item .actions {
            display: flex;
            gap: 6px;
            flex-shrink: 0;
            margin-left: 16px;
        }

        .repo-item .actions a {
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            text-decoration: none;
            transition: 0.15s;
            border: 1px solid transparent;
            white-space: nowrap;
        }

        .repo-item .actions .view {
            background: #f6f8fa;
            border-color: #d0d7de;
            color: #24292f;
        }

        .repo-item .actions .view:hover {
            background: #eaeef2;
        }

        .repo-item .actions .clone {
            background: #2ea0431a;
            border-color: #2ea04333;
            color: #116329;
        }

        .repo-item .actions .clone:hover {
            background: #2ea0432a;
        }

        .repo-item .actions .delete {
            background: #cf222e1a;
            border-color: #cf222e33;
            color: #cf222e;
        }

        .repo-item .actions .delete:hover {
            background: #cf222e2a;
        }

        .empty-state {
            padding: 60px 20px;
            text-align: center;
            color: #57606a;
        }

        .empty-state .icon {
            font-size: 48px;
            display: block;
            margin-bottom: 8px;
            opacity: 0.5;
        }

        /* ===== MODAL ===== */
        .modal-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 1000;
            justify-content: center;
            align-items: center;
            animation: fadeIn 0.15s ease;
        }

        .modal-overlay.active {
            display: flex;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .modal {
            background: #ffffff;
            border-radius: 6px;
            padding: 32px;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 8px 30px rgba(0,0,0,0.2);
            animation: slideUp 0.2s ease;
        }

        @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        .modal h3 {
            font-size: 20px;
            font-weight: 600;
            color: #24292f;
            margin-bottom: 4px;
        }

        .modal .subtitle {
            font-size: 14px;
            color: #57606a;
            margin-bottom: 20px;
        }

        .modal .form-group {
            margin-bottom: 16px;
        }

        .modal .form-group label {
            display: block;
            font-size: 14px;
            font-weight: 600;
            color: #24292f;
            margin-bottom: 4px;
        }

        .modal .form-group input[type="text"],
        .modal .form-group textarea {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #d0d7de;
            border-radius: 6px;
            font-size: 14px;
            color: #24292f;
            background: #f6f8fa;
            outline: none;
            transition: 0.15s;
            font-family: inherit;
        }

        .modal .form-group input[type="text"]:focus,
        .modal .form-group textarea:focus {
            border-color: #0969da;
            box-shadow: 0 0 0 3px rgba(9,105,218,0.2);
            background: #ffffff;
        }

        .modal .form-group textarea {
            resize: vertical;
            min-height: 60px;
        }

        .modal .form-group .hint {
            font-size: 12px;
            color: #57606a;
            margin-top: 4px;
        }

        .modal .form-group .checkbox {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
        }

        .modal .form-group .checkbox input[type="checkbox"] {
            width: 16px;
            height: 16px;
            accent-color: #0969da;
        }

        .modal .form-group .checkbox label {
            font-weight: 400;
            margin-bottom: 0;
            cursor: pointer;
        }

        .modal .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            margin-top: 20px;
            padding-top: 16px;
            border-top: 1px solid #d0d7de;
        }

        .modal .modal-actions button {
            padding: 6px 16px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: 0.15s;
            border: 1px solid transparent;
        }

        .modal .modal-actions .cancel {
            background: transparent;
            border-color: #d0d7de;
            color: #24292f;
        }

        .modal .modal-actions .cancel:hover {
            background: #f6f8fa;
        }

        .modal .modal-actions .create {
            background: #238636;
            color: #fff;
            border-color: #238636;
        }

        .modal .modal-actions .create:hover {
            background: #2ea043;
            border-color: #2ea043;
        }

        .modal .modal-actions .create:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        /* ===== ALERT ===== */
        .alert {
            padding: 12px 16px;
            border-radius: 6px;
            margin-bottom: 16px;
            font-size: 14px;
            border: 1px solid transparent;
        }

        .alert.success {
            background: #dafbe1;
            border-color: #7ee787;
            color: #116329;
        }

        .alert.error {
            background: #ffe3e6;
            border-color: #f85149;
            color: #82071e;
        }

        /* ===== FOOTER ===== */
        .footer {
            margin-top: 40px;
            padding-top: 16px;
            border-top: 1px solid #d0d7de;
            font-size: 13px;
            color: #57606a;
            text-align: center;
        }

        .footer a {
            color: #0969da;
            text-decoration: none;
        }

        .footer a:hover {
            text-decoration: underline;
        }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 768px) {
            .header .container { flex-wrap: wrap; }
            .header-right { width: 100%; }
            .header-right .btn-new { width: 100%; justify-content: center; }

            .repo-item {
                flex-direction: column;
                align-items: stretch;
                gap: 10px;
            }

            .repo-item .actions {
                margin-left: 0;
                justify-content: flex-start;
                flex-wrap: wrap;
            }

            .toolbar {
                flex-direction: column;
                align-items: stretch;
            }

            .toolbar .search-form { max-width: 100%; }
            .modal { padding: 24px; }
        }

        @media (max-width: 480px) {
            .container { padding: 0 12px; }
            .repo-item .info .name a { font-size: 16px; }
            .repo-item .info .meta { font-size: 11px; gap: 10px; }
        }
    </style>
</head>
<body>

    <!-- ===== HEADER ===== -->
    <header class="header">
        <div class="container">
            <div class="header-left">
                <a href="index.php" class="logo">
                    🥝 kiwiGit
                    <span class="version">v0.1</span>
                </a>
            </div>
            <div class="header-right">
                <button class="btn-new" onclick="openModal()">➕ New Repository</button>
            </div>
        </div>
    </header>

    <!-- ===== MAIN ===== -->
    <div class="main">
        <div class="container">

            <!-- Alerts -->
            <?php if (isset($success)): ?>
                <div class="alert success">✅ <?= htmlspecialchars($success) ?></div>
            <?php endif; ?>
            <?php if (isset($error)): ?>
                <div class="alert error">❌ <?= htmlspecialchars($error) ?></div>
            <?php endif; ?>

            <!-- Toolbar -->
            <div class="toolbar">
                <form method="GET" class="search-form">
                    <input type="text" name="search" placeholder="Find a repository..." value="<?= htmlspecialchars($search) ?>">
                </form>
                <span class="stats"><?= $totalRepos ?> <?= $totalRepos === 1 ? 'repository' : 'repositories' ?></span>
            </div>

            <!-- Repo List -->
            <div class="repo-list">
                <?php if (empty($reposInfo)): ?>
                    <div class="empty-state">
                        <span class="icon">📭</span>
                        <?php if ($search): ?>
                            No repositories found for "<?= htmlspecialchars($search) ?>"
                        <?php else: ?>
                            No repositories yet. Create your first one!
                        <?php endif; ?>
                    </div>
                <?php else: ?>
                    <?php foreach ($reposInfo as $repo): ?>
                        <div class="repo-item">
                            <div class="info">
                                <div class="name">
                                    <a href="view.php?repo=<?= urlencode($repo['name']) ?>">
                                        <?= htmlspecialchars($repo['name']) ?>
                                    </a>
                                    <?php if ($repo['private']): ?>
                                        <span class="badge private">🔒 Private</span>
                                    <?php else: ?>
                                        <span class="badge">Public</span>
                                    <?php endif; ?>
                                </div>
                                <div class="description <?= $repo['description'] ? '' : 'empty' ?>">
                                    <?= htmlspecialchars($repo['description'] ?: 'No description') ?>
                                </div>
                                <div class="meta">
                                    <span>📝 <?= $repo['commits'] ?> commits</span>
                                    <span>🕐 <?= date('d M Y', $repo['modified']) ?></span>
                                </div>
                            </div>
                            <div class="actions">
                                <a href="view.php?repo=<?= urlencode($repo['name']) ?>" class="view">View</a>
                                <a href="#" class="clone" onclick="showClone('<?= htmlspecialchars($repo['name']) ?>')">Clone</a>
                                <a href="index.php?action=delete&repo=<?= urlencode($repo['name']) ?>" class="delete" onclick="return confirm('Delete «<?= htmlspecialchars($repo['name']) ?>»?')">Delete</a>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>

            <!-- Footer -->
            <div class="footer">
                🥝 kiwiGit &middot; <a href="https://kiwinatra.space" target="_blank">kiwinatra.space</a>
            </div>

        </div>
    </div>

    <!-- ===== MODAL ===== -->
    <div class="modal-overlay" id="createModal">
        <div class="modal">
            <h3>Create a new repository</h3>
            <div class="subtitle">A repository contains all project files, including the revision history.</div>

            <form method="POST" id="createForm">
                <div class="form-group">
                    <label for="repo_name">Repository name</label>
                    <input type="text" id="repo_name" name="repo_name" placeholder="my-project" required autofocus>
                    <div class="hint">Must be unique and contain only letters, numbers, _, -, .</div>
                </div>

                <div class="form-group">
                    <label for="description">Description <span style="font-weight:400;color:#57606a;">(optional)</span></label>
                    <textarea id="description" name="description" placeholder="Short description of your project..."></textarea>
                </div>

                <div class="form-group">
                    <label class="checkbox">
                        <input type="checkbox" name="private">
                        <label>Private</label>
                    </label>
                    <div class="hint">Only you and collaborators will be able to see this repository.</div>
                </div>

                <div class="modal-actions">
                    <button type="button" class="cancel" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="create" name="action" value="create">Create repository</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        // ============================================================
        // MODAL
        // ============================================================

        function openModal() {
            document.getElementById('createModal').classList.add('active');
            document.getElementById('repo_name').focus();
        }

        function closeModal() {
            document.getElementById('createModal').classList.remove('active');
        }

        // Close modal on ESC
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') closeModal();
        });

        // Close modal on overlay click
        document.getElementById('createModal').addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });

        // ============================================================
        // CLONE
        // ============================================================

        function showClone(repoName) {
            const url = 'https://kiwigit.kiwinatra.space/api.php?action=clone&repo=' + encodeURIComponent(repoName);
            if (navigator.clipboard) {
                navigator.clipboard.writeText(url).then(() => {
                    alert('Clone URL copied!\n\n' + url + '\n\nUse:\nkiwigit clone ' + repoName);
                }).catch(() => {
                    alert('Clone URL:\n' + url + '\n\nUse:\nkiwigit clone ' + repoName);
                });
            } else {
                alert('Clone URL:\n' + url + '\n\nUse:\nkiwigit clone ' + repoName);
            }
        }

        // ============================================================
        // SEARCH — auto-submit
        // ============================================================

        const searchInput = document.querySelector('.search-form input');
        if (searchInput) {
            searchInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    this.form.submit();
                }
            });
        }
    </script>

</body>
</html>