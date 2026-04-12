/**
 * Playwright tests for Notepad File menu entries.
 *
 * Validates File menu includes New/Save/Save As/Exit and those actions work.
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
        console.log('\nTest 1: Notepad File menu exposes New, Save, Save As, Exit and actions work');
        await waitForBoot(page, baseUrl);

        await page.evaluate(() => WindoesApp.open.notepad());
        await page.waitForTimeout(200);

        const savePath = `/C:/My Documents/notepad-menu-save-${Date.now()}.txt`;
        const saveAsPath = `/C:/My Documents/notepad-menu-save-as-${Date.now()}.txt`;
        const textBeforeSave = `Menu save text ${Date.now()}`;
        const textAfterSaveAs = `Menu save-as text ${Date.now()}`;

        await page.evaluate(() => {
            window.__promptCalled = false;
            const originalPrompt = window.prompt;
            window.prompt = (...args) => {
                window.__promptCalled = true;
                return originalPrompt.apply(window, args);
            };
        });

        await page.fill('#notepadText', textBeforeSave);

        await page.click('#notepadFileMenu');
        await page.waitForTimeout(100);

        const menuState = await page.evaluate(() => {
            const menu = document.querySelector('#notepadFileDropdown');
            const labels = menu
                ? [...menu.querySelectorAll('.context-menu-item')].map(el => el.textContent.trim())
                : [];
            const notepadState = (window.WindoesApp && WindoesApp.state && WindoesApp.state.get)
                ? (WindoesApp.state.get().notepad || null)
                : null;
            return {
                exists: !!menu,
                open: !!(menu && menu.classList.contains('open')),
                labels,
                hasNotepadState: !!notepadState,
                stateMenuOpen: !!(notepadState && notepadState.fileMenuOpen),
            };
        });

        assert(menuState.exists, 'Notepad File dropdown exists');
        assert(menuState.open, 'Notepad File dropdown opens when clicking File');
        assert(menuState.hasNotepadState, 'Notepad state slice exists in app reducer');
        assert(menuState.stateMenuOpen, 'Notepad File dropdown open state is reflected in reducer state');
        assert(menuState.labels.includes('New'), 'File menu contains New');
        assert(menuState.labels.includes('Save'), 'File menu contains Save');
        assert(menuState.labels.includes('Save As...'), 'File menu contains Save As...');
        assert(menuState.labels.includes('Exit'), 'File menu contains Exit');

        await page.click('#notepadFileDropdown [data-action="save"]');
        await page.waitForTimeout(150);

        const saveDialogVisible = await page.evaluate(() => {
            const saveDialog = document.getElementById('notepadSaveDialog');
            return !!(saveDialog && saveDialog.classList.contains('active'));
        });
        assert(saveDialogVisible, 'Save action opens Notepad Save dialog for untitled docs');

        await page.fill('#notepadSavePathInput', savePath);
        await page.click('#notepadSaveConfirmBtn');
        await page.waitForTimeout(250);

        const savedResult = await page.evaluate(async (targetPath) => {
            const { VirtualFS } = await import('./virtual-fs.js');
            const fs = new VirtualFS();
            await fs.init();
            const exists = await fs.exists(targetPath);
            const content = exists ? await fs.readFile(targetPath) : null;
            const promptCalled = !!window.__promptCalled;
            return { exists, content, promptCalled };
        }, savePath);

        assert(!savedResult.promptCalled, 'Save action does not use native window.prompt');
        assert(savedResult.exists, 'Save action writes file to VirtualFS');
        assert(savedResult.content === textBeforeSave, 'Save action writes correct content');

        await page.fill('#notepadText', textAfterSaveAs);
        await page.click('#notepadFileMenu');
        await page.waitForTimeout(100);
        await page.click('#notepadFileDropdown [data-action="save-as"]');
        await page.waitForTimeout(150);

        const saveAsDialogVisible = await page.evaluate(() => {
            const saveDialog = document.getElementById('notepadSaveDialog');
            return !!(saveDialog && saveDialog.classList.contains('active'));
        });
        assert(saveAsDialogVisible, 'Save As action opens Notepad Save dialog even for existing file');

        await page.fill('#notepadSavePathInput', saveAsPath);
        await page.click('#notepadSaveConfirmBtn');
        await page.waitForTimeout(250);

        const saveAsResult = await page.evaluate(async ({ originalPath, newPath }) => {
            const { VirtualFS, basename } = await import('./virtual-fs.js');
            const fs = new VirtualFS();
            await fs.init();

            const newExists = await fs.exists(newPath);
            const newContent = newExists ? await fs.readFile(newPath) : null;
            const oldExists = await fs.exists(originalPath);
            const oldContent = oldExists ? await fs.readFile(originalPath) : null;
            const title = document.getElementById('notepadTitle')?.textContent || '';
            const expectedTitle = `${basename(newPath)} - Notepad`;
            const filePath = document.getElementById('notepadText')?.dataset?.filePath || '';

            return {
                newExists,
                newContent,
                oldExists,
                oldContent,
                title,
                expectedTitle,
                filePath,
            };
        }, { originalPath: savePath, newPath: saveAsPath });

        assert(saveAsResult.newExists, 'Save As writes new file to VirtualFS');
        assert(saveAsResult.newContent === textAfterSaveAs, 'Save As writes latest content to new file');
        assert(saveAsResult.oldExists, 'Save As keeps original file present');
        assert(saveAsResult.oldContent === textBeforeSave, 'Save As does not overwrite original file');
        assert(saveAsResult.filePath === saveAsPath, 'Save As updates current document path');
        assert(saveAsResult.title === saveAsResult.expectedTitle, 'Save As updates title to new file name');

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
