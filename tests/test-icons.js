/**
 * Playwright tests for icon visibility.
 *
 * Validates that start menu icons and window titlebar icons
 * load correctly (regression test for Vite migration path issue).
 */

const path = require('path');
const { launchBrowser, startStaticServer } = require('./launch-browser');
const { createAssertTracker, waitForBoot } = require('./helpers/test-harness');

const WINDOES_DIR = path.resolve(__dirname, '..', 'windoes');

const tracker = createAssertTracker();
const { assert } = tracker;

/**
 * Check that a CSS background-image on an element loaded successfully
 * by verifying it has a non-zero natural size.
 */
async function hasLoadedBackgroundImage(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { found: false, reason: 'element not found' };

    const style = window.getComputedStyle(el);
    const bgImage = style.backgroundImage;
    if (!bgImage || bgImage === 'none') {
      return { found: false, reason: 'no background-image set' };
    }

    // Extract the URL from the background-image value
    const match = bgImage.match(/url\("?([^"]*)"?\)/);
    if (!match) return { found: false, reason: `unexpected format: ${bgImage}` };

    const url = match[1];
    // For data: URIs, consider them always loaded
    if (url.startsWith('data:')) return { found: true, url: 'data:...' };

    // For file URLs, try to fetch and verify they load
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () =>
        resolve({ found: true, url, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ found: false, reason: `failed to load: ${url}` });
      img.src = url;
    });
  }, selector);
}

async function runTests() {
  const { server, baseUrl } = await startStaticServer(WINDOES_DIR);
  const browser = await launchBrowser();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  try {
    // ── Test 1: Window titlebar icons load ───────────────────────────────
    console.log('\nTest 1: Window titlebar icons load');
    await waitForBoot(page, baseUrl);

    // Open My Computer window
    await page.dblclick('#iconMyComputer');
    await page.waitForTimeout(300);

    const myComputerIcon = await hasLoadedBackgroundImage(
      page,
      '#myComputerWindow .titlelogo-mycomputer'
    );
    assert(
      myComputerIcon.found,
      `My Computer titlebar icon loads (${myComputerIcon.reason || myComputerIcon.url})`
    );

    // Open Minesweeper
    await page.dblclick('#iconMinesweeper');
    await page.waitForTimeout(300);

    const minesweeperIcon = await hasLoadedBackgroundImage(
      page,
      '#minesweeperWindow .titlelogo-minesweeper'
    );
    assert(
      minesweeperIcon.found,
      `Minesweeper titlebar icon loads (${minesweeperIcon.reason || minesweeperIcon.url})`
    );

    // Close all windows
    await page.click('#minesweeperCloseBtn');
    await page.evaluate(() => {
      const btn = document.querySelector('#myComputerWindow .close-btn');
      if (btn) btn.click();
    });
    await page.waitForTimeout(200);

    // ── Test 2: Start menu icons load ────────────────────────────────────
    console.log('\nTest 2: Start menu icons load');

    // Open start menu
    await page.click('#startButton');
    await page.waitForTimeout(300);

    const menuIconTests = [
      { selector: '.menu-icon-winupdate', name: 'Windoes Update' },
      { selector: '.menu-icon-programs', name: 'Programs' },
      { selector: '.menu-icon-help', name: 'Help' },
      { selector: '.menu-icon-run', name: 'Run' },
      { selector: '.menu-icon-shutdown', name: 'Shut Down' },
    ];

    for (const { selector, name } of menuIconTests) {
      const result = await hasLoadedBackgroundImage(page, selector);
      assert(result.found, `Start menu "${name}" icon loads (${result.reason || result.url})`);
    }

    // ── Test 3: Programs submenu icons load ──────────────────────────────
    console.log('\nTest 3: Programs submenu icons load');

    // Hover over Programs to open submenu
    await page.hover('#menuPrograms');
    await page.waitForTimeout(300);

    const submenuIconTests = [
      { selector: '.submenu-icon-ie', name: 'Internet Explorer' },
      { selector: '.submenu-icon-folder', name: 'Folder' },
      { selector: '.submenu-icon-msdos', name: 'MS-DOS Prompt' },
      { selector: '.submenu-icon-outlook', name: 'Outlook Express' },
    ];

    for (const { selector, name } of submenuIconTests) {
      const result = await hasLoadedBackgroundImage(page, selector);
      assert(result.found, `Submenu "${name}" icon loads (${result.reason || result.url})`);
    }

    // ── Test 4: Taskbar icons load ───────────────────────────────────────
    console.log('\nTest 4: Taskbar icons load after opening windows');

    // Close start menu by clicking desktop
    await page.click('#theDesktop');
    await page.waitForTimeout(200);

    // Open My Computer and check taskbar icon
    await page.dblclick('#iconMyComputer');
    await page.waitForTimeout(300);

    const taskMyComputer = await hasLoadedBackgroundImage(page, '.task-icon-mycomputer');
    assert(
      taskMyComputer.found,
      `Taskbar My Computer icon loads (${taskMyComputer.reason || taskMyComputer.url})`
    );

    // Open Winamp and check taskbar icon
    await page.dblclick('#iconWinamp');
    await page.waitForTimeout(300);

    const taskWinamp = await hasLoadedBackgroundImage(page, '.task-icon-winamp');
    assert(taskWinamp.found, `Taskbar Winamp icon loads (${taskWinamp.reason || taskWinamp.url})`);
  } finally {
    await browser.close();
    server.close();
  }

  // ── Summary ───────────────────────────────────────────────────────────
  tracker.exitWithSummary();
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
