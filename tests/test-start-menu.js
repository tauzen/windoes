// The Start menu opens submenus like Windows 98: only after the pointer rests
// 400 ms on an item, without closing the open submenu when the pointer merely
// crosses another item. Click and keyboard still open submenus at once.
const assert = require('node:assert/strict');
const path = require('node:path');
const { launchBrowser, startStaticServer } = require('./launch-browser');
const { waitForBoot } = require('./helpers/test-harness');

async function run() {
  const { server, baseUrl } = await startStaticServer(path.resolve(__dirname, '..', 'windoes'));
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  const isOpen = (id) =>
    page.evaluate((el) => document.getElementById(el).classList.contains('open'), id);
  const focusedId = () => page.evaluate(() => document.activeElement?.id);
  const desktop = () => page.mouse.move(800, 200);
  try {
    await waitForBoot(page, baseUrl);
    await page.click('#startButton');

    await page.hover('#menuPrograms');
    await page.waitForTimeout(200);
    assert.equal(await isOpen('programsSubmenu'), false, 'Programs is closed at 200 ms of hover');
    await page.waitForTimeout(300);
    assert.equal(await isOpen('programsSubmenu'), true, 'Programs is open at 500 ms of hover');

    await page.hover('#menuHelp');
    await page.waitForTimeout(150);
    await page.hover('#subNotepad');
    await page.waitForTimeout(500);
    assert.equal(await isOpen('programsSubmenu'), true, 'Crossing Help keeps Programs open');

    await page.hover('#menuHelp');
    await page.waitForTimeout(500);
    assert.equal(await isOpen('programsSubmenu'), false, 'Resting on Help closes Programs');

    await page.hover('#menuPrograms');
    await page.waitForTimeout(150);
    await desktop();
    await page.waitForTimeout(500);
    assert.equal(await isOpen('programsSubmenu'), false, 'Leaving the menu cancels the open');
    assert.equal(await isOpen('startMenu'), true, 'Leaving the menu keeps the Start menu open');

    await page.click('#menuPrograms');
    await page.waitForTimeout(50);
    assert.equal(await isOpen('programsSubmenu'), true, 'Clicking Programs opens it at once');

    await desktop();
    await page.keyboard.press('Escape');
    assert.equal(await isOpen('startMenu'), false, 'Escape closes the Start menu');

    await page.click('#startButton');
    await desktop();
    await page.keyboard.press('ArrowDown');
    assert.equal(await focusedId(), 'menuWindoesUpdate', 'ArrowDown enters the menu');
    await page.keyboard.press('ArrowDown');
    assert.equal(await focusedId(), 'menuPrograms', 'ArrowDown moves to Programs');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(50);
    assert.equal(await isOpen('programsSubmenu'), true, 'ArrowRight opens Programs at once');
    assert.equal(await focusedId(), 'subGames', 'ArrowRight focuses the first Programs item');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(50);
    assert.equal(await isOpen('gamesSubmenu'), true, 'Enter opens Games at once');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(50);
    assert.equal(await isOpen('gamesSubmenu'), false, 'ArrowLeft closes Games');
    assert.equal(await focusedId(), 'subGames', 'ArrowLeft returns focus to Games');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(50);
    assert.equal(await isOpen('startMenu'), false, 'Escape in a submenu closes the Start menu');
    assert.equal(await focusedId(), 'startButton', 'Escape returns focus to the Start button');

    console.log('Start menu: hover delay, crossing, click, and keyboard passed');
  } finally {
    await browser.close();
    server.close();
  }
}
run().catch((error) => {
  console.error(error);
  process.exit(1);
});
