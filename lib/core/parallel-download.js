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

const os = require('os');

class ParallelDownloader {
  constructor(maxWorkers = os.cpus().length, http2Agent = null) {
    this.maxWorkers = maxWorkers;
    this.http2Agent = http2Agent;
  }

  async downloadPackages(packages, options = {}) {
    const { onProgress } = options;

    const startTime = Date.now();
    const results = [];

    // Группируем пакеты для параллельной загрузки
    const chunks = this.chunkArray(packages, this.maxWorkers);

    console.log(`  🚀 Parallel download with ${this.maxWorkers} workers`);

    // Прогресс по X/Y скачанных пакетов
    const total = packages.length;
    let done = 0;

    // Загружаем чанки параллельно
    const chunkResults = await Promise.all(
      chunks.map(chunk =>
        this.downloadChunk(chunk, {
          onDone: () => {
            done++;
            if (typeof onProgress === 'function') {
              onProgress({ done, total });
            }
          }
        })
      )
    );



    chunkResults.forEach(result => {
      results.push(...result);
    });

    if (typeof onProgress === 'function' && total > 0) {
      // Финальный апдейт до 100%.
      onProgress({ done: total, total });
    }

    const duration = Date.now() - startTime;

    console.log(
      `  ⚡ Downloaded ${packages.length} packages in ${duration}ms (${(packages.length / duration * 1000).toFixed(1)} pkg/sec)`
    );

    return results;
  }

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  async downloadChunk(chunk, options = {}) {
    const { onDone } = options;

    // Для каждого пакета в чанке - параллельно
    const promises = chunk.map(pkg =>
      this.downloadPackage(pkg).then(result => {
        if (typeof onDone === 'function') onDone();
        return result;
      })
    );

    return await Promise.all(promises);
  }



  async downloadPackage(pkg) {
    const startTime = Date.now();

    // Используем HTTP/2 если агент передан
    if (this.http2Agent && this.http2Agent.download) {
      try {
        const res = await this.http2Agent.download(pkg.tarball);
        const duration = Date.now() - startTime;

        return {
          name: pkg.name,
          version: pkg.version,
          data: res.data,
          size: res.data.length,
          time: duration
        };
      } catch (err) {
        // Фолбэк на HTTP/1.1
      }
    }

    // Фолбэк на axios (HTTP/1.1)
    const axios = require('axios');

    try {
      const response = await axios.get(pkg.tarball, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive'
        }
      });

      const duration = Date.now() - startTime;

      return {
        name: pkg.name,
        version: pkg.version,
        data: response.data,
        size: response.data.length,
        time: duration
      };
    } catch (err) {
      throw new Error(`Failed to download ${pkg.name}: ${err.message}`);
    }
  }
}

module.exports = { ParallelDownloader };
