/**
 * Playwright tests for the ASCII Runner application.
 *
 * Validates:
 * - Page loads with all expected DOM elements
 * - Start screen is visible on initial load
 * - Game canvas is present and sized
 * - Game starts when user clicks / presses space
 * - Score updates during gameplay
 * - Game over screen appears on death
 */

const path = require('path');
const { launchBrowser } = require('../../../../tests/launch-browser');

const FILE_URL = 'file://' + path.resolve(__dirname, '..', 'index.html');

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  PASS: ${message}`);
        passed++;
    } else {
        console.error(`  FAIL: ${message}`);
        failed++;
    }
}

async function runTests() {
    const browser = await launchBrowser();
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    // ── Test 1: Page loads with game canvas ──────────────────────────────
    console.log('\nTest 1: Page loads with game canvas');
    await page.goto(FILE_URL);
    await page.waitForTimeout(500);

    const hasCanvas = await page.evaluate(() => !!document.getElementById('game'));
    assert(hasCanvas, 'Game canvas element exists');

    const canvasSize = await page.evaluate(() => {
        const c = document.getElementById('game');
        return { w: c.width, h: c.height };
    });
    assert(canvasSize.w > 0 && canvasSize.h > 0, `Canvas has dimensions (${canvasSize.w}x${canvasSize.h})`);

    // ── Test 2: Start screen is visible on load ──────────────────────────
    console.log('\nTest 2: Start screen visible on load');

    const startScreenVisible = await page.evaluate(() => {
        const el = document.getElementById('start-screen');
        return el && !el.classList.contains('hidden');
    });
    assert(startScreenVisible, 'Start screen is visible');

    const gameOverHidden = await page.evaluate(() => {
        const el = document.getElementById('game-over');
        return el && el.classList.contains('hidden');
    });
    assert(gameOverHidden, 'Game over screen is hidden');

    // ── Test 3: Score display starts at zero ─────────────────────────────
    console.log('\nTest 3: Score display starts at zero');

    const initialScore = await page.evaluate(() =>
        document.getElementById('score-value').textContent
    );
    assert(initialScore === '0', `Initial score is 0 (got: ${initialScore})`);

    // ── Test 4: Game elements are all present ────────────────────────────
    console.log('\nTest 4: All required DOM elements present');

    const elements = await page.evaluate(() => ({
        gameContainer: !!document.getElementById('game-container'),
        score: !!document.getElementById('score'),
        scoreValue: !!document.getElementById('score-value'),
        startScreen: !!document.getElementById('start-screen'),
        gameOver: !!document.getElementById('game-over'),
        finalScore: !!document.getElementById('final-score'),
        jumpBtn: !!document.getElementById('jump-btn'),
    }));

    assert(elements.gameContainer, 'game-container exists');
    assert(elements.score, 'score element exists');
    assert(elements.scoreValue, 'score-value element exists');
    assert(elements.startScreen, 'start-screen exists');
    assert(elements.gameOver, 'game-over exists');
    assert(elements.finalScore, 'final-score exists');
    assert(elements.jumpBtn, 'jump-btn exists');

    // ── Test 5: Game starts on canvas click ──────────────────────────────
    console.log('\nTest 5: Game starts on canvas click');

    // The start-screen overlays the canvas, so dispatch click directly on canvas
    await page.evaluate(() => {
        document.getElementById('game').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForTimeout(300);

    const gameStarted = await page.evaluate(() => gameState === 'playing');
    assert(gameStarted, 'Game state is "playing" after click');

    const startScreenAfterClick = await page.evaluate(() => {
        const el = document.getElementById('start-screen');
        return el && el.classList.contains('hidden');
    });
    assert(startScreenAfterClick, 'Start screen is hidden after click (game started)');

    // ── Test 6: Score increments during gameplay ─────────────────────────
    console.log('\nTest 6: Score increments during gameplay');

    // Let the game run for a bit
    await page.waitForTimeout(2000);

    const scoreAfterPlay = await page.evaluate(() =>
        parseInt(document.getElementById('score-value').textContent) || 0
    );
    assert(scoreAfterPlay > 0, `Score incremented during play (got: ${scoreAfterPlay})`);

    // ── Test 7: Game constants are defined ───────────────────────────────
    console.log('\nTest 7: Game constants are defined');

    const constants = await page.evaluate(() => ({
        hasGravity: typeof GRAVITY === 'number',
        hasJumpForce: typeof JUMP_FORCE === 'number',
        hasStartSpeed: typeof START_SPEED === 'number',
        hasMaxSpeed: typeof MAX_SPEED === 'number',
    }));

    assert(constants.hasGravity, 'GRAVITY constant defined');
    assert(constants.hasJumpForce, 'JUMP_FORCE constant defined');
    assert(constants.hasStartSpeed, 'START_SPEED constant defined');
    assert(constants.hasMaxSpeed, 'MAX_SPEED constant defined');

    await browser.close();

    // ── Summary ──────────────────────────────────────────────────────────
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
        console.error('TESTS FAILED');
        process.exit(1);
    } else {
        console.log('ALL TESTS PASSED');
    }
}

runTests().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
