# TODO

## Task: `mip outdated --json`

- [ ] Add `--json` flag support to `lib/commands/outdated.js`
- [ ] When `--json` is provided: output machine-readable JSON with entries `{name,current,latest,outdated}`
- [ ] Preserve current human-readable output when `--json` is not provided
- [ ] Ensure command exits with code `1` if any outdated packages are found
- [ ] Update `bin/mip.js` to pass `--json` to the outdated command
- [ ] Add/extend tests to validate JSON output + exit code behavior
- [ ] Run test suite (`npm test`)
