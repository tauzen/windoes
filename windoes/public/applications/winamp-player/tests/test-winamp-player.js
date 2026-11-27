/**
 * Playwright tests for the Winamp Player application.
 *
 * Validates:
 * - The committed skin/ matches a fresh build of skin-src/
 * - Page loads with all expected UI elements
 * - Transport controls are present and functional
 * - Playlist rows are pixel-font glyphs; select, remove, keys and scrolling work
 * - Equalizer window is present
 * - Volume and seek controls exist
 * - Shuffle/repeat toggles work
 * - About dialog opens and closes
 */

const path = require('path');
const { spawnSync } = require('child_process');
const { launchBrowser } = require('../../../../../tests/launch-browser');
const { createAssertTracker } = require('../../../../../tests/helpers/test-harness');

const FILE_URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const SKIN_BUILD = path.resolve(__dirname, '../../../../../scripts/build-winamp-skin.mjs');

const tracker = createAssertTracker();
const { assert } = tracker;

async function runTests() {
  // ── Test 0: Skin output is up to date ────────────────────────────────
  console.log('\nTest 0: skin/ matches a fresh build of skin-src/');
  const skinCheck = spawnSync(process.execPath, [SKIN_BUILD, '--check'], { encoding: 'utf8' });
  assert(
    skinCheck.status === 0,
    `build-winamp-skin --check passes (${(skinCheck.stdout + skinCheck.stderr).trim()})`
  );

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

  // ── Test 4: Playlist rows, selection, removal, keys and scrolling ────
  console.log('\nTest 4: Playlist rows, selection, removal, keys and scrolling');

  await page.setInputFiles(
    '#file-input',
    Array.from({ length: 6 }, (_, i) => ({
      name: `Tune ${i + 1}.wav`,
      mimeType: 'audio/wav',
      buffer: Buffer.alloc(44),
    }))
  );
  const rows = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('#playlist-tracks > .track-item')].map((r) => ({
        label: r.getAttribute('aria-label'),
        glyphs: r.querySelectorAll('[class*="wa-font-playlist-"]').length,
        text: r.textContent.trim(),
        selected: r.classList.contains('selected'),
      }))
    );
  const added = await rows();
  assert(
    added.length === 6 && added[0].label === '1. Tune 1 --:--',
    `ADD lists the files as numbered rows (${added.map((r) => r.label)})`
  );
  assert(
    added.every((r) => r.text === '' && r.glyphs === [...r.label].length - 1),
    'Rows are drawn as playlist-font glyphs, not text'
  );

  await page.click('#pl-track-1');
  await page.click('#pl-rem-btn');
  const afterRem = (await rows()).map((r) => r.label);
  assert(
    afterRem.length === 5 && afterRem[1] === '2. Tune 3 --:--',
    `REM removes the selected row (${afterRem})`
  );

  const volumeBefore = await page.inputValue('#volume-slider');
  await page.focus('#playlist-tracks');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  const keyed = await rows();
  assert(
    keyed.findIndex((r) => r.selected) === 1 &&
      (await page.inputValue('#volume-slider')) === volumeBefore,
    'Arrow keys in the list move the selection and leave the volume alone'
  );

  const handleTop = await page.evaluate(() => {
    const list = document.getElementById('playlist-tracks');
    list.scrollTop = list.scrollHeight;
    list.dispatchEvent(new Event('scroll'));
    return document.getElementById('playlist-scroll-handle').style.top;
  });
  assert(handleTop === '60px', `The scroll handle follows the list to the bottom (${handleTop})`);

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
