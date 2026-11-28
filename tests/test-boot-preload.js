/**
 * Playwright tests for boot-time asset preloading.
 *
 * Verifies that the shell's icons, splash image and embedded applications are
 * requested while the boot splash is still on screen, and that the splash
 * stays up until that preload has settled: one held application document keeps
 * the desktop hidden, and releasing it lets boot finish.
 */

const path = require('path');
const { launchBrowser, startStaticServer } = require('./launch-browser');
const { createAssertTracker } = require('./helpers/test-harness');

const WINDOES_DIR = path.resolve(__dirname, '..', 'windoes');

// Longer than the shortest splash time (BOOT_SPLASH_MIN_MS, 2 s), so only the
// held preload request can still be keeping the splash on screen.
const HOLD_MS = 4000;

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
  const splashVisible = () =>
    page.evaluate(() => {
      const s = document.getElementById('bootScreen');
      return !!s && !s.classList.contains('hidden');
    });

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

  // Hold the first application document the preload asks for.
  /** @type {import('playwright').Route | null} */
  let heldRoute = null;
  let heldResolve = () => {};
  const held = new Promise((resolve) => (heldResolve = resolve));
  await page.route(/\/applications\/[^/]+\/index\.html(\?|$)/, (route) => {
    if (heldRoute) {
      route.continue().catch(() => {});
      return;
    }
    heldRoute = route;
    heldResolve();
  });

  try {
    await page.goto(baseUrl + '/index.html');

    // ── Test 1: an unfinished preload keeps the splash up ─────────────────
    console.log('\nTest 1: Splash waits for the preload');
    await page.waitForSelector('#bootScreen:not(.hidden)', { timeout: 10000 });
    await held;
    await page.waitForTimeout(HOLD_MS);
    assert(
      (await splashVisible()) && !(await desktopVisible()),
      `Splash stays and desktop stays hidden while one preload request is held for ${HOLD_MS} ms`
    );

    // ── Test 2: settling the preload ends boot ────────────────────────────
    console.log('\nTest 2: Boot completes once the preload settles');
    await heldRoute.continue();
    heldRoute = null;
    await page.waitForFunction(
      () => {
        const d = document.getElementById('theDesktop');
        return d && d.style.display !== 'none';
      },
      { timeout: 10000 }
    );
    assert(!(await splashVisible()), 'Desktop is shown and the splash is gone after the preload');

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
    if (heldRoute) await heldRoute.continue().catch(() => {});
    await browser.close();
    server.close();
  }

  tracker.exitWithSummary();
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
