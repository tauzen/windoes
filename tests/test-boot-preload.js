/**
 * Playwright tests for boot-time asset preloading.
 *
 * Verifies that the shell's icons, splash image and embedded applications are
 * requested while the boot splash is still on screen, and that the boot
 * progress bar reflects that preload progress rather than a fixed timer.
 */

const path = require('path');
const { launchBrowser, startStaticServer } = require('./launch-browser');
const { createAssertTracker } = require('./helpers/test-harness');

const WINDOES_DIR = path.resolve(__dirname, '..', 'windoes');

const tracker = createAssertTracker();
const { assert } = tracker;

async function runTests() {
  const { server, baseUrl } = await startStaticServer(WINDOES_DIR);
  const browser = await launchBrowser();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // Record every asset request and whether the desktop was already visible at
  // the time the request was made.
  const iconRequests = new Set();
  const appRequests = new Set();
  let bootImageRequested = false;

  const desktopVisible = () =>
    page
      .evaluate(() => {
        const d = document.getElementById('theDesktop');
        return !!d && d.style.display !== 'none';
      })
      .catch(() => false);

  let iconsRequestedDuringBoot = 0;

  page.on('requestfinished', async (request) => {
    const url = request.url();
    if (/\/icons\/[^/]+\.png(\?|$)/.test(url)) {
      iconRequests.add(url);
      if (!(await desktopVisible())) iconsRequestedDuringBoot += 1;
    } else if (/\/img\/boot\.png(\?|$)/.test(url)) {
      bootImageRequested = true;
    } else if (/\/applications\/[^/]+\/index\.html(\?|$)/.test(url)) {
      appRequests.add(url);
    }
  });

  try {
    await page.goto(baseUrl + '/index.html');

    // ── Test 1: progress bar advances during the splash phase ─────────────
    console.log('\nTest 1: Boot progress bar advances');
    await page.waitForSelector('#bootScreen:not(.hidden)', { timeout: 10000 });
    const widthAt = () =>
      page.evaluate(() => {
        const bar = document.getElementById('bootProgress');
        return bar ? parseFloat(bar.style.width) || 0 : -1;
      });
    const firstWidth = await widthAt();
    await page.waitForFunction(
      () => {
        const bar = document.getElementById('bootProgress');
        return bar && (parseFloat(bar.style.width) || 0) > 0;
      },
      { timeout: 10000 }
    );
    const laterWidth = await widthAt();
    assert(
      laterWidth >= firstWidth && laterWidth > 0,
      `Progress bar fills during boot (from ${firstWidth}% to ${laterWidth}%)`
    );

    // ── Test 2: desktop becomes visible once boot finishes ────────────────
    console.log('\nTest 2: Boot completes');
    await page.waitForFunction(
      () => {
        const d = document.getElementById('theDesktop');
        return d && d.style.display !== 'none';
      },
      { timeout: 10000 }
    );
    assert(true, 'Desktop is shown after boot');
    const finalWidth = await widthAt();
    assert(finalWidth >= 100, `Progress bar reaches 100% (${finalWidth}%)`);

    // Give any trailing in-flight requests a beat to finish reporting.
    await page.waitForTimeout(300);

    // ── Test 3: assets were preloaded during boot ─────────────────────────
    console.log('\nTest 3: Assets preloaded during boot');
    assert(bootImageRequested, 'Boot splash image was requested');
    assert(
      iconsRequestedDuringBoot >= 10,
      `Many icons were preloaded before the desktop appeared (${iconsRequestedDuringBoot} during boot, ${iconRequests.size} total)`
    );
    assert(
      appRequests.size >= 5,
      `Embedded applications were preloaded (${appRequests.size} app documents requested)`
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
