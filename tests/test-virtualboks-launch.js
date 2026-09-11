/**
 * Playwright test for launching VirtualBoks from the Windoes shell.
 *
 * The application itself is covered by its own suite under
 * `windoes/public/applications/virtualboks/tests/`. This one checks the shell
 * wiring around it: the desktop icon, the Programs menu entry, the Run verb,
 * the task button, and that each route opens exactly one window pointing at
 * the application.
 */

const path = require('path');
const { launchBrowser, startStaticServer } = require('./launch-browser');
const { createAssertTracker, waitForBoot } = require('./helpers/test-harness');

const WINDOES_DIR = path.resolve(__dirname, '..', 'windoes');

const tracker = createAssertTracker();
const { assert } = tracker;

async function visibleWindowIds(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('.window')]
      .filter((w) => !w.classList.contains('hidden'))
      .map((w) => w.id)
  );
}

async function closeVirtualBoks(page) {
  await page.click('#virtualboksCloseBtn');
  await page.waitForTimeout(200);
}

async function runTests() {
  const { server, baseUrl } = await startStaticServer(WINDOES_DIR);
  const browser = await launchBrowser();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  try {
    // ── Test 1: The desktop icon opens exactly one window ────────────────
    console.log('\nTest 1: The desktop icon opens exactly one window');
    await waitForBoot(page, baseUrl);

    assert((await visibleWindowIds(page)).length === 0, 'No windows are open after boot');
    assert(await page.isVisible('#iconVirtualBoks'), 'The VirtualBoks desktop icon is visible');

    await page.dblclick('#iconVirtualBoks');
    await page.waitForTimeout(400);

    const opened = await visibleWindowIds(page);
    assert(
      opened.length === 1 && opened[0] === 'virtualboksWindow',
      `Exactly one VirtualBoks window opens (got ${opened.length}: ${opened})`
    );

    // ── Test 2: The window frames the application ────────────────────────
    console.log('\nTest 2: The window frames the application');
    const frameSrc = await page.getAttribute('#virtualboksFrame', 'src');
    assert(
      String(frameSrc).includes('applications/virtualboks/index.html'),
      `The window frames the VirtualBoks document (got ${frameSrc})`
    );

    const appFrame = page.frame({ url: /applications\/virtualboks\/index\.html/ });
    assert(Boolean(appFrame), 'The application document is loaded in the frame');
    await appFrame.waitForSelector('.vm-item');
    const machineCount = await appFrame.$$eval('.vm-item', (items) => items.length);
    assert(machineCount > 0, `The machine manager rendered inside the shell (${machineCount})`);

    assert(await page.isVisible('#virtualboksTaskBtn'), 'A taskbar button appears for the window');

    // ── Test 3: Closing releases the window ──────────────────────────────
    console.log('\nTest 3: Closing releases the window');
    await closeVirtualBoks(page);
    assert((await visibleWindowIds(page)).length === 0, 'Closing hides the VirtualBoks window');

    // ── Test 4: The Programs menu opens it ───────────────────────────────
    console.log('\nTest 4: The Programs menu opens it');
    await page.click('#startButton');
    await page.hover('#menuPrograms');
    await page.waitForSelector('#subVirtualBoks', { state: 'visible' });
    await page.click('#subVirtualBoks');
    await page.waitForTimeout(400);

    const fromMenu = await visibleWindowIds(page);
    assert(
      fromMenu.length === 1 && fromMenu[0] === 'virtualboksWindow',
      `Programs > VirtualBoks opens exactly one window (got ${fromMenu})`
    );
    await closeVirtualBoks(page);

    // ── Test 5: The Run dialog opens it ──────────────────────────────────
    console.log('\nTest 5: The Run dialog opens it');
    await page.click('#startButton');
    await page.click('#menuRun');
    await page.waitForSelector('#runInput', { state: 'visible' });
    await page.fill('#runInput', 'virtualboks.exe');
    await page.click('#runOkBtn');
    await page.waitForTimeout(400);

    const fromRun = await visibleWindowIds(page);
    assert(
      fromRun.length === 1 && fromRun[0] === 'virtualboksWindow',
      `Run "virtualboks.exe" opens exactly one window (got ${fromRun})`
    );
  } finally {
    await ctx.close();
    await browser.close();
    server.close();
  }
}

runTests()
  .then(() => tracker.exitWithSummary())
  .catch((error) => {
    console.error('Test run failed:', error);
    process.exit(1);
  });
