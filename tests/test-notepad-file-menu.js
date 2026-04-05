/**
 * Playwright tests for Notepad File menu entries.
 *
 * Validates File menu includes New/Save/Exit and those actions work.
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
    const page = await browser.newPage();

    try {
        console.log('\nTest 1: Notepad File menu exposes New, Save, Exit and actions work');
        await waitForBoot(page, baseUrl);

        await page.evaluate(() => WindoesApp.open.notepad());
        await page.waitForTimeout(200);

        const savePath = `/C:/My Documents/notepad-menu-save-${Date.now()}.txt`;
        const textBeforeSave = `Menu save text ${Date.now()}`;

        await page.evaluate((targetPath) => {
            window.prompt = () => targetPath;
        }, savePath);

        await page.fill('#notepadText', textBeforeSave);

        await page.click('#notepadFileMenu');
        await page.waitForTimeout(100);

        const menuState = await page.evaluate(() => {
            const menu = document.querySelector('#notepadFileDropdown');
            const labels = menu
                ? [...menu.querySelectorAll('.context-menu-item')].map(el => el.textContent.trim())
                : [];
            return {
                exists: !!menu,
                open: !!(menu && menu.classList.contains('open')),
                labels,
            };
        });

        assert(menuState.exists, 'Notepad File dropdown exists');
        assert(menuState.open, 'Notepad File dropdown opens when clicking File');
        assert(menuState.labels.includes('New'), 'File menu contains New');
        assert(menuState.labels.includes('Save'), 'File menu contains Save');
        assert(menuState.labels.includes('Exit'), 'File menu contains Exit');

        await page.click('#notepadFileDropdown [data-action="save"]');
        await page.waitForTimeout(250);

        const savedResult = await page.evaluate(async (targetPath) => {
            const { VirtualFS } = await import('./virtual-fs.js');
            const fs = new VirtualFS();
            await fs.init();
            const exists = await fs.exists(targetPath);
            const content = exists ? await fs.readFile(targetPath) : null;
            return { exists, content };
        }, savePath);

        assert(savedResult.exists, 'Save action writes file to VirtualFS');
        assert(savedResult.content === textBeforeSave, 'Save action writes correct content');

        await page.click('#notepadFileMenu');
        await page.waitForTimeout(100);
        await page.click('#notepadFileDropdown [data-action="new"]');
        await page.waitForTimeout(150);

        const newState = await page.evaluate(() => {
            const textarea = document.getElementById('notepadText');
            const title = document.getElementById('notepadTitle')?.textContent || '';
            const filePath = textarea?.dataset?.filePath || '';
            return {
                text: textarea ? textarea.value : null,
                title,
                filePath,
            };
        });

        assert(newState.text === '', 'New action clears textarea');
        assert(newState.filePath === '', 'New action clears current file path');
        assert(newState.title === 'Untitled - Notepad', `New action resets title (got: ${newState.title})`);

        await page.click('#notepadFileMenu');
        await page.waitForTimeout(100);
        await page.click('#notepadFileDropdown [data-action="exit"]');
        await page.waitForTimeout(150);

        const isHidden = await page.evaluate(() => document.getElementById('notepadWindow').classList.contains('hidden'));
        assert(isHidden, 'Exit action closes Notepad window');
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
