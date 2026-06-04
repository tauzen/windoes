const test = require('node:test');
const assert = require('node:assert/strict');

let onceModulePromise;
function loadOnceModule() {
  if (!onceModulePromise) {
    onceModulePromise = import('../../windoes/once.mjs');
  }
  return onceModulePromise;
}

test('once runs the function a single time across repeated calls', async () => {
  const { once } = await loadOnceModule();
  let calls = 0;
  const init = once(async () => {
    calls += 1;
    return 'ready';
  });

  assert.equal(await init(), 'ready');
  assert.equal(await init(), 'ready');
  assert.equal(await init(), 'ready');
  assert.equal(calls, 1);
});

test('once shares one in-flight promise for concurrent callers', async () => {
  const { once } = await loadOnceModule();
  let calls = 0;
  let resolveInner;
  const init = once(
    () =>
      new Promise((resolve) => {
        calls += 1;
        resolveInner = resolve;
      })
  );

  const a = init();
  const b = init();
  assert.equal(a, b, 'concurrent callers receive the same promise');
  assert.equal(calls, 1, 'underlying function is invoked only once');

  resolveInner('done');
  assert.equal(await a, 'done');
  assert.equal(await b, 'done');
});

test('once retries after a rejection', async () => {
  const { once } = await loadOnceModule();
  let calls = 0;
  const init = once(async () => {
    calls += 1;
    if (calls === 1) throw new Error('boom');
    return 'second-time-ok';
  });

  await assert.rejects(() => init(), /boom/);
  // The cache cleared on failure, so the next call runs the function again.
  assert.equal(await init(), 'second-time-ok');
  assert.equal(calls, 2);
});

test('once caches the result after a successful run (no retry)', async () => {
  const { once } = await loadOnceModule();
  let calls = 0;
  const init = once(async () => {
    calls += 1;
    return calls;
  });

  assert.equal(await init(), 1);
  assert.equal(await init(), 1, 'subsequent calls reuse the first result');
  assert.equal(calls, 1);
});
