#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

const result = spawnSync(
  process.execPath,
  [
    '--test',
    '--test-concurrency=1',
    'tests/node/reducer.test.js',
    'tests/node/playwright-integration.test.js',
  ],
  {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  }
);

process.exit(result.status ?? 1);
