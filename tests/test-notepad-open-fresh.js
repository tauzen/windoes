/**
 * Playwright regression tests for Notepad open behavior.
 *
 * Verifies plain Notepad launches (Start/Run path) always open a fresh untitled document,
 * while explicit file-open launches still populate content/path/title.
 */

const path = require('path');
const { launchBrowser, startStaticServer } = require('./launch-browser');

const WINDOES_DIR = path.resolve(__dirname, '..', 'windoes');
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

async function waitForBoot(page, baseUrl) {
    await page.goto(baseUrl + '/index.html');
    await page.waitForFunction(
        () => {
            const desktop = document.getElementById('theDesktop');
            return desktop && desktop.style.display !== 'none';
        },
        { timeout: BOOT_TIMEOUT }
    );
    await page.waitForTimeout(200);
}

async function getNotepadSnapshot(page) {
    return page.evaluate(() => {
        const textarea = document.getElementById('notepadText');
        const title = document.getElementById('notepadTitle')?.textContent || '';
        return {
            text: textarea ? textarea.value : null,
            filePath: textarea?.dataset?.filePath || '',
            title,
        };
    });
}

async function runTests() {
    const { server, baseUrl } = await startStaticServer(WINDOES_DIR);
    const browser = await launchBrowser();
    const page = await browser.newPage();

    try {
        console.log('\nTest 1: Opening Notepad without a file always starts a fresh untitled document');
        await waitForBoot(page, baseUrl);

        await page.evaluate(() => {
            WindoesApp.open.notepad({
                filePath: '/C:/My Documents/previous.txt',
                content: 'Previously opened document text',
            });
        });
        await page.waitForTimeout(100);

        const seededState = await getNotepadSnapshot(page);
        assert(seededState.text === 'Previously opened document text', 'sanity: seeded explicit file-open content is shown');
        assert(seededState.filePath === '/C:/My Documents/previous.txt', 'sanity: seeded explicit file-open path is tracked');
        assert(seededState.title === 'previous.txt - Notepad', 'sanity: seeded explicit file-open title is shown');

        await page.evaluate(() => WindoesApp.WindowManager.close('notepad'));
        await page.waitForTimeout(100);

        // This is the same path Start menu and Run dialog use internally.
        await page.evaluate(() => WindoesApp.open.notepad());
        await page.waitForTimeout(100);

        const reopenedState = await getNotepadSnapshot(page);
        assert(reopenedState.text === '', 'plain open clears previous document text');
        assert(reopenedState.filePath === '', 'plain open clears previous document path');
        assert(reopenedState.title === 'Untitled - Notepad', `plain open resets title to untitled (got: ${reopenedState.title})`);

        console.log('\nTest 2: Explicit file-open still populates content/path/title');

        const explicitPath = '/C:/My Documents/open-specific.txt';
        const explicitContent = `Open specific file content ${Date.now()}`;

        await page.evaluate(({ explicitPath, explicitContent }) => {
            WindoesApp.open.notepad({ filePath: explicitPath, content: explicitContent });
        }, { explicitPath, explicitContent });
        await page.waitForTimeout(100);

        const explicitState = await getNotepadSnapshot(page);
        assert(explicitState.text === explicitContent, 'explicit file-open sets textarea content');
        assert(explicitState.filePath === explicitPath, 'explicit file-open sets file path');
        assert(explicitState.title === 'open-specific.txt - Notepad', `explicit file-open sets file title (got: ${explicitState.title})`);
    } finally {
        await browser.close();
        server.close();
    }

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
