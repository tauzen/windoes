/**
 * Playwright tests for the file chooser overwrite confirmation.
 *
 * When saving over an existing file, the chooser must surface a confirmation
 * dialog with Cancel / Replace buttons before resolving the chosen path.
 */

const path = require('path');
const { launchBrowser, startStaticServer } = require('./launch-browser');
const { createAssertTracker, waitForBoot } = require('./helpers/test-harness');

const WINDOES_DIR = path.resolve(__dirname, '..', 'windoes');

const tracker = createAssertTracker();
const { assert } = tracker;

async function runTests() {
  const { server, baseUrl } = await startStaticServer(WINDOES_DIR);
  const browser = await launchBrowser();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  try {
    await waitForBoot(page, baseUrl);

    const existingPath = `/C:/My Documents/overwrite-${Date.now()}.txt`;

    // Seed an existing file the save dialog will be asked to overwrite,
    // creating the standard folders first in case nothing has touched the
    // VirtualFS yet this session.
    await page.evaluate(async (target) => {
      const { VirtualFS } = await import('./virtual-fs.js');
      const fs = new VirtualFS();
      await fs.init();
      for (const dir of ['/C:', '/C:/My Documents']) {
        if (!(await fs.exists(dir))) await fs.mkdir(dir);
      }
      await fs.writeFile(target, 'original contents');
    }, existingPath);

    console.log('\nTest 1: Saving over an existing file shows the overwrite confirmation');

    await page.evaluate((target) => {
      window.__fcResult = 'pending';
      WindoesApp.fileChooser.open({ mode: 'save', startPath: target }).then((result) => {
        window.__fcResult = result;
      });
    }, existingPath);
    await page.waitForTimeout(200);

    await page.click('#fileChooserConfirmBtn');
    await page.waitForTimeout(150);

    const confirmVisible = await page.evaluate(() => {
      const el = document.getElementById('fileChooserOverwriteDialog');
      return !!(el && el.classList.contains('active'));
    });
    assert(confirmVisible, 'overwrite confirmation dialog appears when target file exists');

    const stillPending = await page.evaluate(() => window.__fcResult);
    assert(stillPending === 'pending', 'choice is not resolved while confirmation is pending');

    const mentionsFile = await page.evaluate(() => {
      const text = document.getElementById('fileChooserOverwriteText')?.textContent || '';
      return text.includes('already exists') && text.includes('replace');
    });
    assert(mentionsFile, 'confirmation explains the file already exists and will be replaced');

    console.log('\nTest 2: Cancel dismisses the confirmation and keeps the chooser open');

    await page.click('#fileChooserOverwriteCancelBtn');
    await page.waitForTimeout(150);

    const afterCancel = await page.evaluate(() => {
      const confirm = document.getElementById('fileChooserOverwriteDialog');
      const chooser = document.getElementById('fileChooserDialog');
      return {
        confirmActive: !!(confirm && confirm.classList.contains('active')),
        chooserActive: !!(chooser && chooser.classList.contains('active')),
        result: window.__fcResult,
      };
    });
    assert(!afterCancel.confirmActive, 'Cancel hides the overwrite confirmation');
    assert(afterCancel.chooserActive, 'Cancel keeps the file chooser open');
    assert(afterCancel.result === 'pending', 'Cancel does not resolve the choice');

    console.log('\nTest 3: Replace confirms the overwrite and resolves the chosen path');

    await page.click('#fileChooserConfirmBtn');
    await page.waitForTimeout(150);

    const reopened = await page.evaluate(() => {
      const el = document.getElementById('fileChooserOverwriteDialog');
      return !!(el && el.classList.contains('active'));
    });
    assert(reopened, 'confirmation reappears on a second save attempt');

    await page.click('#fileChooserReplaceBtn');
    await page.waitForTimeout(200);

    const afterReplace = await page.evaluate(() => {
      const confirm = document.getElementById('fileChooserOverwriteDialog');
      const chooser = document.getElementById('fileChooserDialog');
      return {
        confirmActive: !!(confirm && confirm.classList.contains('active')),
        chooserActive: !!(chooser && chooser.classList.contains('active')),
        result: window.__fcResult,
      };
    });
    assert(!afterReplace.confirmActive, 'Replace hides the confirmation');
    assert(!afterReplace.chooserActive, 'Replace closes the file chooser');
    assert(
      afterReplace.result === existingPath,
      `Replace resolves with the chosen path (got: ${afterReplace.result})`
    );
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
