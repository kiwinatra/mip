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

const fs = require('fs');
const path = require('path');
const tar = require('tar');

async function extractPackage(tarball, targetDir) {
  // Создаем временный файл
  const tempFile = path.join(targetDir, '..', 'temp.tgz');

  // Сохраняем tarball во временный файл
  fs.writeFileSync(tempFile, tarball);

  // Создаем директорию
  fs.mkdirSync(targetDir, { recursive: true });

  // Распаковываем
  await tar.x({
    file: tempFile,
    cwd: targetDir,
    strip: 1, // Убираем папку package/ внутри
  });

  // Удаляем временный файл
  fs.unlinkSync(tempFile);

  return targetDir;
}

module.exports = { extractPackage };
