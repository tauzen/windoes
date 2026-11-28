/**
 * Playwright tests for MS Paint integration.
 *
 * Also validates that the shell serves Paint VFS load/save only for files the
 * user picked in the shell file chooser (or opened into Paint from Explorer)
 * during the current Paint session.
 */

const path = require('path');
const { launchBrowser, startStaticServer } = require('./launch-browser');
const { createAssertTracker, waitForBoot } = require('./helpers/test-harness');

const WINDOES_DIR = path.resolve(__dirname, '..', 'windoes');

const tracker = createAssertTracker();
const { assert } = tracker;

const SECRET_PATH = '/C:/My Documents/f002-secret.png';
const PICKED_PATH = '/C:/My Documents/f002-picked.png';
const SAVE_AS_PATH = '/C:/My Documents/f002-save-as.png';
const UNCHOSEN_SAVE_PATH = '/C:/My Documents/f002-unchosen.png';

// Write small solid PNGs into the VFS and, from then on, record every
// VirtualFS readFile/writeFile the page makes in window.__vfsCalls. The import
// must use the URL the shell loaded so the spy patches the shell's class.
async function seedVfs(page, files) {
  await page.evaluate(async (entries) => {
    const { VirtualFS } = await import('./virtual-fs.ts');
    const fs = new VirtualFS();
    await fs.init();
    for (const [filePath, color] of entries) {
      const canvas = document.createElement('canvas');
      canvas.width = 8;
      canvas.height = 8;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 8, 8);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      await fs.writeFile(filePath, blob);
    }
    if (!window.__vfsSpyInstalled) {
      window.__vfsSpyInstalled = true;
      window.__vfsCalls = [];
      for (const method of ['readFile', 'writeFile']) {
        const original = VirtualFS.prototype[method];
        VirtualFS.prototype[method] = function (filePath, ...rest) {
          window.__vfsCalls.push({ method, path: filePath });
          return original.call(this, filePath, ...rest);
        };
      }
    }
  }, files);
}

async function vfsCallCount(page, method, filePath) {
  return page.evaluate(
    ({ method, filePath }) =>
      (window.__vfsCalls || []).filter((c) => c.method === method && c.path === filePath).length,
    { method, filePath }
  );
}

async function vfsFileSnapshot(page, filePath) {
  return page.evaluate(async (target) => {
    const { VirtualFS } = await import('./virtual-fs.ts');
    const fs = new VirtualFS();
    await fs.init();
    if (!(await fs.exists(target))) return null;
    const blob = await fs.readFile(target);
    return new Uint8Array(await blob.arrayBuffer()).join(',');
  }, filePath);
}

// Poll until the stored file differs from `previous` (writes are async).
async function waitForFileChange(page, filePath, previous) {
  for (let i = 0; i < 40; i++) {
    const current = await vfsFileSnapshot(page, filePath);
    if (current !== previous) return current;
    await page.waitForTimeout(50);
  }
  return previous;
}

// Open a fresh Paint session and return its iframe once the app is ready.
async function openFreshPaint(page, options = {}) {
  await page.evaluate(() => window.WindoesApp.WindowManager.close('paint'));
  await page.waitForTimeout(100);
  await page.evaluate((opts) => window.WindoesApp.open.paint(opts), options);
  const frame = await (await page.$('#paintFrame')).contentFrame();
  await frame.waitForSelector('#menuOpen', { state: 'attached' });
  return frame;
}

// Send a Paint VFS request to the shell from inside the Paint frame, as any
// code running there could, and return the shell's reply.
async function paintRequest(frame, type, payload) {
  return frame.evaluate(
    ({ type, payload }) =>
      new Promise((resolve) => {
        const requestId = `f002-${Math.random()}`;
        const onMessage = (event) => {
          if (event.data?.type !== `${type}-result` || event.data.requestId !== requestId) return;
          window.removeEventListener('message', onMessage);
          resolve(event.data);
        };
        window.addEventListener('message', onMessage);
        window.parent.postMessage({ type, requestId, ...payload }, window.location.origin);
      }),
    { type, payload }
  );
}

