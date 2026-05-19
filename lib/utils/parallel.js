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

const { Worker, isMainThread, parentPort } = require('worker_threads');

// Параллельная загрузка с ограничением количества потоков
async function parallelMap(items, mapper, concurrency = 5) {
  const results = [];
  const queue = [...items];
  
  async function worker() {
    while (queue.length) {
      const item = queue.shift();
      if (item) {
        results.push(await mapper(item));
      }
    }
  }
  
  await Promise.all(Array(concurrency).fill().map(() => worker()));
  return results;
}

// Быстрая проверка обновлений (параллельно)
async function checkUpdates(packages, getLatestVersion) {
  const chunks = [];
  const chunkSize = 10;
  
  for (let i = 0; i < packages.length; i += chunkSize) {
    chunks.push(packages.slice(i, i + chunkSize));
  }
  
  const results = await Promise.all(
    chunks.map(chunk => Promise.all(
      chunk.map(pkg => getLatestVersion(pkg.name))
    ))
  );
  
  return results.flat();
}

module.exports = { parallelMap, checkUpdates };