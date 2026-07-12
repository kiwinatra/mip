/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

let expect;
before(async function () {
  const chai = await import('chai');
  expect = chai.expect;
});

const { withCwd } = require('../helpers/with-cwd');

const FEATURES_MODULE_PATH = path.join(__dirname, '../../lib/utils/features');

function mkTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mip-features-'));
}

function writeYaml(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function resetModules() {
  // Force re-read features config from disk.
  delete require.cache[FEATURES_MODULE_PATH];
  return require(FEATURES_MODULE_PATH);
}

describe('utils/features', function () {
  this.timeout(10000);

  it('getFeature returns DEFAULT when config file is missing', function () {
    const tmp = mkTmpDir();

    return withCwd(tmp, () => {
      const features = resetModules();
      expect(features.getFeature('install.parallel')).to.equal(features.DEFAULT_FEATURES['install.parallel']);
      expect(features.isFeaturesEnabled(tmp)).to.equal(true);
    });
  });

  it('loadFeatures returns {} when config.enabled is false', function () {
    const tmp = mkTmpDir();
    // NOTE: features.loadFeatures checks for the flat key `config.enabled`
    // (not the nested object `config: { enabled: false }`)
    writeYaml(path.join(tmp, 'mip.config.yml'), 'config.enabled: false\n');

    return withCwd(tmp, () => {
      const features = resetModules();
      const loaded = features.loadFeatures(tmp);
      expect(loaded).to.deep.equal({});

      expect(features.getFeature('install.parallel')).to.equal(features.DEFAULT_FEATURES['install.parallel']);
      expect(features.isFeatureEnabled('install.parallel', tmp)).to.equal(false);
      expect(features.isFeatureDisabled('install.parallel', tmp)).to.equal(true);
      expect(features.isFeaturesEnabled(tmp)).to.equal(false);
    });
  });

  it('setFeature writes to mip.config.yml when config file is mip.config.yml', function () {
    const tmp = mkTmpDir();
    writeYaml(path.join(tmp, 'mip.config.yml'), 'config.enabled: true\n');

    return withCwd(tmp, () => {
      const features = resetModules();
      const ok = features.setFeature('install.parallel', false, tmp);
      expect(ok).to.equal(true);

      const raw = fs.readFileSync(path.join(tmp, 'mip.config.yml'), 'utf8');
      expect(raw).to.contain('install.parallel: false');

      const features2 = resetModules();
      expect(features2.getFeature('install.parallel', tmp)).to.equal(false);
      expect(features2.isFeatureDisabled('install.parallel', tmp)).to.equal(true);
    });
  });

  it('setFeature writes under features.* when config path is mip.yml', function () {
    const tmp = mkTmpDir();
    // mip.yml uses `features:` object
    writeYaml(path.join(tmp, 'mip.yml'), 'features:\n  config.enabled: true\n');

    return withCwd(tmp, () => {
      const features = resetModules();
      const ok = features.setFeature('motd.enabled', false, tmp);
      expect(ok).to.equal(true);

      const raw = fs.readFileSync(path.join(tmp, 'mip.yml'), 'utf8');
      expect(raw).to.contain('motd.enabled: false');

      const features2 = resetModules();
      expect(features2.getFeature('motd.enabled', tmp)).to.equal(false);
      expect(features2.isFeatureDisabled('motd.enabled', tmp)).to.equal(true);
      expect(features2.isFeaturesEnabled(tmp)).to.equal(true);
    });
  });

  it('resetFeature removes the custom value and falls back to default', function () {
    const tmp = mkTmpDir();
    writeYaml(path.join(tmp, 'mip.config.yml'), 'config.enabled: true\ninstall.parallel: false\n');

    return withCwd(tmp, () => {
      const features = resetModules();
      const ok = features.resetFeature('install.parallel', tmp);
      expect(ok).to.equal(true);

      const features2 = resetModules();
      expect(features2.getFeature('install.parallel', tmp)).to.equal(features2.DEFAULT_FEATURES['install.parallel']);

      const isDefault = features2.getAllFeaturesWithDescriptions(tmp).find((x) => x.key === 'install.parallel').isDefault;
      expect(isDefault).to.equal(true);
    });
  });

  it('generateConfigFile creates mip.config.yml with default keys', function () {
    const tmp = mkTmpDir();

    return withCwd(tmp, () => {
      const features = resetModules();
      const outPath = features.generateConfigFile(tmp);
      expect(outPath).to.equal(path.join(tmp, 'mip.config.yml'));

      const raw = fs.readFileSync(outPath, 'utf8');
      expect(raw).to.contain('install.parallel: ');
      expect(raw).to.contain('# === INSTALL ===');
    });
  });
});

