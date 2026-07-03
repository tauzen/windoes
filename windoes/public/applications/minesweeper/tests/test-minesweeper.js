/**
 * Playwright tests for the Minesweeper application.
 *
 * Validates:
 * - Page loads with all expected UI elements
 * - Face button is present and clickable
 * - Board renders with correct number of cells for Beginner difficulty
 * - Left-clicking a cell reveals it
 * - Right-clicking a cell flags it
 * - Long-pressing a cell (touch) flags it
 * - Quick tap (touch) reveals a cell
 * - New game (face button) resets the board
 * - Menu system works
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
    window: !!document.getElementById('window'),
    board: !!document.getElementById('board'),
    faceBtn: !!document.getElementById('faceBtn'),
    faceCanvas: !!document.getElementById('faceCanvas'),
    mineCanvas: !!document.getElementById('mineCanvas'),
    timerCanvas: !!document.getElementById('timerCanvas'),
    menuBar: !!document.getElementById('menuBar'),
    gameMenu: !!document.getElementById('gameMenu'),
  }));

  assert(elements.window, 'Window element exists');
  assert(elements.board, 'Board element exists');
  assert(elements.faceBtn, 'Face button exists');
  assert(elements.faceCanvas, 'Face canvas exists');
  assert(elements.mineCanvas, 'Mine counter canvas exists');
  assert(elements.timerCanvas, 'Timer canvas exists');
  assert(elements.menuBar, 'Menu bar exists');

  // ── Test 2: Board has correct cell count for Beginner (8x8 = 64 or 9x9 = 81) ──
  console.log('\nTest 2: Board has cells for default difficulty');

  const cellCount = await page.evaluate(() => document.querySelectorAll('#board .cell').length);
  // Beginner is typically 8x8=64 or 9x9=81
  assert(
    cellCount >= 64 && cellCount <= 81,
    `Board has ${cellCount} cells (expected 64-81 for Beginner)`
  );

  // ── Test 3: All cells start unrevealed ───────────────────────────────
  console.log('\nTest 3: All cells start unrevealed');

  const allUnrevealed = await page.evaluate(() => {
    const cells = document.querySelectorAll('#board .cell');
    return [...cells].every((c) => !c.classList.contains('revealed'));
  });
  assert(allUnrevealed, 'All cells are unrevealed at start');

  // ── Test 4: Left-click reveals a cell ────────────────────────────────
  console.log('\nTest 4: Left-click reveals a cell');

  // Click first cell
  await page.click('#board .cell');
  await page.waitForTimeout(200);

  const revealedCount = await page.evaluate(
    () => document.querySelectorAll('#board .cell.revealed').length
  );
  assert(revealedCount >= 1, `At least 1 cell revealed after click (got: ${revealedCount})`);

  // ── Test 5: Right-click flags an unrevealed cell ─────────────────────
  console.log('\nTest 5: Right-click flags a cell');

  // Reset the board first so we have unrevealed cells
  await page.click('#faceBtn');
  await page.waitForTimeout(300);

  // Right-click the first cell to flag it
  await page.click('#board .cell', { button: 'right' });
  await page.waitForTimeout(100);

  const flagged = await page.evaluate(() => {
    // Check the game state model for a flagged cell
    return state.board.some((row) => row.some((cell) => cell.flagged));
  });
  assert(flagged, 'Right-click flags an unrevealed cell');

  // ── Test 5b: Long-press (touch) flags a cell ─────────────────────────
  console.log('\nTest 5b: Long-press (touch) flags a cell');

  // Reset the board so all cells are unrevealed and unflagged
  await page.click('#faceBtn');
  await page.waitForTimeout(300);

  const dispatchTouch = (selector, type) =>
    page.evaluate(
      ([sel, evType]) => {
        const el = document.querySelector(sel);
        const rect = el.getBoundingClientRect();
        const touch = new Touch({
          identifier: 1,
          target: el,
          clientX: rect.x + rect.width / 2,
          clientY: rect.y + rect.height / 2,
        });
        el.dispatchEvent(
          new TouchEvent(evType, {
            touches: evType === 'touchend' ? [] : [touch],
            targetTouches: evType === 'touchend' ? [] : [touch],
            changedTouches: [touch],
            bubbles: true,
            cancelable: true,
          })
        );
      },
      [selector, type]
    );

  await dispatchTouch('#board .cell', 'touchstart');
  await page.waitForTimeout(600); // longer than the 350ms long-press threshold
  await dispatchTouch('#board .cell', 'touchend');
  await page.waitForTimeout(100);

  const flaggedByTouch = await page.evaluate(() =>
    state.board.some((row) => row.some((cell) => cell.flagged))
  );
  assert(flaggedByTouch, 'Long-press flags an unrevealed cell');

  const revealedByLongPress = await page.evaluate(
    () => document.querySelectorAll('#board .cell.revealed').length
  );
  assert(revealedByLongPress === 0, 'Long-press does not reveal the cell');

  // ── Test 5c: Quick tap (touch) reveals a cell ────────────────────────
  console.log('\nTest 5c: Quick tap (touch) reveals a cell');

  // Tap a different cell (last one on the board) briefly
  await dispatchTouch('#board .cell:last-child', 'touchstart');
  await page.waitForTimeout(100); // well under the long-press threshold
  await dispatchTouch('#board .cell:last-child', 'touchend');
  await page.waitForTimeout(100);

  const revealedByTap = await page.evaluate(
    () => document.querySelectorAll('#board .cell.revealed').length
  );
  assert(revealedByTap >= 1, `Quick tap reveals a cell (revealed: ${revealedByTap})`);

  // ── Test 6: Face button resets the game ──────────────────────────────
  console.log('\nTest 6: Face button resets the game');

  await page.click('#faceBtn');
  await page.waitForTimeout(300);

  const cellCountAfterReset = await page.evaluate(
    () => document.querySelectorAll('#board .cell').length
  );
  assert(cellCountAfterReset >= 64, `Board has cells after reset (got: ${cellCountAfterReset})`);

  const allUnrevealedAfterReset = await page.evaluate(() => {
    const cells = document.querySelectorAll('#board .cell');
    return [...cells].every((c) => !c.classList.contains('revealed'));
  });
  assert(allUnrevealedAfterReset, 'All cells unrevealed after reset');

  // ── Test 7: Game menu opens and has expected options ─────────────────
  console.log('\nTest 7: Game menu has expected options');

  const menuOptions = await page.evaluate(() => ({
    menuNew: !!document.getElementById('menuNew'),
    menuBeginner: !!document.getElementById('menuBeginner'),
    menuIntermediate: !!document.getElementById('menuIntermediate'),
    menuExpert: !!document.getElementById('menuExpert'),
    menuCustom: !!document.getElementById('menuCustom'),
    menuBestTimes: !!document.getElementById('menuBestTimes'),
  }));

  assert(menuOptions.menuNew, 'New game menu option exists');
  assert(menuOptions.menuBeginner, 'Beginner option exists');
  assert(menuOptions.menuIntermediate, 'Intermediate option exists');
  assert(menuOptions.menuExpert, 'Expert option exists');
  assert(menuOptions.menuCustom, 'Custom option exists');
  assert(menuOptions.menuBestTimes, 'Best Times option exists');

  // ── Test 8: Changing difficulty changes board size ────────────────────
  console.log('\nTest 8: Intermediate difficulty changes board size');

  await page.click('#gameMenu');
  await page.waitForTimeout(100);
  await page.click('#menuIntermediate');
  await page.waitForTimeout(300);

  const intermediateCells = await page.evaluate(
    () => document.querySelectorAll('#board .cell').length
  );
  // Intermediate is 16x16 = 256
  assert(intermediateCells === 256, `Intermediate board has 256 cells (got: ${intermediateCells})`);

  await browser.close();

  // ── Summary ──────────────────────────────────────────────────────────
  tracker.exitWithSummary();
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
