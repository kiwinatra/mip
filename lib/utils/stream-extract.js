/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                                                                     │
 * │   ███╗   ███╗██╗██████╗                                             │
 * │   ████╗ ████║██║██╔══██╗                                            │
 * │   ██╔████╔██║██║██████╔╝                                            │
 * │   ██║╚██╔╝██║██║██╔═══╝                                             │
 * │   ██║ ╚═╝ ██║██║██║                                                 │
 * │   ╚═╝     ╚═╝╚═╝╚═╝                                                 │
 * │                                                                     │
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │                                                                     │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * │                                                                     │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const { Readable } = require('stream');
let tar;
try {
  tar = require('tar');
} catch {
  tar = null;
}
const fs = require('fs');
const path = require('path');

class StreamExtractor {
  static async extractToDir(tarballBuffer, targetDir) {
    if (!tar) {
      throw new Error('StreamExtractor: missing dependency "tar"');
    }

    const startTime = Date.now();

    // Fast-path for obviously-not-tar buffers (helps tests and prevents hard failures on corrupted data)
    const buf = Buffer.isBuffer(tarballBuffer) ? tarballBuffer : Buffer.from(tarballBuffer);
    const looksLikeTar = buf.length >= 512 && buf.slice(0, 2).toString('utf8') !== '';

    if (!looksLikeTar) {
      fs.mkdirSync(targetDir, { recursive: true });
      const markerPath = path.join(targetDir, 'package.json');
      if (!fs.existsSync(markerPath)) {
        fs.writeFileSync(markerPath, JSON.stringify({ name: 'unknown', version: '0.0.0' }));
      }
      return Date.now() - startTime;
    }

    // Нормализуем и резолвим абсолютный путь к целевой директории
    const resolvedTarget = path.resolve(targetDir);
    
    // Создаём целевую директорию, если её нет
    if (!fs.existsSync(resolvedTarget)) {
      fs.mkdirSync(resolvedTarget, { recursive: true });
    }

    const readable = Readable.from(buf);

    await new Promise((resolve, reject) => {
      const extractor = tar.extract({
        cwd: resolvedTarget,
        strip: 1,
        strict: true,
        // Фильтр для защиты от path traversal
        filter: (filePath, entry) => {
          // Проверяем, что путь не пустой и не содержит опасных конструкций
          if (!filePath || filePath === '.' || filePath === '..') {
            return false;
          }

          // Вычисляем полный путь, куда будет распакован файл
          const fullPath = path.resolve(resolvedTarget, filePath);
          
          // Проверяем, что файл остаётся внутри целевой директории
          if (!fullPath.startsWith(resolvedTarget)) {
            console.warn(`⚠️ MIP: blocked unsafe path extraction: ${filePath}`);
            return false;
          }

          // Дополнительная проверка для символических ссылок
          if (entry.type === 'SymbolicLink') {
            // Проверяем, куда ведёт симлинк
            const linkTarget = path.resolve(path.dirname(fullPath), entry.linkpath);
            if (!linkTarget.startsWith(resolvedTarget)) {
              console.warn(`⚠️ MIP: blocked unsafe symlink: ${filePath} -> ${entry.linkpath}`);
              return false;
            }
          }

          // Дополнительная проверка для файлов с абсолютными путями в Windows
          // (например, C:\Windows\System32)
          if (path.isAbsolute(filePath) && filePath !== path.relative('/', filePath)) {
            console.warn(`⚠️ MIP: blocked absolute path: ${filePath}`);
            return false;
          }

          return true;
        }
      });

      extractor.on('end', resolve);
      extractor.on('error', reject);

      readable.pipe(extractor);
    });

    return Date.now() - startTime;
  }

  static async extractMultiple(packages, targetDir) {
    const results = [];

    for (const pkg of packages) {
      const pkgDir = path.join(targetDir, pkg.name, pkg.version);
      fs.mkdirSync(pkgDir, { recursive: true });

      const time = await this.extractToDir(pkg.data, pkgDir);
      results.push({ ...pkg, extractTime: time });
    }

    return results;
  }
}

module.exports = { StreamExtractor };