const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
const testsDir = path.resolve(repoRoot, 'tests');

const integrationScripts = [
  'test-window-manager.js',
  'test-taskbar-menu.js',
  'test-start-menu.js',
  'test-shutdown-dialog.js',
  'test-duplicate-windows.js',
  'test-virtualboks-launch.js',
  'test-icons.js',
  'test-desktop-drag.js',
  'test-boot-preload.js',
  'test-notepad-save.js',
  'test-notepad-file-menu.js',
  'test-file-chooser-overwrite.js',
  'test-html-file-open.js',
  'test-paint-app.js',
  'test-app-sandbox.js',
  'test-winamp-title-bar.js',
  'test-virtual-fs.js',
  'test-axe-accessibility.js',
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
