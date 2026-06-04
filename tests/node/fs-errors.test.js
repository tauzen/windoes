const test = require('node:test');
const assert = require('node:assert/strict');

let modulePromise;
function loadModule() {
  if (!modulePromise) {
    modulePromise = import('../../windoes/fs-errors.mjs');
  }
  return modulePromise;
}

// Mirrors the shape of the VirtualFS typed errors (they set a stable `name`).
function fsError(name, message) {
  const err = new Error(message);
  err.name = name;
  return err;
}

test('maps known VFS error names to friendly text, not the raw message', async () => {
  const { describeFsError } = await loadModule();
  const raw = "No such file or directory: '/C:/Nope.txt'";

  const result = describeFsError(fsError('FileNotFoundError', raw), {
    title: 'Error',
    action: "open 'Nope.txt'",
  });

  assert.equal(result.title, 'Error');
  assert.equal(result.icon, 'error');
  assert.ok(result.text.startsWith("Cannot open 'Nope.txt'."), 'leads with the action phrase');
  assert.ok(result.text.includes('could not be found'), 'uses the friendly explanation');
  assert.ok(!result.text.includes(raw), 'does not leak the developer message');
});

test('surfaces IndexedDB quota failures distinctly', async () => {
  const { describeFsError } = await loadModule();

  const result = describeFsError(fsError('QuotaExceededError', 'The quota has been exceeded.'), {
    title: 'Save Error',
    action: 'save the file',
  });

  assert.equal(result.title, 'Save Error');
  assert.ok(result.text.includes('not enough free space'));
});

test('falls back to the error message for unknown error types', async () => {
  const { describeFsError } = await loadModule();

  const result = describeFsError(new Error('Something odd happened'), { action: 'do the thing' });

  assert.equal(result.title, 'Error');
  assert.equal(result.text, 'Cannot do the thing.\n\nSomething odd happened');
});

test('omits the action prefix when no action is given', async () => {
  const { describeFsError } = await loadModule();

  const result = describeFsError(fsError('FileExistsError', 'exists'));

  assert.ok(!result.text.startsWith('Cannot'));
  assert.ok(result.text.includes('already exists'));
});

test('handles a missing/non-error argument without throwing', async () => {
  const { describeFsError } = await loadModule();

  const result = describeFsError(undefined, { action: 'save the file' });

  assert.equal(result.icon, 'error');
  assert.ok(result.text.includes('An unknown error has occurred.'));
});
