const assert = require('node:assert/strict');
const path = require('node:path');
const { launchBrowser, startStaticServer } = require('./launch-browser');
const { waitForBoot } = require('./helpers/test-harness');

async function run() {
  const { server, baseUrl } = await startStaticServer(path.resolve(__dirname, '..', 'windoes'));
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  try {
    await waitForBoot(page, baseUrl);
    await page.evaluate(() => window.WindoesApp.open.notepad());
    const button = page.locator('.task-button').filter({ hasText: 'Notepad' });
    const menu = page.getByRole('menu', { name: 'Window menu' });
    const item = (name) => menu.getByRole('menuitem', { name });
    await button.click({ button: 'right', position: { x: 10, y: 10 } });
    await menu.waitFor();
    assert.equal(await item('Restore').isDisabled(), true);
    assert.equal(await item('Minimize').isEnabled(), true);
    assert.equal(await item('Maximize').isEnabled(), true);
    const box = await menu.boundingBox();
    const btnBox = await button.boundingBox();
    assert.ok(Math.abs(box.x - (btnBox.x + 10)) < 2);
    if (process.env.TASKBAR_EVIDENCE) await page.screenshot({ path: process.env.TASKBAR_EVIDENCE });
    await item('Minimize').click();
    assert.equal(
      await page.evaluate(() => window.WindoesApp.state.get().windows.byId.notepad.minimized),
      true
    );
    await button.focus();
    await page.keyboard.press('Shift+F10');
    assert.equal(await item('Restore').isEnabled(), true);
    assert.equal(await item('Minimize').isDisabled(), true);
    await item('Maximize').click();
    assert.deepEqual(
      await page.evaluate(() => {
        const { minimized, maximized } = window.WindoesApp.state.get().windows.byId.notepad;
        return { minimized, maximized };
      }),
      { minimized: false, maximized: true }
    );
    await button.click({ button: 'right' });
    await item('Minimize').click();
    await button.focus();
    await page.keyboard.press('Shift+F10');
    await page.keyboard.press('Enter');
    assert.equal(
      await page.evaluate(() => window.WindoesApp.state.get().windows.byId.notepad.minimized),
      false
    );
    assert.equal(
      await page.evaluate(() => window.WindoesApp.state.get().windows.byId.notepad.maximized),
      true
    );
    await button.click({ button: 'right' });
    await item('Restore').click();
    await button.focus();
    await page.keyboard.press('ContextMenu');
    await item('Maximize').click();
    await button.click({ button: 'right' });
    assert.equal(await item('Maximize').isDisabled(), true);
    await item('Restore').click();
    assert.equal(
      await page.evaluate(() => window.WindoesApp.state.get().windows.byId.notepad.maximized),
      false
    );
    await button.click({ button: 'right' });
    await page.keyboard.press('Escape');
    assert.equal(await menu.count(), 0);
    await button.click({ button: 'right' });
    await page.locator('#theDesktop').click({ position: { x: 900, y: 100 } });
    assert.equal(await menu.count(), 0);
    await page.evaluate(() => window.WindoesApp.open.winamp());
    await page.locator('#winampFrame').evaluate((frame) => {
      frame.src = 'about:blank';
    });
    await page.waitForFunction(
      () => document.querySelector('#winampFrame').getAttribute('src') === 'about:blank'
    );
    const winamp = page.locator('#winampTaskBtn');
    await winamp.click({ button: 'right' });
    if (process.env.TASKBAR_EVIDENCE) {
      await page.screenshot({ path: process.env.TASKBAR_EVIDENCE.replace('.png', '-winamp.png') });
    }
    assert.equal(await item('Maximize').isDisabled(), true);
    await item('Close').click();
    assert.equal(await winamp.isVisible(), false);
    assert.equal(
      await page.evaluate(() => window.WindoesApp.state.get().windows.byId.winamp.open),
      false
    );
    console.log(
      'Taskbar menu: pointer, keyboard, states, dismissal, and blank Winamp close passed'
    );
  } finally {
    await browser.close();
    server.close();
  }
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
