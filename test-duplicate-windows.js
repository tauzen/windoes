/**
 * Playwright test to verify that Minesweeper and Winamp icons
 * do NOT open duplicate windows.
 *
 * Bug: clicking the icon was opening both the generic appWindow
 * AND the dedicated winampWindow/minesweeperWindow simultaneously.
 */

const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');

const FILE_URL = 'file://' + path.resolve(__dirname, 'index.html');
const BOOT_TIMEOUT = 10000;

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

async function getVisibleWindows(page) {
    return page.evaluate(() =>
        [...document.querySelectorAll('.window')]
            .filter(w => !w.classList.contains('hidden'))
            .map(w => w.id || w.getAttribute('aria-label') || w.className)
    );
}

async function waitForBoot(page) {
    await page.goto(FILE_URL);
    // Wait until desktop is visible (boot animation completed)
    await page.waitForFunction(
        () => {
            const desktop = document.getElementById('theDesktop');
            return desktop && desktop.style.display !== 'none';
        },
        { timeout: BOOT_TIMEOUT }
    );
    // Small buffer to ensure all event listeners are registered
    await page.waitForTimeout(200);
}

async function runTests() {
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    // ── Test 1: Winamp icon opens exactly one window ──────────────────────────
    console.log('\nTest 1: Winamp icon opens exactly one window');
    await waitForBoot(page);
    const beforeWinamp = await getVisibleWindows(page);
    assert(beforeWinamp.length === 0, 'No windows visible before clicking icon');

    await page.dblclick('#iconWinamp');
    await page.waitForTimeout(300);
    const afterWinamp = await getVisibleWindows(page);
    assert(afterWinamp.length === 1, `Exactly 1 window opens (got ${afterWinamp.length}: ${afterWinamp})`);
    assert(afterWinamp.includes('winampWindow'), 'The opened window is winampWindow');
    assert(!afterWinamp.includes('appWindow'), 'Generic appWindow is NOT opened');

    // ── Test 2: Closing Winamp leaves no other window ─────────────────────────
    console.log('\nTest 2: Closing Winamp leaves no residual window');
    await page.click('#winampCloseBtn');
    await page.waitForTimeout(200);
    const afterCloseWinamp = await getVisibleWindows(page);
    assert(afterCloseWinamp.length === 0, `No windows remain after closing Winamp (got ${afterCloseWinamp.length}: ${afterCloseWinamp})`);

    // ── Test 3: Minesweeper icon opens exactly one window ────────────────────
    console.log('\nTest 3: Minesweeper icon opens exactly one window');
    await waitForBoot(page);
    const beforeMine = await getVisibleWindows(page);
    assert(beforeMine.length === 0, 'No windows visible before clicking icon');

    await page.dblclick('#iconMinesweeper');
    await page.waitForTimeout(300);
    const afterMine = await getVisibleWindows(page);
    assert(afterMine.length === 1, `Exactly 1 window opens (got ${afterMine.length}: ${afterMine})`);
    assert(afterMine.includes('minesweeperWindow'), 'The opened window is minesweeperWindow');
    assert(!afterMine.includes('appWindow'), 'Generic appWindow is NOT opened');

    // ── Test 4: Closing Minesweeper leaves no other window ───────────────────
    console.log('\nTest 4: Closing Minesweeper leaves no residual window');
    await page.click('#minesweeperCloseBtn');
    await page.waitForTimeout(200);
    const afterCloseMine = await getVisibleWindows(page);
    assert(afterCloseMine.length === 0, `No windows remain after closing Minesweeper (got ${afterCloseMine.length}: ${afterCloseMine})`);

    // ── Test 5: Both Winamp and Minesweeper can be open simultaneously ────────
    console.log('\nTest 5: Both apps can be open independently at the same time');
    await waitForBoot(page);
    await page.dblclick('#iconWinamp');
    await page.waitForTimeout(200);
    await page.dblclick('#iconMinesweeper');
    await page.waitForTimeout(200);
    const bothOpen = await getVisibleWindows(page);
    assert(bothOpen.length === 2, `Exactly 2 windows when both are open (got ${bothOpen.length}: ${bothOpen})`);
    assert(bothOpen.includes('winampWindow'), 'winampWindow is open');
    assert(bothOpen.includes('minesweeperWindow'), 'minesweeperWindow is open');

    // ── Test 6: Defensive guard – even if config lists these icons, no duplicate opens ─
    // Override the config to re-add Winamp/Minesweeper to experimentApps, reload, and
    // verify only the dedicated window opens (not the generic appWindow too).
    console.log('\nTest 6: Defensive guard prevents duplicates even when config accidentally lists these icons');
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    // Inject a tampered config before the page loads
    await page2.addInitScript(() => {
        window.WIN_ME_SIMULATOR_CONFIG = {
            experimentApps: [
                { id: 'iconWinamp',       title: 'Winamp',       url: './applications/winamp-player/index.html' },
                { id: 'iconMinesweeper',  title: 'Minesweeper',  url: './applications/minesweeper/index.html' },
            ]
        };
    });
    await waitForBoot(page2);

    await page2.dblclick('#iconWinamp');
    await page2.waitForTimeout(300);
    const guardedWinamp = await getVisibleWindows(page2);
    assert(guardedWinamp.length === 1, `Defensive guard: only 1 window opens for Winamp (got ${guardedWinamp.length}: ${guardedWinamp})`);
    assert(!guardedWinamp.includes('appWindow'), 'Defensive guard: generic appWindow NOT opened for Winamp');

    await page2.evaluate(() => document.getElementById('winampCloseBtn').click());
    await page2.waitForTimeout(200);

    await page2.dblclick('#iconMinesweeper');
    await page2.waitForTimeout(300);
    const guardedMine = await getVisibleWindows(page2);
    assert(guardedMine.length === 1, `Defensive guard: only 1 window opens for Minesweeper (got ${guardedMine.length}: ${guardedMine})`);
    assert(!guardedMine.includes('appWindow'), 'Defensive guard: generic appWindow NOT opened for Minesweeper');

    await ctx2.close();

    await browser.close();

    // ── Summary ───────────────────────────────────────────────────────────────
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
