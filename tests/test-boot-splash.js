/**
 * Playwright tests for the boot splash look.
 *
 * The splash matches the Windows 98 startup screen: the image fills the
 * viewport with square corners, a 10 px colour band scrolls along the bottom,
 * and no progress bar or text shows. With reduced motion the band stands still.
 */

const path = require('path');
const { launchBrowser, startStaticServer } = require('./launch-browser');
const { createAssertTracker } = require('./helpers/test-harness');

const WINDOES_DIR = path.resolve(__dirname, '..', 'windoes');
const VIEWPORT = { width: 800, height: 600 };

const tracker = createAssertTracker();
const { assert } = tracker;

/**
 * Open the shell and wait for the splash. One application document is held
 * back so the preload, and therefore the splash, lasts until `release` runs.
 */
async function openSplash(browser, baseUrl, contextOptions) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, ...contextOptions });
  const page = await ctx.newPage();
  let held = null;
  await page.route(/\/applications\/[^/]+\/index\.html(\?|$)/, (route) => {
    if (held) {
      route.continue().catch(() => {});
      return;
    }
    held = route;
  });
  await page.goto(baseUrl + '/index.html');
  await page.waitForSelector('#bootScreen:not(.hidden)', { timeout: 10000 });
  const release = async () => {
    if (held) await held.continue().catch(() => {});
    await ctx.close();
  };
  return { page, release };
}

/** Read the band's scroll offset twice, `gapMs` apart. */
async function bandOffsets(page, gapMs) {
  const offset = () =>
    page.evaluate(() => {
      const band = document.querySelector('#bootScreen .boot-band');
      return band ? getComputedStyle(band).backgroundPositionX : null;
    });
  const first = await offset();
  await page.waitForTimeout(gapMs);
  return [first, await offset()];
}

async function runTests() {
  const { server, baseUrl } = await startStaticServer(WINDOES_DIR);
  const browser = await launchBrowser();

  try {
    // ── Test 1: full-screen image, band, no bar or text ───────────────────
    console.log('\nTest 1: Splash fills the screen');
    const { page, release } = await openSplash(browser, baseUrl);
    const look = await page.evaluate(() => {
      const screen = document.getElementById('bootScreen');
      const img = screen.querySelector('img');
      const band = screen.querySelector('.boot-band');
      const rect = (el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      };
      const visible = [...screen.querySelectorAll('*')].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
      });
      return {
        text: screen.innerText.trim(),
        visibleCount: visible.length,
        img: img && {
          ...rect(img),
          radius: getComputedStyle(img).borderRadius,
          fit: getComputedStyle(img).objectFit,
          loaded: img.complete && img.naturalWidth > 0,
        },
        band: band && { ...rect(band), image: getComputedStyle(band).backgroundImage },
      };
    });

    assert(look.text === '', `Splash shows no text (got "${look.text}")`);
    assert(
      look.visibleCount === 2,
      `Splash shows only the image and the band (${look.visibleCount} visible elements)`
    );
    assert(
      look.img &&
        look.img.loaded &&
        look.img.x === 0 &&
        look.img.y === 0 &&
        look.img.width === VIEWPORT.width &&
        look.img.height === VIEWPORT.height,
      `Splash image covers the ${VIEWPORT.width}x${VIEWPORT.height} viewport (${JSON.stringify(look.img)})`
    );
    assert(
      look.img && look.img.fit === 'cover',
      `Splash image is scaled to cover (${look.img && look.img.fit})`
    );
    assert(
      look.img && look.img.radius === '0px',
      `Splash image has square corners (${look.img && look.img.radius})`
    );
    assert(
      look.band &&
        look.band.height === 10 &&
        look.band.width === VIEWPORT.width &&
        look.band.y + look.band.height === VIEWPORT.height &&
        look.band.image.startsWith('linear-gradient'),
      `A 10 px colour band runs along the bottom edge (${JSON.stringify(look.band)})`
    );

    const [before, after] = await bandOffsets(page, 400);
    assert(before !== null && before !== after, `Band scrolls (${before} -> ${after})`);
    await release();

    // ── Test 2: reduced motion stops the band ─────────────────────────────
    console.log('\nTest 2: Band stands still with reduced motion');
    const reduced = await openSplash(browser, baseUrl, { reducedMotion: 'reduce' });
    const [still1, still2] = await bandOffsets(reduced.page, 400);
    assert(
      still1 !== null && still1 === still2,
      `Band does not move with prefers-reduced-motion (${still1} -> ${still2})`
    );
    await reduced.release();
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
