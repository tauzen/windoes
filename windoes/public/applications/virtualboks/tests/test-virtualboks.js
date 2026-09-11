/**
 * Playwright tests for the VirtualBoks application.
 *
 * Validates:
 * - The machine manager renders its toolbar, machine list and details pane
 * - Toolbar buttons enable/disable to match the selected machine
 * - The New Virtual Machine dialog validates input and persists a machine
 * - Removing a user machine drops it from the list and from storage
 * - A guest actually boots: the built-in Self-Test machine runs its boot
 *   sector on the emulated CPU and prints to the emulated VGA text screen
 * - Powering off tears the guest down and returns to the details pane
 *
 * Unlike the other embedded apps this suite runs over the Vite dev server
 * rather than a `file://` URL, because the emulator fetches its WebAssembly
 * core and firmware — neither of which a `file://` document is allowed to do.
 */

const path = require('path');
const { launchBrowser, startStaticServer } = require('../../../../../tests/launch-browser');
const { createAssertTracker } = require('../../../../../tests/helpers/test-harness');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const WINDOES_DIR = path.join(REPO_ROOT, 'windoes');

// `npm run -w` starts this suite inside the workspace directory, but the shared
// Vite config declares a project root relative to the current directory. Run
// from the repository root so the dev server serves the same tree it does in
// development.
process.chdir(REPO_ROOT);

// Emulating a PC boot is slow under a headless browser on CI hardware.
const BOOT_TIMEOUT_MS = 90000;

const tracker = createAssertTracker();
const { assert } = tracker;

async function selectMachine(page, name) {
  await page.click(`.vm-item:has-text("${name}")`);
}