async function waitForPaintTitle(page, fileName) {
  await page.waitForFunction(
    (name) => window.WindoesApp.state.get().paint.title === `${name} - Paint`,
    fileName,
    { timeout: 5000 }
  );
}

async function chooseInShellDialog(page, filePath) {
  await page.waitForSelector('#fileChooserDialog.active', { timeout: 5000 });
  await page.fill('#fileChooserNameInput', filePath);
  await page.click('#fileChooserConfirmBtn');
}

async function drawOnCanvas(frame, color) {
  await frame.evaluate((fill) => {
    const ctx = document.getElementById('canvas').getContext('2d');
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, 4, 4);
  }, color);
}

async function clickPaintMenu(frame, id) {
  await frame.evaluate((menuId) => document.getElementById(menuId).click(), id);
}

async function runTests() {
  const { server, baseUrl } = await startStaticServer(WINDOES_DIR);
  const browser = await launchBrowser();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const alerts = [];
  page.on('dialog', (dialog) => {
    alerts.push(dialog.message());
    dialog.dismiss().catch(() => {});
  });

  try {
    console.log('\nTest 1: Start Menu Programs → Paint opens MS Paint app window');
    await waitForBoot(page, baseUrl);

    await page.click('#startButton');
    await page.waitForTimeout(150);
    await page.hover('#menuPrograms');
    await page.waitForSelector('#programsSubmenu.open');
    await page.click('#subPaint');
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

    // The Paint frame has an opaque origin, so the shell page cannot read its
    // document: resize from the shell, measure from inside the frame.
    const paintContent = await (await page.$('#paintFrame')).contentFrame();
    const measurePaint = () =>
      paintContent.evaluate(() => {
        const windowEl = document.querySelector('.window');
        const canvasWrapEl = document.getElementById('canvasWrap');
        if (!windowEl || !canvasWrapEl) return null;
        return {
          windowWidth: windowEl.getBoundingClientRect().width,
          windowHeight: windowEl.getBoundingClientRect().height,
          wrapWidth: canvasWrapEl.getBoundingClientRect().width,
          wrapHeight: canvasWrapEl.getBoundingClientRect().height,
        };
      });
    const resizePaintWindow = async (width, height) => {
      await page.evaluate(
        ({ width, height }) => {
          const paintWindow = document.getElementById('paintWindow');
          paintWindow.style.width = width;
          paintWindow.style.height = height;
        },
        { width, height }
      );
      await page.waitForTimeout(120);
      return measurePaint();
    };

    const bigger = await resizePaintWindow('900px', '650px');
    const smaller = await resizePaintWindow('560px', '420px');
    const resizeState =
      bigger && smaller
        ? { ok: true, bigger, smaller }
        : { ok: false, reason: 'paint content nodes unavailable' };

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

    console.log('\nTest 4: Paint cannot load or save a file the user never chose');
    await seedVfs(page, [
      [SECRET_PATH, '#ff0000'],
      [PICKED_PATH, '#0000ff'],
    ]);
    let frame = await openFreshPaint(page);
    const secretBefore = await vfsFileSnapshot(page, SECRET_PATH);
    await page.evaluate(() => {
      window.__vfsCalls = [];
    });

    const unchosenLoad = await paintRequest(frame, 'paint-vfs-load', { path: SECRET_PATH });
    assert(
      unchosenLoad.ok === false && !unchosenLoad.dataUrl,
      `Load of a never-chosen path returns ok: false (${unchosenLoad.error})`
    );
    assert(
      (await vfsCallCount(page, 'readFile', SECRET_PATH)) === 0,
      'Refused load does not read the file'
    );

    const dataUrl = await frame.evaluate(() =>
      document.getElementById('canvas').toDataURL('image/png')
    );
    const unchosenOverwrite = await paintRequest(frame, 'paint-vfs-save', {
      path: SECRET_PATH,
      dataUrl,
    });
    const unchosenCreate = await paintRequest(frame, 'paint-vfs-save', {
      path: UNCHOSEN_SAVE_PATH,
      dataUrl,
    });
    assert(
      unchosenOverwrite.ok === false,
      `Save over a never-chosen existing file returns ok: false (${unchosenOverwrite.error})`
    );
    assert(
      unchosenCreate.ok === false,
      `Save to a never-chosen new path returns ok: false (${unchosenCreate.error})`
    );
    assert(
      (await vfsCallCount(page, 'writeFile', SECRET_PATH)) === 0 &&
        (await vfsCallCount(page, 'writeFile', UNCHOSEN_SAVE_PATH)) === 0,
      'Refused saves do not write the file'
    );
    assert(
      (await vfsFileSnapshot(page, SECRET_PATH)) === secretBefore,
      'Never-chosen existing file keeps its content'
    );
    assert(
      (await vfsFileSnapshot(page, UNCHOSEN_SAVE_PATH)) === null,
      'Never-chosen new path is not created'
    );

    console.log('\nTest 5: Open a chosen file, edit it, and save it');
    alerts.length = 0;
    await clickPaintMenu(frame, 'menuOpen');
    await chooseInShellDialog(page, PICKED_PATH);
    await waitForPaintTitle(page, 'f002-picked.png');
    assert(
      (await vfsCallCount(page, 'readFile', PICKED_PATH)) > 0,
      'Paint loads the file chosen in the Open dialog'
    );
    const pickedBefore = await vfsFileSnapshot(page, PICKED_PATH);
    await drawOnCanvas(frame, '#00ff00');
    await clickPaintMenu(frame, 'menuSaveFile');
    const pickedAfter = await waitForFileChange(page, PICKED_PATH, pickedBefore);
    assert(pickedAfter !== pickedBefore, 'Save writes the edited image to the opened file');
    assert(alerts.length === 0, `Open and save show no error (${alerts.join(' | ')})`);

    console.log('\nTest 6: Save As to a new chosen path, then Save again');
    await clickPaintMenu(frame, 'menuSave');
    await chooseInShellDialog(page, SAVE_AS_PATH);
    await waitForPaintTitle(page, 'f002-save-as.png');
    const saveAsFirst = await waitForFileChange(page, SAVE_AS_PATH, null);
    assert(saveAsFirst !== null, 'Save As writes the new chosen file');
    await drawOnCanvas(frame, '#ffff00');
    await clickPaintMenu(frame, 'menuSaveFile');
    const saveAsSecond = await waitForFileChange(page, SAVE_AS_PATH, saveAsFirst);
    assert(saveAsSecond !== saveAsFirst, 'Save again writes the Save As file a second time');
    assert(alerts.length === 0, `Save As and Save show no error (${alerts.join(' | ')})`);

    console.log('\nTest 7: Grants end when the Paint window closes');
    frame = await openFreshPaint(page);
    const staleLoad = await paintRequest(frame, 'paint-vfs-load', { path: PICKED_PATH });
    const staleSave = await paintRequest(frame, 'paint-vfs-save', {
      path: SAVE_AS_PATH,
      dataUrl,
    });
    assert(staleLoad.ok === false, 'Load of a file chosen in a closed session is refused');
    assert(staleSave.ok === false, 'Save to a file chosen in a closed session is refused');
    assert(
      (await vfsFileSnapshot(page, SAVE_AS_PATH)) === saveAsSecond,
      'Refused stale save leaves the file unchanged'
    );

    console.log('\nTest 8: A file opened into Paint from Explorer is granted to that session');
    alerts.length = 0;
    frame = await openFreshPaint(page, { filePath: PICKED_PATH });
    await waitForPaintTitle(page, 'f002-picked.png');
    assert(alerts.length === 0, `Paint opens the launch file (${alerts.join(' | ')})`);
    const otherLoad = await paintRequest(frame, 'paint-vfs-load', { path: SECRET_PATH });
    assert(otherLoad.ok === false, 'Other files stay refused in a session opened from Explorer');
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
