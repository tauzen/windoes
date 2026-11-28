// The Shut Down dialog behaves like Windows 98: while it is open a 2x2 black
// checkerboard darkens the whole screen, and Cancel removes it. A focused radio
// option shows the dotted box around its label, not the browser focus ring.
// Arrow keys move between the options, and OK runs the chosen one.
const assert = require('node:assert/strict');
const path = require('node:path');
const { launchBrowser, startStaticServer } = require('./launch-browser');
const { waitForBoot } = require('./helpers/test-harness');

// RGB of each pixel in a 2x2 square of the rendered screen at (x, y).
async function screenPixels(page, x, y) {
  const png = await page.screenshot({ clip: { x, y, width: 2, height: 2 } });
  return page.evaluate(async (base64) => {
    const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    const { data } = ctx.getImageData(0, 0, 2, 2);
    const pixels = [];
    for (let i = 0; i < data.length; i += 4) pixels.push([data[i], data[i + 1], data[i + 2]]);
    return pixels;
  }, png.toString('base64'));
}

const BLACK = [0, 0, 0];

async function run() {
  const { server, baseUrl } = await startStaticServer(path.resolve(__dirname, '..', 'windoes'));
  const browser = await launchBrowser();
  const page = await browser.newPage({
    viewport: { width: 800, height: 600 },
    deviceScaleFactor: 1,
  });
  const focused = () =>
    page.evaluate(() => {
      const el = document.activeElement;
      return { name: el?.name, value: el?.value, checked: el?.checked };
    });
  const openDialog = async () => {
    await page.click('#startButton');
    await page.click('#menuShutdown');
    await page.waitForSelector('#shutdownDialog.active');
  };
  try {
    await waitForBoot(page, baseUrl);
    await page.mouse.move(700, 100);
    // An empty spot of desktop, and one of the taskbar.
    const desktopBefore = await screenPixels(page, 600, 100);
    const taskbarBefore = await screenPixels(page, 400, 590);
    assert.notDeepEqual(desktopBefore[0], BLACK, 'The desktop is not black before Shut Down');

    await openDialog();
    for (const [where, x, y, before] of [
      ['desktop', 600, 100, desktopBefore],
      ['taskbar', 400, 590, taskbarBefore],
    ]) {
      const [a, b, c, d] = await screenPixels(page, x, y);
      assert.deepEqual([a, d], [BLACK, BLACK], `Shut Down blackens every other ${where} pixel`);
      assert.deepEqual([b, c], [before[1], before[2]], `The other ${where} pixels show through`);
    }

    // Shift+Tab from OK reaches the checked option.
    await page.keyboard.press('Shift+Tab');
    assert.deepEqual(
      await focused(),
      { name: 'shutdownOption', value: 'shutdown', checked: true },
      'Shift+Tab from OK focuses the checked option'
    );
    const focusMarks = await page.evaluate(() => {
      const input = document.activeElement;
      const label = input.closest('label').querySelector('.shutdown-option-label');
      return {
        input: getComputedStyle(input).outlineStyle,
        label: label && getComputedStyle(label).outlineStyle,
      };
    });
    assert.deepEqual(
      focusMarks,
      { input: 'none', label: 'dotted' },
      'The focused option has a dotted box around its label and no focus ring'
    );

    await page.keyboard.press('ArrowDown');
    assert.deepEqual(
      await focused(),
      { name: 'shutdownOption', value: 'restart', checked: true },
      'ArrowDown moves to Restart'
    );
    await page.keyboard.press('ArrowDown');
    assert.equal((await focused()).value, 'msdos', 'ArrowDown moves to MS-DOS mode');
    await page.keyboard.press('ArrowUp');
    assert.equal((await focused()).value, 'restart', 'ArrowUp moves back to Restart');

    await page.click('#shutdownCancelBtn');
    await page.waitForSelector('#shutdownDialog', { state: 'hidden' });
    assert.deepEqual(
      await screenPixels(page, 600, 100),
      desktopBefore,
      'Cancel removes the checkerboard from the desktop'
    );
    assert.deepEqual(
      await screenPixels(page, 400, 590),
      taskbarBefore,
      'Cancel removes the checkerboard from the taskbar'
    );

    // OK runs Restart when Restart is chosen: the shell reloads.
    await openDialog();
    await page.evaluate(() => {
      window.__beforeRestart = true;
    });
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('ArrowDown');
    await Promise.all([page.waitForEvent('load'), page.click('#shutdownOkBtn')]);
    assert.equal(
      await page.evaluate(() => window.__beforeRestart),
      undefined,
      'OK with Restart chosen reloads the shell'
    );

    // OK runs Shut down when Shut down is chosen.
    await waitForBoot(page, baseUrl);
    await openDialog();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
    assert.equal((await focused()).value, 'shutdown', 'ArrowUp moves back to Shut down');
    await page.click('#shutdownOkBtn');
    await page.waitForSelector('#shutdownScreen');
    assert.equal(
      await page.isVisible('#shutdownDialog'),
      false,
      'OK with Shut down chosen closes the dialog and shows the shutdown screen'
    );

    console.log('Shut Down dialog: checkerboard, focus box, arrow keys and OK passed');
  } finally {
    await browser.close();
    server.close();
  }
}
run().catch((error) => {
  console.error(error);
  process.exit(1);
});
