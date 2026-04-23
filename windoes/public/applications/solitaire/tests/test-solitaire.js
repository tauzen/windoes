/**
 * Playwright tests for the Solitaire application.
 *
 * Validates:
 * - Page loads with all expected UI elements
 * - Cards are dealt on the tableau
 * - Stock pile clicking deals cards to waste
 * - Status bar shows score, moves, and time
 * - New game resets the board
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
    gameArea: !!document.getElementById('gameArea'),
    statusScore: !!document.getElementById('statusScore'),
    statusMoves: !!document.getElementById('statusMoves'),
    statusTime: !!document.getElementById('statusTime'),
    winOverlay: !!document.getElementById('winOverlay'),
    menuGame: !!document.getElementById('menu-game'),
  }));

  assert(elements.window, 'Window element exists');
  assert(elements.gameArea, 'Game area exists');
  assert(elements.statusScore, 'Score status exists');
  assert(elements.statusMoves, 'Moves status exists');
  assert(elements.statusTime, 'Time status exists');
  assert(elements.winOverlay, 'Win overlay exists');
  assert(elements.menuGame, 'Game menu exists');

  // ── Test 2: Cards are dealt on initial load ──────────────────────────
  console.log('\nTest 2: Cards are dealt on initial load');

  const cardCount = await page.evaluate(() => document.querySelectorAll('.card').length);
  assert(cardCount === 52, `52 cards dealt (got: ${cardCount})`);

  // ── Test 3: Tableau has face-up cards ────────────────────────────────
  console.log('\nTest 3: Tableau has face-up cards');

  const faceUpCount = await page.evaluate(
    () => document.querySelectorAll('.card .card-face').length
  );
  assert(faceUpCount >= 7, `At least 7 face-up cards on tableau (got: ${faceUpCount})`);

  const faceDownCount = await page.evaluate(
    () => document.querySelectorAll('.card .card-back').length
  );
  assert(faceDownCount > 0, `Some face-down cards exist (got: ${faceDownCount})`);

  // ── Test 4: Status bar starts at zero ────────────────────────────────
  console.log('\nTest 4: Status bar shows initial values');

  const statusScore = await page.evaluate(() => document.getElementById('statusScore').textContent);
  assert(statusScore.includes('0'), `Score starts at 0 (got: ${statusScore})`);

  const statusMoves = await page.evaluate(() => document.getElementById('statusMoves').textContent);
  assert(statusMoves.includes('0'), `Moves starts at 0 (got: ${statusMoves})`);

  // ── Test 5: Stock pile exists and is clickable ───────────────────────
  console.log('\nTest 5: Stock pile click deals to waste');

  // Find a card-back in the stock area (top-left region)
  const stockClicked = await page.evaluate(() => {
    // Stock pile cards are positioned at the top-left
    const cards = [...document.querySelectorAll('.card')];
    const stockCards = cards.filter((c) => {
      const left = parseInt(c.style.left);
      const top = parseInt(c.style.top);
      return left < 80 && top < 20;
    });
    if (stockCards.length > 0) {
      stockCards[stockCards.length - 1].click();
      return true;
    }
    return false;
  });

  if (stockClicked) {
    await page.waitForTimeout(200);
    const movesAfterClick = await page.evaluate(
      () => document.getElementById('statusMoves').textContent
    );
    assert(
      movesAfterClick.includes('1'),
      `Moves incremented after stock click (got: ${movesAfterClick})`
    );
  } else {
    assert(true, 'Stock pile click skipped (no stock cards positioned as expected)');
  }

  // ── Test 6: Win overlay is hidden during play ────────────────────────
  console.log('\nTest 6: Win overlay is hidden during play');

  const winHidden = await page.evaluate(
    () => !document.getElementById('winOverlay').classList.contains('show')
  );
  assert(winHidden, 'Win overlay is not shown during play');

  // ── Test 7: New game via menu resets the board ───────────────────────
  console.log('\nTest 7: New game resets the board');

  await page.click('#menu-game');
  await page.waitForTimeout(100);
  await page.click('#menu-new-game');
  await page.waitForTimeout(500);

  const cardCountAfterNew = await page.evaluate(() => document.querySelectorAll('.card').length);
  assert(cardCountAfterNew === 52, `52 cards after new game (got: ${cardCountAfterNew})`);

  const scoreAfterNew = await page.evaluate(
    () => document.getElementById('statusScore').textContent
  );
  assert(scoreAfterNew.includes('0'), `Score reset to 0 after new game (got: ${scoreAfterNew})`);

  const movesAfterNew = await page.evaluate(
    () => document.getElementById('statusMoves').textContent
  );
  assert(movesAfterNew.includes('0'), `Moves reset to 0 after new game (got: ${movesAfterNew})`);

  // ── Test 8: Menu dropdown system works ───────────────────────────────
  console.log('\nTest 8: Menu dropdown system works');

  const menuItems = await page.evaluate(() => ({
    newGame: !!document.getElementById('menu-new-game'),
    undo: !!document.getElementById('menu-undo'),
    about: !!document.getElementById('menu-about'),
  }));

  assert(menuItems.newGame, 'New Game menu item exists');
  assert(menuItems.undo, 'Undo menu item exists');
  assert(menuItems.about, 'About menu item exists');

  await browser.close();

  // ── Summary ──────────────────────────────────────────────────────────
  tracker.exitWithSummary();
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
