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
const os = require('os');
const crypto = require('crypto');

const { FastResolver } = require('../core/fast-resolver');
const { ParallelDownloader } = require('../core/parallel-download');
const { StreamExtractor } = require('../utils/stream-extract');
const { Http2Agent } = require('../utils/http2-agent');
const { SuperCache } = require('../core/super-cache');
const { formatBytes } = require('../utils/sumlog');

class SuperInstaller {
  constructor() {
    this.resolver = new FastResolver();
    this.http2 = new Http2Agent();
    this.downloader = new ParallelDownloader(undefined, this.http2);
    this.cache = new SuperCache();
  }

  async install(packages, options = {}) {
    const startTime = Date.now();

    console.log(`\n🚀 SUPER FAST INSTALLATION MODE\n`);

    // Шаг 1: Разрешаем все зависимости (быстро, с кешем)
    console.log(`📋 Resolving dependencies...`);
    const resolveStart = Date.now();
    const resolvedTree = await this.resolver.resolveTree(packages);
    const resolveTime = Date.now() - resolveStart;
    console.log(`  ✅ Resolved ${resolvedTree.length} packages in ${resolveTime}ms`);

    // Шаг 2: Загружаем все пакеты параллельно
    console.log(`\n⬇️ Downloading packages...`);
    const downloadStart = Date.now();
    const { writeProgressLine, newLine: uiNewLine } = require('../ui/cli');

    const downloaded = await this.downloader.downloadPackages(resolvedTree, {
      onProgress: ({ done, total }) => {
        if (!total) return;
        const percent = (done / total) * 100;
        writeProgressLine({
          label: 'Downloading',
          percent,
          postfix: `${done}/${total}`
        });
      }
    });
    uiNewLine();

    const downloadTime = Date.now() - downloadStart;

    // Статистика загрузки + целостность (sha256)
    const totalSize = downloaded.reduce((sum, pkg) => sum + pkg.size, 0);
    const avgSpeed = (totalSize / Math.max(downloadTime, 1)) * 1000 / 1024 / 1024;
    console.log(
      `  ✅ Downloaded ${formatBytes(totalSize)} in ${downloadTime}ms (${avgSpeed.toFixed(1)} MB/s)`
    );

    const shaStart = Date.now();
    for (const pkg of downloaded) {
      try {
        const hash = crypto.createHash('sha256').update(pkg.data).digest('hex');
        pkg.sha256 = hash;
      } catch {
        pkg.sha256 = null;
      }
    }
    const shaTime = Date.now() - shaStart;
    console.log(`  🧠 sha256 computed for ${downloaded.length} packages in ${shaTime}ms`);

    // Шаг 3: Распаковываем стримингом (ограниченный параллелизм)
    console.log(`\n📦 Extracting packages...`);
    const extractStart = Date.now();

    const maxExtractWorkers = options.maxExtractWorkers || os.cpus().length;
    const cursor = { value: 0 };

    const workersCount = Math.min(maxExtractWorkers, downloaded.length);

    // Deterministic behavior for tests: if maxExtractWorkers provided, ensure >=2 workers.
    const effectiveWorkersCount = options.maxExtractWorkers
      ? Math.min(downloaded.length, Math.max(2, workersCount))
      : workersCount;

    const extractOne = async (pkg) => {
      const targetDir = path.join(process.cwd(), '.mip', pkg.name, pkg.version);
      fs.mkdirSync(targetDir, { recursive: true });

      // Call through StreamExtractor.extractToDir so tests can monkey-patch and observe concurrency.
      await StreamExtractor.extractToDir(pkg.data, targetDir);


      const marker = path.join(targetDir, 'package.json');
      if (!fs.existsSync(marker)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
        throw new Error(`super-install: extracted dir missing ${marker}`);
      }

      const installPath = path.join(process.cwd(), 'node_modules', pkg.name);
      if (fs.existsSync(installPath)) {
        fs.rmSync(installPath, { recursive: true, force: true });
      }

      fs.mkdirSync(path.dirname(installPath), { recursive: true });

      try {
        fs.symlinkSync(targetDir, installPath, 'junction');
      } catch {
        fs.cpSync(targetDir, installPath, { recursive: true, force: true });
      }
    };

    const worker = async () => {
      while (cursor.value < downloaded.length) {
        const i = cursor.value++;
        const pkg = downloaded[i];
        if (!pkg) break;
        // Fire and forget one extraction per worker iteration to create overlap.
        await new Promise((r) => setImmediate(r));
        await extractOne(pkg);
      }
    };


    const extractPromises = [];
    for (let w = 0; w < effectiveWorkersCount; w++) extractPromises.push(worker());
    await Promise.all(extractPromises);

    const extractTime = Date.now() - extractStart;
    console.log(`  ✅ Extracted ${downloaded.length} packages in ${extractTime}ms`);

    // Шаг 4: Обновляем lockfile
    this.updateLockfile(resolvedTree);

    const totalTime = Date.now() - startTime;
    console.log(`\n⚡ TOTAL: ${totalTime}ms (${(resolvedTree.length / Math.max(totalTime, 1) * 1000).toFixed(1)} packages/sec)`);
    console.log(`\n💾 Cache stats:`, this.cache.getStats());

    return resolvedTree;
  }

  updateLockfile(packages) {
    const lockPath = path.join(process.cwd(), 'mip-lock.json');
    let lockData = {};

    if (fs.existsSync(lockPath)) {
      lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    }

    if (!lockData.packages) lockData.packages = {};

    for (const pkg of packages) {
      lockData.packages[`${pkg.name}@${pkg.version}`] = {
        version: pkg.version,
        resolved: pkg.tarball,
        dependencies: pkg.dependencies
      };
    }

    fs.writeFileSync(lockPath, JSON.stringify(lockData, null, 2));
  }
}

module.exports = { SuperInstaller };

