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
      paintWindowState.frameSrc.includes('applications/paint/index.html'),
      `Paint iframe src points to paint app (${paintWindowState.frameSrc})`
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

    console.log('\nTest 3: Paint content area adapts when parent window is resized');

    const resizeState = await page.evaluate(async () => {
      const paintWindow = document.getElementById('paintWindow');
      const frame = document.getElementById('paintFrame');
      if (!paintWindow || !frame || !frame.contentWindow) {
        return { ok: false, reason: 'paint window or iframe unavailable' };
      }

      const frameDoc = frame.contentWindow.document;
      const windowEl = frameDoc.querySelector('.window');
      const canvasWrapEl = frameDoc.getElementById('canvasWrap');
      if (!windowEl || !canvasWrapEl) {
        return { ok: false, reason: 'paint content nodes unavailable' };
      }

      const measure = () => ({
        windowWidth: windowEl.getBoundingClientRect().width,
        windowHeight: windowEl.getBoundingClientRect().height,
        wrapWidth: canvasWrapEl.getBoundingClientRect().width,
        wrapHeight: canvasWrapEl.getBoundingClientRect().height,
      });

      paintWindow.style.width = '900px';
      paintWindow.style.height = '650px';
      await new Promise((resolve) => setTimeout(resolve, 120));
      const bigger = measure();

      paintWindow.style.width = '560px';
      paintWindow.style.height = '420px';
      await new Promise((resolve) => setTimeout(resolve, 120));
      const smaller = measure();

      return {
        ok: true,
        bigger,
        smaller,
      };
    });

    assert(resizeState.ok, `Paint resize probe succeeded (${resizeState.reason || 'ok'})`);
    assert(
      resizeState.bigger.windowWidth > resizeState.smaller.windowWidth,
      `Paint shell width tracks parent resize (${resizeState.bigger.windowWidth} > ${resizeState.smaller.windowWidth})`
    );
    assert(
      resizeState.bigger.windowHeight > resizeState.smaller.windowHeight,
      `Paint shell height tracks parent resize (${resizeState.bigger.windowHeight} > ${resizeState.smaller.windowHeight})`
    );
    assert(
      resizeState.bigger.wrapWidth > resizeState.smaller.wrapWidth,
      `Paint canvas area width tracks parent resize (${resizeState.bigger.wrapWidth} > ${resizeState.smaller.wrapWidth})`
    );
    assert(
      resizeState.bigger.wrapHeight > resizeState.smaller.wrapHeight,
      `Paint canvas area height tracks parent resize (${resizeState.bigger.wrapHeight} > ${resizeState.smaller.wrapHeight})`
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
