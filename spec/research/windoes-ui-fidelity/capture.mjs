// Captures the Windoes shell surfaces at 1x (deviceScaleFactor 1) into
// ./screenshots for the Windows 98 / Me fidelity survey (report.md).
// Run from the repository root:  node spec/research/windoes-ui-fidelity/capture.mjs
// It starts its own Vite dev server and headless Chromium, and stops both.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const { startStaticServer } = require(path.join(root, 'tests/launch-browser.js'));
const { chromium } = require('playwright');

const outDir = path.join(here, 'screenshots');
mkdirSync(outDir, { recursive: true });

const VIEWPORT = { width: 800, height: 600 };
const fonts = {};
const geometry = {};

const { server, baseUrl } = await startStaticServer(path.join(root, 'windoes'));
// Playwright hides scrollbars in headless mode by default; keep them so the
// capture shows the Chromium (Linux) classic scrollbar the shell gets today.
const browser = await chromium.launch({ headless: true, ignoreDefaultArgs: ['--hide-scrollbars'] });
try {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');

  const shot = async (name, clip) => {
    const file = path.join(outDir, `${name}.png`);
    await page.screenshot({ path: file, ...(clip ? { clip } : {}) });
    console.log('captured', name);
  };
  const box = async (selector, pad = 0) => {
    const b = await page.locator(selector).first().boundingBox();
    return {
      x: Math.max(0, Math.floor(b.x - pad)),
      y: Math.max(0, Math.floor(b.y - pad)),
      width: Math.ceil(b.width + pad * 2),
      height: Math.ceil(b.height + pad * 2),
    };
  };
  const shotEl = async (name, selector, pad = 0) => shot(name, await box(selector, pad));
  const platformFont = async (label, selector) => {
    const { root: doc } = await cdp.send('DOM.getDocument', { depth: -1 });
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: doc.nodeId, selector });
    const { fonts: used } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    const computed = await page.$eval(selector, (el) => {
      const s = getComputedStyle(el);
      return `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
    });
    fonts[label] = { selector, computed, rendered: used.map((f) => f.familyName) };
  };
  const measure = async (label, selector) => {
    const b = await page.locator(selector).first().boundingBox();
    geometry[label] = { selector, width: Math.round(b.width), height: Math.round(b.height) };
  };
  const app = (fn, ...args) => page.evaluate(fn, ...args);
  const settle = (ms = 250) => page.waitForTimeout(ms);

  // Boot: BIOS POST, then the splash screen.
  await page.goto(baseUrl + '/index.html');
  await page.waitForSelector('#bootBios:not(.hidden)');
  await settle(900);
  await shot('01-boot-bios');
  await page.waitForSelector('#bootScreen:not(.hidden)', { timeout: 15000 });
  await settle(300);
  await shot('02-boot-splash');
  await page.waitForFunction(
    () => document.getElementById('theDesktop')?.style.display !== 'none',
    { timeout: 20000 }
  );
  await settle(500);

  // Desktop and taskbar.
  await page.mouse.move(790, 300);
  await shot('03-desktop');
  await shotEl('04-taskbar', '#theTaskbar');
  await shot('05-taskbar-left', { x: 0, y: 566, width: 260, height: 34 });
  await page.locator('#desktopIcons .icon').first().click();
  await settle();
  await shot('06-desktop-icon-selected', { x: 0, y: 0, width: 200, height: 260 });
  await page.mouse.click(600, 300);

  await platformFont('desktop icon label', '#desktopIcons .icon-label');
  await platformFont('start button', '#startButton');
  await platformFont('clock', '#clock');
  await measure('taskbar', '#theTaskbar');
  await measure('start button', '#startButton');
  await measure('desktop icon cell', '#desktopIcons .icon');

  // Start menu, Programs cascade.
  await page.click('#startButton');
  await settle();
  await platformFont('start menu item', '#startMenu .menu-item');
  await measure('start menu root item', '#startMenu .menu-item');
  await measure('start menu banner', '#startMenu .start-rail');
  await shot('07-start-menu', { x: 0, y: 260, width: 300, height: 340 });
  const programs = page.locator('#startMenu .menu-item-arrow').first();
  await programs.hover();
  await settle(60);
  await shot('08-start-menu-programs-60ms', { x: 0, y: 160, width: 640, height: 440 });
  await measure('submenu item', '.programs-submenu.open .submenu-item');
  const games = page.locator('.programs-submenu.open .submenu-item-arrow').first();
  if (await games.count()) {
    await games.hover();
    await settle();
  }
  await shot('09-start-menu-cascade', { x: 0, y: 100, width: 800, height: 500 });
  await page.keyboard.press('Escape');
  await page.mouse.click(600, 200);
  await settle();

  // Desktop context menu.
  await page.mouse.click(500, 250, { button: 'right' });
  await settle();
  await shot('10-desktop-context-menu', { x: 480, y: 230, width: 260, height: 300 });
  await measure('context menu item', '.context-menu.open .context-menu-item');
  await page.keyboard.press('Escape');
  await page.mouse.click(700, 100);
  await settle();

  // Notepad: active window chrome, menu, text area.
  await app(() => window.WindoesApp.open.notepad());
  await page.waitForSelector('#notepadWindow:not(.hidden)');
  await app(() => {
    const el = document.getElementById('notepadWindow');
    Object.assign(el.style, { left: '40px', top: '30px', width: '480px', height: '340px' });
    const ta = document.getElementById('notepadText');
    ta.value = Array.from(
      { length: 60 },
      (_, i) => `Line ${i + 1}: The quick brown fox jumps over the lazy dog.`
    ).join('\n');
  });
  await page.mouse.move(790, 10);
  await settle();
  await platformFont('title bar text', '#notepadTitle');
  await platformFont('menu bar item', '#notepadWindow .menubar-item');
  await platformFont('notepad text', '#notepadText');
  await measure('title bar', '#notepadTitlebar');
  await measure('caption button', '#notepadCloseBtn');
  await measure('menu bar', '#notepadWindow .menubar');
  await measure('menu bar item', '#notepadWindow .menubar-item');
  await shotEl('11-notepad-active', '#notepadWindow');
  await shot('12-titlebar-active-crop', await box('#notepadTitlebar', 4));
  await page.click('#notepadFileMenu');
  await settle();
  await shot('13-notepad-file-menu', { x: 30, y: 20, width: 300, height: 260 });
  await measure('dropdown menu item', '#notepadFileDropdown .context-menu-item');
  await page.keyboard.press('Escape');
  await page.mouse.click(700, 500);
  await settle();

  // Inactive window: open My Computer on top of Notepad.
  await app(() => window.WindoesApp.open.myComputer());
  await page.waitForSelector('#myComputerWindow:not(.hidden)');
  await app(() => {
    const el = document.getElementById('myComputerWindow');
    Object.assign(el.style, { left: '260px', top: '140px', width: '500px', height: '360px' });
  });
  await settle(600);
  await page.mouse.move(790, 10);
  await shot('14-two-windows-active-inactive');
  await shot('15-titlebar-inactive-crop', await box('#notepadTitlebar', 4));
  await shotEl('16-my-computer', '#myComputerWindow');
  await shotEl('17-taskbar-two-tasks', '#theTaskbar');
  await measure('task button', '#taskArea .task-button');
  await shot('18-task-buttons-crop', await box('#taskArea', 2));

  // Explorer into C: drive (double-click the second item if present).
  const items = page.locator('#myComputerWindow .folder-item');
  if ((await items.count()) > 1) {
    await items.nth(1).dblclick();
    await settle(600);
    await shotEl('19-explorer-folder', '#myComputerWindow');
  }

  // Pressed caption button and hover state.
  const closeBtn = page.locator('#myComputerCloseBtn');
  const cb = await closeBtn.boundingBox();
  await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2);
  await page.mouse.down();
  await shot('20-caption-button-pressed', await box('#myComputerTitlebar', 4));
  await page.mouse.move(400, 590);
  await page.mouse.up();
  await settle();

  // Scrollbar in Notepad.
  await app(() => window.WindoesApp.WindowManager.bringToFront?.('notepad'));
  await page.click('#notepadTitlebar');
  await settle();
  const nb = await box('#notepadWindow');
  await shot('21-scrollbar-notepad', {
    x: nb.x + nb.width - 40,
    y: nb.y,
    width: 44,
    height: nb.height,
  });

  // Maximized Notepad.
  await page.locator('#notepadWindow .ctrl-max').click();
  await settle();
  await shot('22-notepad-maximized');
  await page.locator('#notepadWindow .ctrl-max').click();
  await settle();

  // Internet Explorer.
  await app(() => window.WindoesApp.open.internetExplorer());
  await page.waitForSelector('#ieWindow:not(.hidden)');
  await app(() => {
    const el = document.getElementById('ieWindow');
    Object.assign(el.style, { left: '20px', top: '10px', width: '760px', height: '540px' });
  });
  await settle(800);
  await page.mouse.move(790, 590);
  await shotEl('23-internet-explorer', '#ieWindow');
  await shot('24-ie-toolbar-crop', await box('#ieWindow .toolbar', 2));
  await page.hover('#refreshBtn');
  await settle();
  await shot('25-ie-toolbar-hover', await box('#ieWindow .toolbar', 2));
  await platformFont('toolbar label', '#refreshBtn');
  await measure('IE toolbar button', '#refreshBtn');
  await measure('IE address input', '#addressInput');
  await page.mouse.move(790, 590);

  // Close app windows before dialogs.
  for (const id of ['#closeWindowBtn', '#notepadCloseBtn', '#myComputerCloseBtn']) {
    const b = page.locator(id);
    if (await b.isVisible()) await b.click();
  }
  await settle();
  const dontSave = page.getByRole('button', { name: /^No$|Don.t Save/ });
  if (await dontSave.count()) await dontSave.first().click();
  await settle();

  // Message boxes: error, warning, info.
  for (const icon of ['error', 'warning', 'info']) {
    await app(
      (i) =>
        window.WindoesApp.bsod.showErrorDialog({
          title: 'Windoes',
          text: 'This program has performed an illegal operation and will be shut down.',
          icon: i,
        }),
      icon
    );
    await settle();
    await shotEl(`26-message-box-${icon}`, '.dialog-overlay.active .dialog-box', 2);
    if (icon === 'error') {
      await platformFont('dialog text', '.dialog-overlay.active .dialog-text');
      await platformFont('dialog button', '.dialog-overlay.active .dialog-btn');
      await measure('dialog push button', '.dialog-overlay.active .dialog-btn');
      const btn = page.locator('.dialog-overlay.active .dialog-btn').first();
      const bb = await btn.boundingBox();
      await page.mouse.move(bb.x + 5, bb.y + 5);
      await page.mouse.down();
      await shotEl('27-message-box-button-pressed', '.dialog-overlay.active .dialog-box', 2);
      await page.mouse.move(790, 10);
      await page.mouse.up();
      await settle();
    }
    await app(() => window.WindoesApp.bsod.closeErrorDialog());
    await settle();
  }

  // Run dialog.
  await app(() => window.WindoesApp.runDialog.open());
  await settle();
  await shotEl('28-run-dialog', '.run-dialog .dialog-box', 2);
  await page.keyboard.press('Escape');
  await settle();

  // Shut Down dialog.
  await app(() => window.WindoesApp.state.dispatch({ type: 'SHUTDOWN_DIALOG_OPEN' }));
  await settle();
  await shot('29-shutdown-dialog');
  await app(() => window.WindoesApp.state.dispatch({ type: 'SHUTDOWN_DIALOG_CLOSE' }));
  await settle();

  // Blue screen.
  await app(() => window.WindoesApp.bsod.triggerBSOD());
  await settle();
  await shot('30-bsod');
  await page.keyboard.press('Space');
  await settle();

  writeFileSync(
    path.join(outDir, 'metrics.json'),
    JSON.stringify({ viewport: VIEWPORT, deviceScaleFactor: 1, fonts, geometry }, null, 2) + '\n'
  );
  await context.close();
} finally {
  await browser.close();
  server.close();
}
