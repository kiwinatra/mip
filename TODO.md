# TODO

## TS migration for tests (MIP)

- [x] Inspect existing test setup/scripts (package.json, mocha boot)

- [x] Add TypeScript tooling + config (tsconfig.test.json)

- [x] Add npm scripts:

  - [ ] build tests TS -> compiled dir
  - [ ] run mocha on compiled tests
  - [ ] keep existing JS tests as fallback
- [x] Migrate `test/mocha-boot.spec.js` -> `test/mocha-boot.spec.ts`

- [ ] Migrate `test/utils/features.spec.js` -> `test/utils/features.spec.ts`
- [ ] Migrate remaining test specs in batches (commands/core/api/plugins/utils/output)
- [ ] Ensure pathing/imports work in compiled output
- [ ] Run `npm test` and `npm run test:ts` and compare results
- [ ] If stable, optionally remove JS tests files

