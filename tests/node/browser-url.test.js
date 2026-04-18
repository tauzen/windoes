const test = require('node:test');
const assert = require('node:assert/strict');

let urlModulePromise;
function loadUrlModule() {
  if (!urlModulePromise) {
    urlModulePromise = import('../../windoes/browser-url.mjs');
  }
  return urlModulePromise;
}

test('normalizeBrowserUrl keeps about:blank', async () => {
  const { normalizeBrowserUrl } = await loadUrlModule();
  assert.equal(normalizeBrowserUrl('about:blank'), 'about:blank');
});

test('normalizeBrowserUrl adds https scheme for bare hostnames', async () => {
  const { normalizeBrowserUrl } = await loadUrlModule();
  assert.equal(normalizeBrowserUrl('example.com'), 'https://example.com/');
});

test('normalizeBrowserUrl rejects javascript and data URLs', async () => {
  const { normalizeBrowserUrl } = await loadUrlModule();
  assert.equal(normalizeBrowserUrl('javascript://x', 'https://example.com'), 'https://example.com');
  assert.equal(
    normalizeBrowserUrl('data:text/html,boom', 'https://example.com'),
    'https://example.com'
  );
});

test('normalizeBrowserUrl rejects unsupported schemes', async () => {
  const { normalizeBrowserUrl } = await loadUrlModule();
  assert.equal(
    normalizeBrowserUrl('file:///etc/passwd', 'https://example.com'),
    'https://example.com'
  );
});
