<?php
// ============================================================
// kiwiGit - api.php (с поддержкой папок)
// ============================================================

error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ============================================================
// КОНФИГУРАЦИЯ
// ============================================================

define('REPO_PATH', __DIR__ . '/repos');
define('TMP_PATH', __DIR__ . '/tmp');
define('API_SECRET', 'kiwi-git-secret-2026');
define('ALLOW_INSECURE', true);

if (!is_dir(REPO_PATH)) mkdir(REPO_PATH, 0755, true);
if (!is_dir(TMP_PATH)) mkdir(TMP_PATH, 0755, true);

// ============================================================
// ПРОВЕРКА АВТОРИЗАЦИИ
// ============================================================

function checkAuth() {
    $headers = getallheaders();
    $key = $headers['X-API-Key'] ?? $_GET['key'] ?? '';
    
    if ($key !== API_SECRET && !ALLOW_INSECURE) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }
    return true;
}

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

function getRepoPath($name) {
    $name = str_replace(['/', '\\', '..'], '', $name);
    $path = REPO_PATH . '/' . $name;
    if (!is_dir($path)) return null;
    if (!is_dir($path . '/.gkit')) return null;
    return $path;
}

function addCommit($repoPath, $message, $author = 'kiwiGit') {
    $logFile = $repoPath . '/.gkit/logs/commits.log';
    if (!is_dir(dirname($logFile))) mkdir(dirname($logFile), 0755, true);
    
    $hash = substr(md5(uniqid() . microtime()), 0, 7);
    $commit = [
        'hash' => $hash,
        'author' => $author,
        'date' => date('c'),
        'message' => $message
    ];
    file_put_contents($logFile, json_encode($commit) . "\n", FILE_APPEND);
    
    $headFile = $repoPath . '/.gkit/HEAD';
    if (!file_exists($headFile)) {
        file_put_contents($headFile, 'ref: refs/heads/main');
    }
    
    $refFile = $repoPath . '/.gkit/refs/heads/main';
    if (!is_dir(dirname($refFile))) mkdir(dirname($refFile), 0755, true);
    file_put_contents($refFile, $hash);
    
    return $commit;
}

// ============================================================
// ОБРАБОТЧИК
// ============================================================

