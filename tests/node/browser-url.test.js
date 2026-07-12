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

test('vfsPathFromBrowserInput parses Windows-style paths', async () => {
  const { vfsPathFromBrowserInput } = await loadUrlModule();
  assert.equal(
    vfsPathFromBrowserInput('C:\\My Documents\\page.html'),
    '/C:/My Documents/page.html'
  );
  assert.equal(vfsPathFromBrowserInput('c:/My Documents/page.html'), '/C:/My Documents/page.html');
  assert.equal(
    vfsPathFromBrowserInput('/C:/My Documents/page.html'),
    '/C:/My Documents/page.html'
  );
  assert.equal(vfsPathFromBrowserInput('  C:\\page.html  '), '/C:/page.html');
  assert.equal(vfsPathFromBrowserInput('C:'), '/C:');
  assert.equal(vfsPathFromBrowserInput('C:\\'), '/C:');
});

test('vfsPathFromBrowserInput rejects non-local inputs', async () => {
  const { vfsPathFromBrowserInput } = await loadUrlModule();
  assert.equal(vfsPathFromBrowserInput('https://example.com'), null);
  assert.equal(vfsPathFromBrowserInput('example.com'), null);
  assert.equal(vfsPathFromBrowserInput('about:blank'), null);
  assert.equal(vfsPathFromBrowserInput('javascript:alert(1)'), null);
  assert.equal(vfsPathFromBrowserInput(''), null);
});

test('windowsPathFromVfsPath renders backslash paths', async () => {
  const { windowsPathFromVfsPath } = await loadUrlModule();
  assert.equal(
    windowsPathFromVfsPath('/C:/My Documents/page.html'),
    'C:\\My Documents\\page.html'
  );
  assert.equal(windowsPathFromVfsPath('/C:'), 'C:');
});

test('isHtmlFilePath matches .html and .htm only', async () => {
  const { isHtmlFilePath } = await loadUrlModule();
  assert.equal(isHtmlFilePath('/C:/page.html'), true);
  assert.equal(isHtmlFilePath('/C:/page.HTM'), true);
  assert.equal(isHtmlFilePath('/C:/notes.txt'), false);
  assert.equal(isHtmlFilePath('/C:/html'), false);
  assert.equal(isHtmlFilePath(''), false);
});
