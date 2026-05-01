/**
 * Playwright tests for the Paint application.
 *
 * Validates:
 * - Page loads with all expected UI elements (toolbox, palette, canvas, menus)
 * - Tool selection updates the active tool
 * - Drawing on the canvas writes pixels
 * - Palette click changes the foreground color and right-click changes background
 * - Clear Image / New blanks the canvas to background color
 * - Image > Invert Colors flips canvas pixel data
 * - Menu bar exposes the expected menus
 */

const path = require('path');
const { launchBrowser } = require('../../../../../tests/launch-browser');
const { createAssertTracker } = require('../../../../../tests/helpers/test-harness');

const FILE_URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

const tracker = createAssertTracker();
const { assert } = tracker;

async function runTests() {
  const browser = await launchBrowser();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // ── Test 1: Page loads with core UI elements ─────────────────────────
  console.log('\nTest 1: Page loads with core UI elements');
  await page.goto(FILE_URL);
  await page.waitForTimeout(500);

  const elements = await page.evaluate(() => ({
    window: !!document.getElementById('window'),
    canvas: !!document.getElementById('canvas'),
    previewCanvas: !!document.getElementById('previewCanvas'),
    toolbox: !!document.getElementById('toolbox'),
    palette: !!document.getElementById('palette'),
    menuBar: !!document.getElementById('menuBar'),
    statusBar: !!document.getElementById('statusBar'),
    swatchFg: !!document.getElementById('swatchFg'),
    swatchBg: !!document.getElementById('swatchBg'),
  }));

  assert(elements.window, 'Window element exists');
  assert(elements.canvas, 'Drawing canvas exists');
  assert(elements.previewCanvas, 'Preview canvas exists');
  assert(elements.toolbox, 'Toolbox exists');
  assert(elements.palette, 'Color palette exists');
  assert(elements.menuBar, 'Menu bar exists');
  assert(elements.statusBar, 'Status bar exists');
  assert(elements.swatchFg, 'Foreground swatch exists');
  assert(elements.swatchBg, 'Background swatch exists');

  // ── Test 2: Toolbox has expected tools ───────────────────────────────
  console.log('\nTest 2: Toolbox has expected tools');

  const tools = await page.evaluate(() =>
    [...document.querySelectorAll('.tool-btn')].map((b) => b.dataset.tool)
  );
  const expectedTools = ['pencil', 'brush', 'eraser', 'fill', 'picker', 'line', 'rect', 'ellipse'];
  for (const t of expectedTools) {
    assert(tools.includes(t), `Tool '${t}' is present`);
  }

  // ── Test 3: Selecting a tool updates the active tool ─────────────────
  console.log('\nTest 3: Selecting a tool updates the active tool');

  await page.click('.tool-btn[data-tool="brush"]');
  const activeTool = await page.evaluate(() => state.tool);
  assert(activeTool === 'brush', `Active tool is brush after click (got: ${activeTool})`);

  const activeBtnHasClass = await page.evaluate(() =>
    document.querySelector('.tool-btn[data-tool="brush"]').classList.contains('active')
  );
  assert(activeBtnHasClass, "Brush tool button has 'active' class");

  // ── Test 4: Color palette click changes foreground color ─────────────
  console.log('\nTest 4: Palette click changes foreground color');

  await page.evaluate(() => {
    const cell = document.querySelector('.color-cell[data-color="#ff0000"]');
    cell.click();
  });
  const fgColor = await page.evaluate(() => state.fgColor);
  assert(fgColor === '#ff0000', `Foreground color updated (got: ${fgColor})`);

  // ── Test 5: Right-click on palette changes background color ──────────
  console.log('\nTest 5: Right-click on palette changes background color');

  await page.evaluate(() => {
    const cell = document.querySelector('.color-cell[data-color="#0000ff"]');
    const evt = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    cell.dispatchEvent(evt);
  });
  const bgColor = await page.evaluate(() => state.bgColor);
  assert(bgColor === '#0000ff', `Background color updated (got: ${bgColor})`);

  // ── Test 6: Pencil draws pixels on the canvas ────────────────────────
  console.log('\nTest 6: Pencil draws pixels on the canvas');

  // Switch back to pencil and a recognizable color
  await page.click('.tool-btn[data-tool="pencil"]');
  await page.evaluate(() => {
    document.querySelector('.color-cell[data-color="#ff0000"]').click();
  });

  // Programmatically dispatch pointer events on canvas (matches runtime pointer handlers)
  await page.evaluate(() => {
    const c = document.getElementById('canvas');
    const rect = c.getBoundingClientRect();
    function fire(type, x, y, button = 0) {
      c.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + x,
          clientY: rect.top + y,
          button,
          pointerId: 1,
          pointerType: 'mouse',
          isPrimary: true,
        })
      );
    }
    fire('pointerdown', 50, 50);
    for (let i = 0; i <= 30; i += 2) fire('pointermove', 50 + i, 50 + i);
    fire('pointerup', 80, 80);
  });

  await page.waitForTimeout(50);

  const sampledColor = await page.evaluate(() => {
    const c = document.getElementById('canvas');
    const x = c.getContext('2d');
    const data = x.getImageData(60, 60, 1, 1).data;
    return [data[0], data[1], data[2]];
  });
  assert(
    sampledColor[0] > 200 && sampledColor[1] < 50 && sampledColor[2] < 50,
    `Canvas has red pixels along stroke (got rgb: ${sampledColor.join(',')})`
  );

  // ── Test 7: Clear Image fills canvas with background color ───────────
  console.log('\nTest 7: Clear Image (Edit menu) blanks the canvas');

  // Set bg back to white for predictable assertion
  await page.evaluate(() => {
    state.bgColor = '#ffffff';
  });
  await page.click('#editMenu');
  await page.waitForTimeout(50);
  await page.click('#menuClear');
  await page.waitForTimeout(100);

  const clearedColor = await page.evaluate(() => {
    const c = document.getElementById('canvas');
    const data = c.getContext('2d').getImageData(60, 60, 1, 1).data;
    return [data[0], data[1], data[2]];
  });
  assert(
    clearedColor[0] === 255 && clearedColor[1] === 255 && clearedColor[2] === 255,
    `Canvas cleared to white (got rgb: ${clearedColor.join(',')})`
  );

  // ── Test 8: Invert Colors changes pixel data ─────────────────────────
  console.log('\nTest 8: Invert Colors flips pixel data');

  // Fill a known patch first
  await page.evaluate(() => {
    const c = document.getElementById('canvas');
    const x = c.getContext('2d');
    x.fillStyle = '#202020';
    x.fillRect(10, 10, 5, 5);
  });

  await page.click('#imageMenu');
  await page.waitForTimeout(50);
  await page.click('#menuInvert');
  await page.waitForTimeout(100);

  const invertedColor = await page.evaluate(() => {
    const c = document.getElementById('canvas');
    const data = c.getContext('2d').getImageData(12, 12, 1, 1).data;
    return [data[0], data[1], data[2]];
  });
  // 0x20 -> 0xDF
  assert(
    invertedColor[0] === 0xdf && invertedColor[1] === 0xdf && invertedColor[2] === 0xdf,
    `Inverted dark gray patch -> light gray (got rgb: ${invertedColor.join(',')})`
  );

  // ── Test 9: Menu bar exposes expected menus ──────────────────────────
  console.log('\nTest 9: Menu bar exposes expected menus');

  const menus = await page.evaluate(() => ({
    file: !!document.getElementById('fileMenu'),
    edit: !!document.getElementById('editMenu'),
    view: !!document.getElementById('viewMenu'),
    image: !!document.getElementById('imageMenu'),
    help: !!document.getElementById('helpMenu'),
  }));
  assert(menus.file, 'File menu exists');
  assert(menus.edit, 'Edit menu exists');
  assert(menus.view, 'View menu exists');
  assert(menus.image, 'Image menu exists');
  assert(menus.help, 'Help menu exists');

  // ── Test 10: Save/Open roundtrip through VirtualFS bridge ─────────────
  console.log('\nTest 10: Save/Open roundtrip via VirtualFS bridge');

  await page.evaluate(() => {
    const store = new Map();

    window.__paintVfsBridge = async (type, payload) => {
      if (type === 'paint-vfs-save') {
        window.__lastPaintSavePath = payload.path;
        store.set(payload.path, payload.dataUrl);
        return { ok: true, path: payload.path };
      }
      if (type === 'paint-vfs-load') {
        const dataUrl = store.get(payload.path);
        if (!dataUrl) throw new Error('Not found');
        return { ok: true, path: payload.path, dataUrl };
      }
      throw new Error('Unexpected VFS op: ' + type);
    };
  });

  // Draw a distinct color patch.
  await page.evaluate(() => {
    const c = document.getElementById('canvas');
    const x = c.getContext('2d');
    x.fillStyle = '#00aa00';
    x.fillRect(30, 30, 20, 20);
  });

  // Save through File > Save As...
  await page.click('#fileMenu');
  await page.waitForTimeout(30);
  await page.click('#menuSave');
  await page.waitForSelector('#filePathDialog.visible');
  await page.fill('#filePathDialogInput', '/C:/My Documents/roundtrip');
  await page.click('#filePathDialogConfirm');
  await page.waitForTimeout(80);

  // Clear then reopen from bridge.
  await page.click('#editMenu');
  await page.waitForTimeout(30);
  await page.click('#menuClear');
  await page.waitForTimeout(60);

  await page.click('#fileMenu');
  await page.waitForTimeout(30);
  await page.click('#menuOpen');
  await page.waitForSelector('#filePathDialog.visible');
  await page.fill('#filePathDialogInput', '/C:/My Documents/roundtrip');
  await page.click('#filePathDialogConfirm');
  await page.waitForTimeout(100);

  const roundtripResult = await page.evaluate(() => {
    const c = document.getElementById('canvas');
    const data = c.getContext('2d').getImageData(35, 35, 1, 1).data;
    const savedPath = window.__lastPaintSavePath;
    return {
      reopenedColor: [data[0], data[1], data[2]],
      savedPath,
    };
  });
  assert(
    roundtripResult.reopenedColor[0] < 30 &&
      roundtripResult.reopenedColor[1] > 120 &&
      roundtripResult.reopenedColor[2] < 30,
    `Opened image restores green patch (got rgb: ${roundtripResult.reopenedColor.join(',')})`
  );
  assert(
    roundtripResult.savedPath === '/C:/My Documents/roundtrip.png',
    `Save normalizes extension to .png (got path: ${roundtripResult.savedPath})`
  );

  await browser.close();
  tracker.exitWithSummary();
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
