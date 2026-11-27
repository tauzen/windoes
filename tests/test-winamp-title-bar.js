/**
 * Playwright tests for Winamp's title bar inside the shell.
 *
 * Winamp is a headless window: it draws its own title bar, and the shell lays
 * a drag area over it. These tests press the title bar with the real mouse at
 * shell coordinates, so they check what the user reaches through that overlay:
 * each button shows its pressed frame, minimize and close act on the window,
 * the rest of the title bar drags it, and only the Winamp frame can ask the
 * shell to minimize or close Winamp.
 */

const path = require('path');
const { launchBrowser, startStaticServer } = require('./launch-browser');
const { createAssertTracker, waitForBoot } = require('./helpers/test-harness');

const WINDOES_DIR = path.resolve(__dirname, '..', 'windoes');

const tracker = createAssertTracker();
const { assert } = tracker;

const BUTTONS = ['options', 'minimize', 'shade', 'close'];

// The document loaded in one iframe of the shell, once its URL matches.
async function waitForFrame(page, iframeSelector, urlPattern) {
  for (let i = 0; i < 100; i++) {
    const frame = await (await page.$(iframeSelector))?.contentFrame();
    if (frame && urlPattern.test(frame.url())) {
      await frame.waitForLoadState('load');
      return frame;
    }
    await page.waitForTimeout(50);
  }
  throw new Error(`${iframeSelector} did not load ${urlPattern}`);
}

async function openWinamp(page) {
  await page.evaluate(() => window.WindoesApp.open.winamp());
  const frame = await waitForFrame(page, '#winampFrame', /winamp-player/);
  await frame.waitForSelector('#btn-close.wa-titlebar-close');
  await page.evaluate(() => window.WindoesApp.WindowManager.bringToFront('winamp'));
  return frame;
}

function winampWindowState(page) {
  return page.evaluate(() => {
    const win = window.WindoesApp.state.get().windows?.byId?.winamp || {};
    const el = document.getElementById('winampWindow');
    const taskBtn = document.getElementById('winampTaskBtn');
    return {
      open: !!win.open,
      minimized: !!win.minimized,
      taskbarVisible: !!win.taskbarVisible,
      hidden: el.classList.contains('hidden'),
      taskButtonShown: !!taskBtn && taskBtn.style.display !== 'none',
      left: el.getBoundingClientRect().left,
      top: el.getBoundingClientRect().top,
    };
  });
}

