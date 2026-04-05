#!/usr/bin/env node

/**
 * Unified test runner for Windoes top-level tests.
 *
 * Usage:
 *   node tests/run-tests.js
 *   node tests/run-tests.js --list
 *   node tests/run-tests.js --only test-virtual-fs.js
 */

const path = require('path');
const { spawnSync } = require('child_process');

const TESTS = [
  'test-window-manager.js',
  'test-duplicate-windows.js',
  'test-icons.js',
  'test-notepad-save.js',
  'test-notepad-file-menu.js',
  'test-virtual-fs.js',
];

const TEST_DIR = __dirname;
const onlyIdx = process.argv.indexOf('--only');
const onlyArg = onlyIdx !== -1 ? process.argv[onlyIdx + 1] : null;
const listOnly = process.argv.includes('--list');

let selected = TESTS;
if (onlyArg) {
  selected = TESTS.filter((t) => t.includes(onlyArg));
  if (selected.length === 0) {
    console.error(`No tests matched --only ${onlyArg}`);
    process.exit(1);
  }
}

if (listOnly) {
  console.log('Configured tests:');
  for (const test of selected) console.log(`- ${test}`);
  process.exit(0);
}

const startedAt = Date.now();
const results = [];

console.log('========================================');
console.log('Windoes test runner');
console.log(`Running ${selected.length} test file(s)`);
console.log('========================================\n');

for (const testFile of selected) {
  const fullPath = path.join(TEST_DIR, testFile);
  const testStart = Date.now();

  console.log(`\n>>> Running ${testFile}`);
  const proc = spawnSync(process.execPath, [fullPath], {
    cwd: path.resolve(TEST_DIR, '..'),
    stdio: 'inherit',
    env: process.env,
  });

  const durationMs = Date.now() - testStart;
  const status = proc.status === 0 ? 'PASS' : 'FAIL';

  results.push({ testFile, status, durationMs, exitCode: proc.status ?? 1 });

  console.log(`<<< ${status} ${testFile} (${(durationMs / 1000).toFixed(2)}s)`);
}

const totalMs = Date.now() - startedAt;
const failed = results.filter((r) => r.status === 'FAIL');
const passed = results.filter((r) => r.status === 'PASS');

console.log('\n========================================');
console.log('Test summary');
for (const r of results) {
  console.log(`- ${r.status.padEnd(4)} ${r.testFile} (${(r.durationMs / 1000).toFixed(2)}s)`);
}
console.log('----------------------------------------');
console.log(`Passed: ${passed.length}`);
console.log(`Failed: ${failed.length}`);
console.log(`Total:  ${results.length}`);
console.log(`Time:   ${(totalMs / 1000).toFixed(2)}s`);
console.log('========================================');

if (failed.length > 0) {
  process.exit(1);
}
