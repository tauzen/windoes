/**
 * Playwright tests for MS Paint integration.
 */

const path = require('path');
const { launchBrowser, startStaticServer } = require('./launch-browser');
const { createAssertTracker, waitForBoot } = require('./helpers/test-harness');

const WINDOES_DIR = path.resolve(__dirname, '..', 'windoes');

const tracker = createAssertTracker();
const { assert } = tracker;

async function runTests() {
  const { server, baseUrl } = await startStaticServer(WINDOES_DIR);
  const browser = await launchBrowser();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  try {
    console.log('\nTest 1: Start Menu Accessories → Paint opens MS Paint app window');
    await waitForBoot(page, baseUrl);

    await page.click('#startButton');
    await page.waitForTimeout(150);
    await page.hover('#menuPrograms');
    await page.waitForTimeout(150);
    await page.hover('#subAccessories');
    await page.waitForTimeout(150);
    await page.click('#subAccPaint');
    await page.waitForTimeout(300);

    const paintWindowState = await page.evaluate(() => {
      const win = document.getElementById('paintWindow');
      const frame = document.getElementById('paintFrame');
      return {
        exists: !!win,
        visible: !!win && !win.classList.contains('hidden'),
        frameSrc: frame ? frame.getAttribute('src') || '' : '',
      };
    });

    assert(paintWindowState.exists, 'Paint window exists');
    assert(paintWindowState.visible, 'Paint window is visible after launch');
    assert(
      paintWindowState.frameSrc.includes('applications/ms-paint/index.html'),
      `Paint iframe src points to ms-paint app (${paintWindowState.frameSrc})`
    );

    console.log('\nTest 2: Paint opener can receive a file path and pass it to iframe src');

    await page.evaluate(async () => {
      window.WindoesApp.open.paint({ filePath: '/C:/My Documents/sample.png' });
    });

    await page.waitForTimeout(300);

    const paintOpenFromPngState = await page.evaluate(() => {
      const frame = document.getElementById('paintFrame');
      const src = frame ? frame.getAttribute('src') || '' : '';
      const params = src.includes('?') ? new URLSearchParams(src.split('?')[1]) : null;
      const filePath = params ? params.get('filePath') : null;
      return {
        src,
        hasFilePath: src.includes('filePath='),
        filePath,
      };
    });

    assert(
      paintOpenFromPngState.hasFilePath,
      `Paint iframe src includes filePath query (${paintOpenFromPngState.src})`
    );
    assert(
      paintOpenFromPngState.filePath === '/C:/My Documents/sample.png',
      `Paint iframe filePath decodes to expected path (got: ${paintOpenFromPngState.filePath})`
    );
  } finally {
    await browser.close();
    server.close();
  }

  tracker.exitWithSummary();
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
