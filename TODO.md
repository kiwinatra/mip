# TODO (quality + tests update)

- [ ] Update init tests to match current contract: `mip.yml` + `.mip/` structure (no `mip.json` expectation)
- [ ] Update README expectation: either implement README creation in `mip init` or adjust tests to match current behavior
- [ ] Add new tests for migration: `mip.json/mip-lock.json` -> `mip.yml/mip-lock.yml` (purely local, no network)
- [ ] Add new tests for “init idempotency”: second `init()` should not crash and should not destroy existing `.mip`
- [ ] Fix/adjust output tests to validate current output strings/behavior
- [ ] Fix ESLint error in `lib/ui/cli.js` (`no-control-regex`)
- [ ] Run: `npm test` and `npm run lint` until green

