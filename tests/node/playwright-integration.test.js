const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
const testsDir = path.resolve(repoRoot, 'tests');

const integrationScripts = [
  'test-window-manager.js',
  'test-duplicate-windows.js',
  'test-icons.js',
  'test-notepad-save.js',
  'test-notepad-file-menu.js',
  'test-virtual-fs.js',
];

for (const script of integrationScripts) {
  test(`Playwright integration: ${script}`, { timeout: 180_000 }, () => {
    const fullPath = path.join(testsDir, script);
    const result = spawnSync(process.execPath, [fullPath], {
      cwd: repoRoot,
      stdio: 'inherit',
      env: process.env,
    });

    assert.equal(result.status, 0, `${script} failed with exit code ${result.status ?? -1}`);
  });
}
