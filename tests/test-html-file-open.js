/**
 * Playwright tests for HTML file support.
 *
 * Validates that .html files in the VirtualFS render in Internet Explorer,
 * and that the explorer context menu offers Open / Open With > Notepad.
 */

const path = require('path');
const { launchBrowser, startStaticServer } = require('./launch-browser');
const { createAssertTracker, waitForBoot } = require('./helpers/test-harness');

const WINDOES_DIR = path.resolve(__dirname, '..', 'windoes');

const tracker = createAssertTracker();
const { assert } = tracker;

const HTML_PATH = '/C:/My Documents/it-test-page.html';
const HTML_SOURCE = [
  '<!doctype html>',
  '<html><head><title>IT Test Page</title></head>',
  '<body><h1 id="headline">Hello from the VirtualFS</h1></body></html>',
].join('\n');

async function runTests() {
  const { server, baseUrl } = await startStaticServer(WINDOES_DIR);
  const browser = await launchBrowser();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  try {
    await waitForBoot(page, baseUrl);

    // Seed an HTML document before opening the explorer.
    await page.evaluate(
      async ({ htmlPath, htmlSource }) => {
        const { VirtualFS } = await import('./virtual-fs.js');
        const fs = new VirtualFS();
        await fs.init();
        if (!(await fs.exists('/C:'))) await fs.mkdir('/C:');
        if (!(await fs.exists('/C:/My Documents'))) await fs.mkdir('/C:/My Documents');
        await fs.writeFile(htmlPath, htmlSource);
      },
      { htmlPath: HTML_PATH, htmlSource: HTML_SOURCE }
    );

    console.log('\nTest 1: HTML file shows in explorer with the IE document icon');
    await page.evaluate(() => WindoesApp.open.myComputer());
    await page.waitForTimeout(300);

    await page.dblclick('.folder-item:has-text("Local Disk (C:)")');
    await page.waitForSelector('.folder-item:has-text("My Documents")');
    await page.dblclick('.folder-item:has-text("My Documents")');
    await page.waitForSelector(`.folder-item[data-path="${HTML_PATH}"]`);

    const iconClass = await page.getAttribute(
      `.folder-item[data-path="${HTML_PATH}"] .folder-item-icon`,
      'class'
    );
    assert(iconClass.includes('folder-icon-html'), 'html file uses the folder-icon-html icon');

    console.log('\nTest 2: double-click opens the page in Internet Explorer');
    await page.dblclick(`.folder-item[data-path="${HTML_PATH}"]`);
    await page.waitForFunction(() => !!WindoesApp.state.get().windows?.byId?.ie?.open);

    await page.waitForFunction(
      () =>
        document.getElementById('addressInput')?.value === 'C:\\My Documents\\it-test-page.html'
    );
    assert(true, 'IE address bar shows the Windows-style file path');

    const ieTitle = await page.evaluate(() => WindoesApp.state.get().browser.title);
    assert(
      ieTitle === 'C:\\My Documents\\it-test-page.html - Microsoft Internet Explorer',
      `IE window title includes the file path (got: ${ieTitle})`
    );

    const frameEl = await page.waitForSelector('#browserFrame');
    const frame = await frameEl.contentFrame();
    await frame.waitForSelector('#headline');
    const headline = await frame.textContent('#headline');
    assert(headline === 'Hello from the VirtualFS', 'HTML document renders inside the IE frame');

    const sandbox = await page.getAttribute('#browserFrame', 'sandbox');
    assert(
      sandbox === 'allow-scripts',
      `local documents render without allow-same-origin (got: ${sandbox})`
    );

    console.log('\nTest 3: context menu offers Open and Open With > Notepad for html files');
    await page.evaluate(() => WindoesApp.WindowManager.close('ie'));
    await page.evaluate(() => WindoesApp.WindowManager.bringToFront('myComputer'));
    await page.click(`.folder-item[data-path="${HTML_PATH}"]`, { button: 'right' });
    await page.waitForSelector('#explorerContextMenu.open');

    const hasOpen = await page.isVisible('#explorerContextMenu [data-action="open"]');
    const hasOpenWith = await page.isVisible('#explorerContextMenu [data-action="open-with"]');
    assert(hasOpen, 'context menu shows Open for html files');
    assert(hasOpenWith, 'context menu shows Open With for html files');

    await page.click('#explorerContextMenu [data-action="open-with"]');
    await page.waitForSelector('#explorerOpenWithSubmenu.open');
    await page.click('#explorerOpenWithSubmenu [data-action="open-with-notepad"]');
    await page.waitForFunction(() => !!WindoesApp.state.get().windows?.byId?.notepad?.open);
    await page.waitForTimeout(200);

    const notepadText = await page.inputValue('#notepadText');
    assert(notepadText === HTML_SOURCE, 'Open With > Notepad loads the raw HTML source');

    const notepadPath = await page.evaluate(
      () => WindoesApp.state.get().notepad.currentFilePath
    );
    assert(notepadPath === HTML_PATH, 'Notepad tracks the opened html file path');

    console.log('\nTest 4: non-html files do not get Open / Open With');
    await page.evaluate(() => WindoesApp.WindowManager.close('notepad'));
    await page.evaluate(() => WindoesApp.WindowManager.bringToFront('myComputer'));
    await page.click('.folder-item:has-text("Hello.txt")', { button: 'right' });
    await page.waitForSelector('#explorerContextMenu.open');
    const txtHasOpen = await page.isVisible('#explorerContextMenu [data-action="open"]');
    assert(!txtHasOpen, 'context menu hides Open/Open With for non-html files');
  } finally {
    await browser.close();
    server.close();
  }
  tracker.exitWithSummary();
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