async function runTests() {
  const browser = await launchBrowser();
  const { server, baseUrl } = await startStaticServer(WINDOES_DIR);
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const appUrl = `${baseUrl}/applications/virtualboks/index.html`;

  try {
    // ── Test 1: Manager chrome renders ───────────────────────────────────
    console.log('\nTest 1: Manager chrome renders');
    await page.goto(appUrl);
    await page.waitForSelector('.vm-item');

    const chrome = await page.evaluate(() => ({
      toolbar: !!document.querySelector('.toolbar'),
      list: !!document.getElementById('vmList'),
      details: !!document.getElementById('detailsPane'),
      status: !!document.getElementById('statusText'),
      screen: !!document.getElementById('vmScreen'),
      buttons: [...document.querySelectorAll('.toolbar .tb-btn')].map((b) => b.textContent.trim()),
    }));

    assert(chrome.toolbar, 'Toolbar exists');
    assert(chrome.list, 'Machine list exists');
    assert(chrome.details, 'Details pane exists');
    assert(chrome.status, 'Status bar exists');
    assert(chrome.screen, 'Guest screen container exists');
    for (const label of ['New', 'Settings', 'Remove', 'Start', 'Power Off', 'Reset']) {
      assert(chrome.buttons.includes(label), `Toolbar has a "${label}" button`);
    }

    // ── Test 2: Built-in machines are listed ─────────────────────────────
    console.log('\nTest 2: Built-in machines are listed');
    const names = await page.$$eval('.vm-item .vm-name', (els) => els.map((e) => e.textContent));

    assert(names.length >= 5, `At least five built-in machines (${names.length})`);
    for (const expected of ['Linux 2.6', 'Buildroot 6.8', 'Tiny Core 11', 'Self-Test']) {
      assert(names.includes(expected), `Built-in machine "${expected}" is listed`);
    }

    // ── Test 3: Details pane describes the selection ─────────────────────
    console.log('\nTest 3: Details pane describes the selection');
    await selectMachine(page, 'Tiny Core 11');
    const details = await page.evaluate(() => ({
      text: document.getElementById('detailsPane').textContent,
      headings: [...document.querySelectorAll('#detailsPane h2')].map((h) => h.textContent),
    }));

    assert(details.headings.includes('General'), 'Details pane has a General section');
    assert(details.headings.includes('System'), 'Details pane has a System section');
    assert(details.headings.includes('Storage'), 'Details pane has a Storage section');
    assert(details.text.includes('256 MB'), 'Details pane shows the configured memory');
    assert(details.text.includes('Powered off'), 'Details pane reports the machine is off');

    // ── Test 4: Toolbar reflects that built-ins are read-only ────────────
    console.log('\nTest 4: Toolbar reflects that built-ins are read-only');
    const builtInButtons = await page.evaluate(() => ({
      start: document.getElementById('btnStart').disabled,
      settings: document.getElementById('btnSettings').disabled,
      remove: document.getElementById('btnRemove').disabled,
      powerOff: document.getElementById('btnPowerOff').disabled,
    }));

    assert(!builtInButtons.start, 'Start is enabled for a powered-off machine');
    assert(builtInButtons.settings, 'Settings is disabled for a built-in machine');
    assert(builtInButtons.remove, 'Remove is disabled for a built-in machine');
    assert(builtInButtons.powerOff, 'Power Off is disabled while nothing is running');

    // ── Test 5: New dialog validates its input ───────────────────────────
    console.log('\nTest 5: New dialog validates its input');
    await page.click('#btnNew');
    await page.waitForSelector('#dialogBackdrop:not([hidden])');

    await page.fill('#fName', 'Test Machine');
    await page.fill('#fUrl', '');
    await page.click('#formOk');

    const validation = await page.evaluate(() => ({
      error: document.getElementById('formError').textContent,
      stillOpen: !document.getElementById('dialogBackdrop').hidden,
    }));

    assert(validation.error.length > 0, 'Submitting without an image URL reports an error');
    assert(validation.stillOpen, 'The dialog stays open when validation fails');

    // ── Test 6: A new machine is created and persisted ───────────────────
    console.log('\nTest 6: A new machine is created and persisted');
    await page.fill('#fUrl', 'https://example.invalid/guest.iso');
    await page.click('#formOk');
    await page.waitForFunction(() => document.getElementById('dialogBackdrop').hidden);

    const created = await page.evaluate(() => ({
      listed: [...document.querySelectorAll('.vm-item .vm-name')].map((e) => e.textContent),
      stored: window.localStorage.getItem('virtualboks.machines.v1'),
      settingsEnabled: !document.getElementById('btnSettings').disabled,
      removeEnabled: !document.getElementById('btnRemove').disabled,
    }));

    assert(created.listed.includes('Test Machine'), 'The new machine appears in the list');
    assert(
      created.stored && created.stored.includes('Test Machine'),
      'The new machine is written to local storage'
    );
    assert(created.settingsEnabled, 'Settings is enabled for a user machine');
    assert(created.removeEnabled, 'Remove is enabled for a user machine');

    await page.reload();
    await page.waitForSelector('.vm-item');
    const afterReload = await page.$$eval('.vm-item .vm-name', (els) =>
      els.map((e) => e.textContent)
    );
    assert(afterReload.includes('Test Machine'), 'The machine survives a reload');

    // ── Test 7: Removing a machine drops it again ────────────────────────
    console.log('\nTest 7: Removing a machine drops it again');
    await selectMachine(page, 'Test Machine');
    await page.click('#btnRemove');

    const afterRemove = await page.evaluate(() => ({
      listed: [...document.querySelectorAll('.vm-item .vm-name')].map((e) => e.textContent),
      stored: window.localStorage.getItem('virtualboks.machines.v1'),
    }));

    assert(!afterRemove.listed.includes('Test Machine'), 'The machine is gone from the list');
    assert(
      !afterRemove.stored || !afterRemove.stored.includes('Test Machine'),
      'The machine is gone from local storage'
    );

    // ── Test 8: A guest really boots on the emulated CPU ─────────────────
    // The Self-Test machine's boot sector is assembled in the page, so this
    // exercises the whole stack — emulator core, firmware, BIOS disk service
    // and VGA text output — without downloading a guest image.
    console.log('\nTest 8: A guest really boots on the emulated CPU');
    await selectMachine(page, 'Self-Test');
    await page.click('#btnStart');

    await page.waitForSelector('#consolePane:not([hidden])');
    assert(true, 'The console pane replaces the details pane on start');

    await page.waitForFunction(
      () => document.getElementById('vmScreen').firstElementChild.textContent.includes('SeaBIOS'),
      { timeout: BOOT_TIMEOUT_MS }
    );
    assert(true, 'The emulated firmware posts to the VGA text screen');

    await page.waitForFunction(
      () =>
        document.getElementById('vmScreen').firstElementChild.textContent.includes('WINDOES VM OK'),
      { timeout: BOOT_TIMEOUT_MS }
    );
    assert(true, 'The guest boot sector executed and wrote to the emulated screen');

    const running = await page.evaluate(() => ({
      state: document.querySelector('.vm-item[aria-selected="true"]').dataset.state,
      powerOffEnabled: !document.getElementById('btnPowerOff').disabled,
      startDisabled: document.getElementById('btnStart').disabled,
    }));

    assert(running.state === 'running', 'The machine is marked running in the list');
    assert(running.powerOffEnabled, 'Power Off is enabled while the guest runs');
    assert(running.startDisabled, 'Start is disabled while the guest runs');

    // ── Test 9: Power Off tears the guest down ───────────────────────────
    console.log('\nTest 9: Power Off tears the guest down');
    await page.click('#btnPowerOff');
    await page.waitForFunction(() => document.getElementById('consolePane').hidden);

    const stopped = await page.evaluate(() => ({
      screen: document.getElementById('vmScreen').firstElementChild.textContent,
      state: document.querySelector('.vm-item[aria-selected="true"]').dataset.state,
      status: document.getElementById('statusText').textContent,
      detailsVisible: !document.getElementById('detailsPane').hidden,
    }));

    assert(stopped.detailsVisible, 'The details pane comes back after power off');
    assert(!stopped.screen.includes('WINDOES VM OK'), 'The guest screen is cleared');
    assert(stopped.state === 'off', 'The machine is marked powered off');
    assert(stopped.status.includes('powered off'), 'The status bar reports the power off');

    // ── Test 10: The same machine can be started again ───────────────────
    // Creating a second emulator over the same screen container is where a
    // leaked instance from the first boot would show up.
    console.log('\nTest 10: The same machine can be started again');
    await page.click('#btnStart');
    await page.waitForSelector('#consolePane:not([hidden])');
    await page.waitForFunction(
      () =>
        document.getElementById('vmScreen').firstElementChild.textContent.includes('WINDOES VM OK'),
      { timeout: BOOT_TIMEOUT_MS }
    );
    assert(true, 'A second boot of the same machine reaches the guest again');
    await page.click('#btnPowerOff');
    await page.waitForFunction(() => document.getElementById('consolePane').hidden);

    // ── Test 11: An unreachable guest image reports instead of hanging ───
    // v86 retries a failed download forever without surfacing anything, so a
    // blocked or missing image used to leave the UI stuck on "Starting...".
    // The manager probes the URL itself; this asserts the probe speaks up.
    console.log('\nTest 11: An unreachable guest image reports instead of hanging');
    await page.route('**/unreachable-guest.iso', (route) => route.abort('failed'));

    await page.click('#btnNew');
    await page.waitForSelector('#dialogBackdrop:not([hidden])');
    await page.fill('#fName', 'Broken Image');
    await page.fill('#fUrl', `${baseUrl}/unreachable-guest.iso`);
    await page.click('#formOk');
    await page.waitForFunction(() => document.getElementById('dialogBackdrop').hidden);

    await page.click('#btnStart');
    await page.waitForFunction(
      () => {
        const status = document.getElementById('statusText').textContent;
        return status.includes('Could not fetch') || status.includes('image host answered');
      },
      { timeout: 30000 }
    );
    assert(true, 'A failed image fetch is reported in the status bar');

    const failed = await page.evaluate(() => ({
      state: document.querySelector('.vm-item[aria-selected="true"]').dataset.state,
      status: document.getElementById('statusText').textContent,
      startEnabled: !document.getElementById('btnStart').disabled,
      consoleHidden: document.getElementById('consolePane').hidden,
    }));

    assert(failed.state === 'error', 'The machine is flagged as errored in the list');
    assert(
      failed.status.includes('Access-Control-Allow-Origin') || failed.status.includes('answered'),
      `The message names a likely cause (got: ${failed.status.slice(0, 90)})`
    );
    assert(failed.startEnabled, 'Start becomes available again after the failure');
    assert(failed.consoleHidden, 'The console pane is not left showing a dead guest');

    await page.click('#btnRemove');
  } finally {
    await ctx.close();
    await browser.close();
    server.close();
  }
}

runTests()
  .then(() => tracker.exitWithSummary())
  .catch((error) => {
    console.error('Test run failed:', error);
    process.exit(1);
  });
