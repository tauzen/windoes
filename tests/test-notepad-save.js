/**
 * Playwright tests for Notepad file saving.
 *
 * Validates Ctrl+S save flow writes to VirtualFS and updates window title.
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

async function runTests() {
    const { server, baseUrl } = await startStaticServer(WINDOES_DIR);
    const browser = await launchBrowser();
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    try {
        console.log('\nTest 1: Ctrl+S saves Notepad text to VirtualFS and updates title');
        await waitForBoot(page, baseUrl);

        const savePath = `/C:/My Documents/notepad-save-${Date.now()}.txt`;
        const saveText = `Saved from Notepad at ${new Date().toISOString()}`;

        await page.evaluate((targetPath) => {
            window.prompt = () => targetPath;
        }, savePath);

        await page.evaluate(() => WindoesApp.open.notepad());
        await page.waitForTimeout(200);

        await page.fill('#notepadText', saveText);

        await page.keyboard.down('Control');
        await page.keyboard.press('s');
        await page.keyboard.up('Control');
        await page.waitForTimeout(350);

        const saved = await page.evaluate(async ({ targetPath, expectedText }) => {
            const { VirtualFS, basename } = await import('./virtual-fs.js');
            const fs = new VirtualFS();
            await fs.init();

            const exists = await fs.exists(targetPath);
            const content = exists ? await fs.readFile(targetPath) : null;
            const title = document.getElementById('notepadTitle')?.textContent || '';
            const expectedTitle = `${basename(targetPath)} - Notepad`;

            return {
                exists,
                content,
                title,
                expectedTitle,
            };
        }, { targetPath: savePath, expectedText: saveText });

        assert(saved.exists, `saved file exists at ${savePath}`);
        assert(saved.content === saveText, 'saved file content matches Notepad text');
        assert(saved.title === saved.expectedTitle, `Notepad title updates after save (got: ${saved.title})`);
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