$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        
        // ============================================================
        // INFO
        // ============================================================
        case 'info':
            $name = $_GET['repo'] ?? $_GET['name'] ?? '';
            $name = str_replace(['/', '\\', '..'], '', $name);
            $path = REPO_PATH . '/' . $name;
            
            if (!is_dir($path) || !is_dir($path . '/.gkit')) {
                http_response_code(404);
                echo json_encode(['error' => 'Repository not found']);
                break;
            }
            
            echo json_encode([
                'success' => true,
                'name' => $name,
                'path' => $path,
                'exists' => true
            ]);
            break;
        
        // ============================================================
        // CREATE
        // ============================================================
        case 'create':
            checkAuth();
            
            $input = json_decode(file_get_contents('php://input'), true);
            $name = $input['name'] ?? $_POST['name'] ?? $_GET['name'] ?? '';
            $name = trim($name);
            $name = preg_replace('/[^a-zA-Z0-9_\-\.]/', '', $name);
            
            if (empty($name)) {
                http_response_code(400);
                echo json_encode(['error' => 'Repository name is required']);
                break;
            }
            
            $path = REPO_PATH . '/' . $name;
            if (is_dir($path)) {
                http_response_code(400);
                echo json_encode(['error' => 'Repository already exists']);
                break;
            }
            
            mkdir($path, 0755, true);
            mkdir($path . '/.gkit', 0755);
            mkdir($path . '/.gkit/objects', 0755);
            mkdir($path . '/.gkit/refs/heads', 0755, true);
            mkdir($path . '/.gkit/logs', 0755);
            
            file_put_contents($path . '/.gkit/HEAD', 'ref: refs/heads/main');
            file_put_contents($path . '/.gkit/refs/heads/main', '');
            
            $logFile = $path . '/.gkit/logs/commits.log';
            file_put_contents($logFile, json_encode([
                'hash' => '0000000',
                'author' => 'kiwiGit',
                'date' => date('c'),
                'message' => 'Initial commit'
            ]) . "\n", FILE_APPEND);
            
            file_put_contents($path . '/README.md', "# " . $name . "\n\nРепозиторий создан через kiwiGit API");
            
            echo json_encode([
                'success' => true,
                'repository' => $name,
                'path' => $path
            ]);
            break;
        
        // ============================================================
        // PUSH — С ПОДДЕРЖКОЙ ПАПОК
        // ============================================================
        case 'push':
            checkAuth();
            
            $name = $_GET['repo'] ?? $_POST['repo'] ?? '';
            $name = str_replace(['/', '\\', '..'], '', $name);
            $path = REPO_PATH . '/' . $name;
            
            if (!is_dir($path) || !is_dir($path . '/.gkit')) {
                http_response_code(404);
                echo json_encode(['error' => 'Repository not found']);
                break;
            }
            
            if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
                http_response_code(400);
                echo json_encode(['error' => 'No file uploaded']);
                break;
            }
            
            // ===== ПРАВИЛЬНАЯ ОБРАБОТКА PATH С ПАПКАМИ =====
            $targetPath = $_POST['path'] ?? $_FILES['file']['name'];
            // Убираем ведущий слеш
            $targetPath = ltrim($targetPath, '/');
            // Только .. для безопасности, но ОСТАВЛЯЕМ СЛЕШИ!
            $targetPath = str_replace(['..'], '', $targetPath);
            
            $file = $_FILES['file'];
            
            // ПОЛНЫЙ ПУТЬ К ФАЙЛУ
            $destination = $path . '/' . $targetPath;
            $dir = dirname($destination);
            
            // СОЗДАЁМ ВСЕ ПАПКИ РЕКУРСИВНО
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
            
            if (move_uploaded_file($file['tmp_name'], $destination)) {
                $message = $_POST['message'] ?? 'Updated files';
                $author = $_POST['author'] ?? 'kiwiGit';
                $commit = addCommit($path, $message, $author);
                
                echo json_encode([
                    'success' => true,
                    'commit' => $commit,
                    'file' => $file['name'],
                    'path' => $targetPath
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to save file']);
            }
            break;
        
        // ============================================================
        // DOWNLOAD
        // ============================================================
        case 'download':
            $name = $_GET['repo'] ?? '';
            $name = str_replace(['/', '\\', '..'], '', $name);
            $path = REPO_PATH . '/' . $name;
            
            if (!is_dir($path) || !is_dir($path . '/.gkit')) {
                http_response_code(404);
                echo json_encode(['error' => 'Repository not found']);
                break;
            }
            
            $filePath = $_GET['path'] ?? '';
            $filePath = ltrim($filePath, '/');
            $filePath = str_replace(['..'], '', $filePath);
            
            $fullPath = $path . '/' . $filePath;
            
            if (!file_exists($fullPath) || is_dir($fullPath)) {
                http_response_code(404);
                echo json_encode(['error' => 'File not found']);
                break;
            }
            
            header('Content-Type: application/octet-stream');
            header('Content-Disposition: attachment; filename="' . basename($fullPath) . '"');
            header('Content-Length: ' . filesize($fullPath));
            readfile($fullPath);
            break;
        
        // ============================================================
        // LIST
        // ============================================================
        case 'list':
            $repos = [];
            $dirs = scandir(REPO_PATH);
            foreach ($dirs as $dir) {
                if ($dir === '.' || $dir === '..') continue;
                if (is_dir(REPO_PATH . '/' . $dir) && is_dir(REPO_PATH . '/' . $dir . '/.gkit')) {
                    $repos[] = $dir;
                }
            }
            echo json_encode(['success' => true, 'repositories' => $repos]);
            break;
        
            // ============================================================
// PUSHALL — загрузка ZIP-архива с файлами
// ============================================================
case 'pushall':
    checkAuth();
    
    $name = $_GET['repo'] ?? $_POST['repo'] ?? '';
    $name = str_replace(['/', '\\', '..'], '', $name);
    $path = REPO_PATH . '/' . $name;
    
    if (!is_dir($path) || !is_dir($path . '/.gkit')) {
        http_response_code(404);
        echo json_encode(['error' => 'Repository not found']);
        break;
    }
    
    if (!isset($_FILES['files']) || $_FILES['files']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['error' => 'No files uploaded']);
        break;
    }
    
    // Распаковываем ZIP
    $zipPath = $_FILES['files']['tmp_name'];
    $zip = new ZipArchive();
    if ($zip->open($zipPath) !== true) {
        http_response_code(400);
        echo json_encode(['error' => 'Failed to open archive']);
        break;
    }
    
    // Распаковываем в репозиторий
    $zip->extractTo($path);
    $zip->close();
    
    // Добавляем коммит
    $message = $_POST['message'] ?? 'Update files';
    $author = $_POST['author'] ?? 'kiwiGit';
    $commit = addCommit($path, $message, $author);
    
    echo json_encode([
        'success' => true,
        'commit' => $commit,
        'files' => 'extracted from archive'
    ]);
    break;
        // ============================================================
        // DELETE
        // ============================================================
        case 'delete':
            checkAuth();
            $name = $_GET['name'] ?? $_POST['name'] ?? '';
            $name = str_replace(['/', '\\', '..'], '', $name);
            $path = REPO_PATH . '/' . $name;
            
            if (!is_dir($path)) {
                http_response_code(404);
                echo json_encode(['error' => 'Repository not found']);
                break;
            }
            
            function deleteRecursive($dir) {
                if (!is_dir($dir)) return unlink($dir);
                $files = scandir($dir);
                foreach ($files as $file) {
                    if ($file === '.' || $file === '..') continue;
                    deleteRecursive($dir . '/' . $file);
                }
                return rmdir($dir);
            }
            
            deleteRecursive($path);
            echo json_encode(['success' => true, 'message' => "Repository $name deleted"]);
            break;
        
        // ============================================================
        // DEFAULT
        // ============================================================
        default:
            echo json_encode([
                'service' => 'kiwiGit API',
                'version' => '1.0.0',
                'endpoints' => [
                    'create' => 'POST /api.php?action=create (JSON: {"name":"repo"})',
                    'info' => 'GET /api.php?action=info&repo=name',
                    'push' => 'POST /api.php?action=push&repo=name (multipart/form-data)',
                    'download' => 'GET /api.php?action=download&repo=name&path=file/path',
                    'list' => 'GET /api.php?action=list',
                    'delete' => 'POST /api.php?action=delete&name=repo (requires key)',
                ],
                'auth' => 'X-API-Key: kiwi-git-secret-2026'
            ]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}