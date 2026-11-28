const assert = require('node:assert/strict');
const path = require('node:path');
const { launchBrowser, startStaticServer } = require('./launch-browser');
const { waitForBoot } = require('./helpers/test-harness');

async function run() {
  const { server, baseUrl } = await startStaticServer(path.resolve(__dirname, '..', 'windoes'));
  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
    await waitForBoot(page, baseUrl);
    const icon = page.locator('#iconMyComputer');
    const window = page.locator('#myComputerWindow');

    await icon.click();
    assert(await icon.evaluate((el) => el.classList.contains('selected')), 'click selects icon');
    await icon.dblclick();
    await window.waitFor({ state: 'visible' });
    await page.reload();
    await page.locator('#theDesktop').waitFor({ state: 'visible' });

    const before = await icon.boundingBox();
    await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
    await page.mouse.down();
    await page.mouse.move(before.x + before.width / 2 + 350, before.y + before.height / 2 + 180, {
      steps: 8,
    });
    await page.mouse.up();
    const moved = await icon.boundingBox();
    assert(moved.x > before.x + 300 && moved.y > before.y + 150, 'drag moves the icon');
    assert(!(await window.isVisible()), 'drag does not open the application');

    await page.reload();
    await page.locator('#theDesktop').waitFor({ state: 'visible' });
    const restored = await icon.boundingBox();
    assert(
      Math.abs(restored.x - moved.x) < 1 && Math.abs(restored.y - moved.y) < 1,
      'reload restores the position'
    );
    await icon.click();
    assert(
      await icon.evaluate((el) => el.classList.contains('selected')),
      'click still selects the moved icon'
    );
    await icon.dblclick();
    await window.waitFor({ state: 'visible' });

    await page.setViewportSize({ width: 320, height: 400 });
    await page.waitForFunction(() => {
      const icon = document.querySelector('#iconMyComputer').getBoundingClientRect();
      const desktop = document.querySelector('#desktopIcons').getBoundingClientRect();
      return (
        icon.left >= desktop.left &&
        icon.right <= desktop.right &&
        icon.top >= desktop.top &&
        icon.bottom <= desktop.bottom
      );
    });
    console.log('PASS: drag, reload, activation and resize boundary');
  } finally {
    await browser?.close();
    await server.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
