# TODO — Optimization (mip)

## Step 1 — SuperCache (high priority) ✅
- Replace blocking `fs.readFileSync/writeFileSync` with async `fs.promises.readFile/writeFile`
- Add in-flight dedupe to avoid parallel reads/writes for the same cache key
- Add disk entry metadata (timestamp/ttl) to avoid using stale cache

Target: `lib/core/super-cache.js`

## Step 2 — Downloader (high priority) 🔄
- Teach `ParallelDownloader` to use `Http2Agent.download()` (fallback to axios if needed)
- Keep existing parallel structure; remove redundant axios creation per request if possible

Target: `lib/core/parallel-download.js`, possibly `lib/utils/http2-agent.js`

## Step 3 — Super install extract parallelization
- Parallelize extraction with bounded concurrency (not sequential `for ... await`)
- Ensure symlink/junction creation is correct and race-safe

Target: `lib/commands/super-install.js`, `lib/utils/stream-extract.js`

## Step 4 — Normal install speed
- Remove `execSync(tar ...)` path; use buffer→stream extraction (StreamExtractor)
- When installing many deps (`install` with no packageName), add bounded concurrency

Target: `lib/commands/install.js`, `lib/utils/stream-extract.js`

## Step 5 — Resolver speed
- Reduce sequential recursion in `FastResolver.resolveTree`
- Add `visited` set to avoid repeated resolution work in dependency graphs

Target: `lib/core/fast-resolver.js`

## Step 6 — Validate
- Run smoke tests:
  - `node bin/mip.js --help`
  - `node bin/mip.js init`
  - `node bin/mip.js i <pkg>`
  - `node bin/mip.js i`
- Compare logs: resolve/download/extract/total timings