// Centre of a title-bar button in shell page coordinates.
async function buttonCentre(frame, name) {
  const box = await frame.locator(`#btn-${name}`).boundingBox();
  if (!box) throw new Error(`#btn-${name} has no box`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

function buttonFrame(frame, name) {
  return frame.$eval(`#btn-${name}`, (el) =>
    Array.from(el.classList).find((c) => c.startsWith('wa-'))
  );
}

// Holds the mouse down on a button, returns the frame shown while pressed,
// and keeps the button down until `release` runs.
async function pressButton(page, frame, name) {
  const { x, y } = await buttonCentre(frame, name);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(50);
  return buttonFrame(frame, name);
}

async function runTests() {
  const { server, baseUrl } = await startStaticServer(WINDOES_DIR);
  const browser = await launchBrowser();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('dialog', (dialog) => dialog.dismiss().catch(() => {}));

  try {
    await waitForBoot(page, baseUrl);
    let winamp = await openWinamp(page);

    // ── Test 1: Each button shows its pressed frame ────────────────────────
    console.log('\nTest 1: Each title-bar button shows its pressed frame in the shell');
    for (const name of BUTTONS) {
      const shown = await pressButton(page, winamp, name);
      assert(
        shown === `wa-titlebar-${name}-pressed`,
        `${name} shows its pressed frame while held (${shown})`
      );
      // Release away from the button so the press does not click it.
      await page.mouse.move(400, 500);
      await page.mouse.up();
      await page.waitForTimeout(50);
      const released = await buttonFrame(winamp, name);
      assert(released === `wa-titlebar-${name}`, `${name} shows its normal frame after release`);
    }
    let state = await winampWindowState(page);
    assert(state.open && !state.minimized, 'Pressing without clicking leaves Winamp open');

    // ── Test 2: Options and shade show the press and do nothing else ──────
    console.log('\nTest 2: Options and shade only show their pressed frame');
    for (const name of ['options', 'shade']) {
      await pressButton(page, winamp, name);
      await page.mouse.up();
      await page.waitForTimeout(200);
      state = await winampWindowState(page);
      assert(
        state.open && !state.minimized && !state.hidden,
        `Clicking ${name} leaves Winamp open and shown`
      );
    }

    // ── Test 3: Dragging the title bar outside the buttons moves Winamp ────
    console.log('\nTest 3: Dragging the title bar outside the buttons moves the window');
    const before = await winampWindowState(page);
    const grabX = before.left + 120;
    const grabY = before.top + 7;
    await page.mouse.move(grabX, grabY);
    await page.mouse.down();
    await page.mouse.move(grabX + 30, grabY + 20, { steps: 3 });
    await page.mouse.move(grabX + 60, grabY + 40, { steps: 3 });
    await page.mouse.up();
    const after = await winampWindowState(page);
    assert(
      Math.round(after.left - before.left) === 60 && Math.round(after.top - before.top) === 40,
      `The window moved by the drag (${after.left - before.left}, ${after.top - before.top})`
    );

    // ── Test 4: Minimize minimizes Winamp to the taskbar ───────────────────
    console.log('\nTest 4: Minimize minimizes Winamp to the taskbar');
    await pressButton(page, winamp, 'minimize');
    await page.mouse.up();
    await page.waitForFunction(() => window.WindoesApp.state.get().windows.byId.winamp.minimized);
    state = await winampWindowState(page);
    assert(state.minimized && state.hidden, 'Winamp is minimized and hidden');
    assert(
      state.taskbarVisible && state.taskButtonShown,
      'Winamp keeps its taskbar button while minimized'
    );
    await page.click('#winampTaskBtn');
    await page.waitForTimeout(100);
    state = await winampWindowState(page);
    assert(state.open && !state.minimized && !state.hidden, 'The taskbar button restores Winamp');

    // ── Test 5: Close closes Winamp ────────────────────────────────────────
    console.log('\nTest 5: Close closes Winamp');
    await pressButton(page, winamp, 'close');
    await page.mouse.up();
    await page.waitForFunction(() => !window.WindoesApp.state.get().windows.byId.winamp.open);
    state = await winampWindowState(page);
    assert(!state.open && !state.minimized && state.hidden, 'Winamp is closed, not minimized');
    assert(
      !state.taskbarVisible && !state.taskButtonShown,
      'Winamp has no taskbar button after close'
    );

    // ── Test 6: Only the Winamp frame can minimize or close Winamp ─────────
    console.log('\nTest 6: The shell ignores Winamp minimize and close from another app');
    winamp = await openWinamp(page);
    await page.evaluate(() => window.WindoesApp.open.solitaire());
    const solitaire = await waitForFrame(page, '#solitaireFrame', /solitaire/);
    for (const type of ['winamp-minimize', 'winamp-close']) {
      await solitaire.evaluate((t) => window.parent.postMessage({ type: t }, '*'), type);
      await page.waitForTimeout(300);
      state = await winampWindowState(page);
      assert(state.open && !state.minimized, `${type} from Solitaire leaves Winamp open`);
    }
    // The same message from the Winamp frame acts, so the check above is not
    // passing only because the message is malformed.
    await winamp.evaluate(() => window.parent.postMessage({ type: 'winamp-minimize' }, '*'));
    await page.waitForFunction(() => window.WindoesApp.state.get().windows.byId.winamp.minimized);
    assert(true, 'winamp-minimize from the Winamp frame minimizes Winamp');
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
