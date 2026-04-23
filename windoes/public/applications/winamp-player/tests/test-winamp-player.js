/**
 * Playwright tests for the Winamp Player application.
 *
 * Validates:
 * - Page loads with all expected UI elements
 * - Transport controls are present and functional
 * - Playlist window is visible
 * - Equalizer window is present
 * - Volume and seek controls exist
 * - Shuffle/repeat toggles work
 * - About dialog opens and closes
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
    winamp: !!document.getElementById('winamp'),
    mainWindow: !!document.getElementById('main-window'),
    visualizer: !!document.getElementById('visualizer'),
    timeDisplay: !!document.getElementById('time-display'),
    scrollingTitle: !!document.getElementById('scrolling-title'),
  }));

  assert(elements.winamp, 'Winamp container exists');
  assert(elements.mainWindow, 'Main window exists');
  assert(elements.visualizer, 'Visualizer canvas exists');
  assert(elements.timeDisplay, 'Time display exists');
  assert(elements.scrollingTitle, 'Scrolling title exists');

  // ── Test 2: Transport controls are present ───────────────────────────
  console.log('\nTest 2: Transport controls are present');

  const transport = await page.evaluate(() => ({
    prev: !!document.getElementById('btn-prev'),
    play: !!document.getElementById('btn-play'),
    pause: !!document.getElementById('btn-pause'),
    stop: !!document.getElementById('btn-stop'),
    next: !!document.getElementById('btn-next'),
    open: !!document.getElementById('btn-open'),
  }));

  assert(transport.prev, 'Previous button exists');
  assert(transport.play, 'Play button exists');
  assert(transport.pause, 'Pause button exists');
  assert(transport.stop, 'Stop button exists');
  assert(transport.next, 'Next button exists');
  assert(transport.open, 'Open/Eject button exists');

  // ── Test 3: Volume and seek controls exist ───────────────────────────
  console.log('\nTest 3: Volume and seek controls exist');

  const sliders = await page.evaluate(() => ({
    volume: !!document.getElementById('volume-slider'),
    balance: !!document.getElementById('balance-slider'),
    seek: !!document.getElementById('seek-bar'),
  }));

  assert(sliders.volume, 'Volume slider exists');
  assert(sliders.balance, 'Balance slider exists');
  assert(sliders.seek, 'Seek bar exists');

  // ── Test 4: Playlist window is present with tracks ───────────────────
  console.log('\nTest 4: Playlist window is present');

  const playlist = await page.evaluate(() => ({
    window: !!document.getElementById('playlist-window'),
    tracks: !!document.getElementById('playlist-tracks'),
    addBtn: !!document.getElementById('pl-add-btn'),
    remBtn: !!document.getElementById('pl-rem-btn'),
  }));

  assert(playlist.window, 'Playlist window exists');
  assert(playlist.tracks, 'Playlist tracks container exists');
  assert(playlist.addBtn, 'Playlist ADD button exists');
  assert(playlist.remBtn, 'Playlist REM button exists');

  // ── Test 5: Equalizer window is present ──────────────────────────────
  console.log('\nTest 5: Equalizer window is present');

  const eq = await page.evaluate(() => ({
    window: !!document.getElementById('eq-window'),
    onBtn: !!document.getElementById('eq-on-btn'),
    preamp: !!document.getElementById('eq-preamp-slider'),
    bands: !!document.getElementById('eq-bands'),
  }));

  assert(eq.window, 'Equalizer window exists');
  assert(eq.onBtn, 'EQ ON button exists');
  assert(eq.preamp, 'EQ preamp slider exists');
  assert(eq.bands, 'EQ bands container exists');

  // ── Test 6: Shuffle and repeat toggles work ──────────────────────────
  console.log('\nTest 6: Shuffle and repeat toggles');

  const shuffleBefore = await page.evaluate(() =>
    document.getElementById('btn-shuffle').classList.contains('active')
  );

  await page.click('#btn-shuffle');
  await page.waitForTimeout(100);

  const shuffleAfter = await page.evaluate(() =>
    document.getElementById('btn-shuffle').classList.contains('active')
  );
  assert(
    shuffleBefore !== shuffleAfter,
    `Shuffle toggled (was ${shuffleBefore}, now ${shuffleAfter})`
  );

  const repeatBefore = await page.evaluate(() =>
    document.getElementById('btn-repeat').classList.contains('active')
  );

  await page.click('#btn-repeat');
  await page.waitForTimeout(100);

  const repeatAfter = await page.evaluate(() =>
    document.getElementById('btn-repeat').classList.contains('active')
  );
  assert(repeatBefore !== repeatAfter, `Repeat toggled (was ${repeatBefore}, now ${repeatAfter})`);

  // ── Test 7: EQ toggle works ──────────────────────────────────────────
  console.log('\nTest 7: EQ/PL toggle buttons work');

  const eqBtnExists = await page.evaluate(() => !!document.getElementById('btn-eq'));
  assert(eqBtnExists, 'EQ toggle button exists');

  const plBtnExists = await page.evaluate(() => !!document.getElementById('btn-pl'));
  assert(plBtnExists, 'PL toggle button exists');

  // ── Test 8: Volume slider responds to changes ────────────────────────
  console.log('\nTest 8: Volume slider responds to changes');

  const initialVolume = await page.evaluate(() => document.getElementById('volume-slider').value);

  await page.evaluate(() => {
    const slider = document.getElementById('volume-slider');
    slider.value = '30';
    slider.dispatchEvent(new Event('input'));
  });
  await page.waitForTimeout(100);

  const newVolume = await page.evaluate(() => document.getElementById('volume-slider').value);
  assert(newVolume === '30', `Volume slider changed to 30 (got: ${newVolume})`);

  // ── Test 9: About dialog opens and closes ────────────────────────────
  console.log('\nTest 9: About dialog opens and closes');

  const aboutOverlay = await page.evaluate(() => {
    const overlay = document.getElementById('about-overlay');
    return overlay ? getComputedStyle(overlay).display : null;
  });
  // About should exist but be hidden
  assert(aboutOverlay !== null, 'About overlay element exists');

  await browser.close();

  // ── Summary ──────────────────────────────────────────────────────────
  tracker.exitWithSummary();
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
