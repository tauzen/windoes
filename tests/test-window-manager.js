/**
 * Playwright tests for the WindowManager component.
 *
 * Validates:
 * - Window stack ordering and z-index management
 * - Open/close/minimize/restore lifecycle
 * - Titlebar active/inactive state
 * - Winamp and Minesweeper reopen correctly after close (the original bug)
 * - Taskbar toggle behavior
 * - Show Desktop (minimize all)
 * - Windows with and without chrome behave consistently
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

async function getVisibleWindows(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('.window')]
      .filter((w) => !w.classList.contains('hidden'))
      .map((w) => w.id)
  );
}

async function runTests() {
  const { server, baseUrl } = await startStaticServer(WINDOES_DIR);
  const browser = await launchBrowser();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  let nativeAlertCount = 0;

  page.on('dialog', async (dialog) => {
    nativeAlertCount += 1;
    await dialog.dismiss();
  });

  try {
    // ── Test 1: Winamp open → close → reopen loads iframe correctly ───────
    console.log('\nTest 1: Winamp reopen loads iframe after close');
    await waitForBoot(page, baseUrl);

    await page.dblclick('#iconWinamp');
    await page.waitForTimeout(500);

    const winampSrc1 = await page.evaluate(() =>
      document.getElementById('winampFrame').getAttribute('src')
    );
    assert(
      winampSrc1 && winampSrc1.includes('winamp-player'),
      `First open sets iframe src (got: ${winampSrc1})`
    );

    // Close Winamp (headless window — close via WindowManager API)
    await page.evaluate(() => WindoesApp.WindowManager.close('winamp'));
    await page.waitForTimeout(200);

    // Reopen Winamp
    await page.dblclick('#iconWinamp');
    await page.waitForTimeout(500);

    const winampSrc2 = await page.evaluate(() =>
      document.getElementById('winampFrame').getAttribute('src')
    );
    assert(
      winampSrc2 && winampSrc2.includes('winamp-player'),
      `Reopen sets iframe src again (got: ${winampSrc2})`
    );

    const winampVisible = await page.evaluate(
      () => !document.getElementById('winampWindow').classList.contains('hidden')
    );
    assert(winampVisible, 'Winamp is visible after reopen');

    // Clean up
    await page.evaluate(() => WindoesApp.WindowManager.close('winamp'));
    await page.waitForTimeout(200);

    // ── Test 2: Minesweeper open → close → reopen loads iframe correctly ──
    console.log('\nTest 2: Minesweeper reopen loads iframe after close');

    await page.dblclick('#iconMinesweeper');
    await page.waitForTimeout(500);

    const mineSrc1 = await page.evaluate(() =>
      document.getElementById('minesweeperFrame').getAttribute('src')
    );
    assert(
      mineSrc1 && mineSrc1.includes('minesweeper'),
      `First open sets iframe src (got: ${mineSrc1})`
    );

    await page.click('#minesweeperCloseBtn');
    await page.waitForTimeout(200);

    await page.dblclick('#iconMinesweeper');
    await page.waitForTimeout(500);

    const mineSrc2 = await page.evaluate(() =>
      document.getElementById('minesweeperFrame').getAttribute('src')
    );
    assert(
      mineSrc2 && mineSrc2.includes('minesweeper'),
      `Reopen sets iframe src again (got: ${mineSrc2})`
    );

    await page.click('#minesweeperCloseBtn');
    await page.waitForTimeout(200);

    // ── Test 3: Window stack ordering ─────────────────────────────────────
    console.log('\nTest 3: Window stack z-index ordering');

    // Open three windows in sequence
    await page.dblclick('#iconWinamp');
    await page.waitForTimeout(200);
    await page.dblclick('#iconMinesweeper');
    await page.waitForTimeout(200);
    await page.dblclick('#iconMyComputer');
    await page.waitForTimeout(200);

    // My Computer should be on top (opened last)
    const zIndices = await page.evaluate(() => {
      const winamp = parseInt(document.getElementById('winampWindow').style.zIndex) || 0;
      const minesweeper = parseInt(document.getElementById('minesweeperWindow').style.zIndex) || 0;
      const myComputer = parseInt(document.getElementById('myComputerWindow').style.zIndex) || 0;
      return { winamp, minesweeper, myComputer };
    });

    assert(
      zIndices.myComputer > zIndices.minesweeper,
      `My Computer z-index (${zIndices.myComputer}) > Minesweeper (${zIndices.minesweeper})`
    );
    assert(
      zIndices.minesweeper > zIndices.winamp,
      `Minesweeper z-index (${zIndices.minesweeper}) > Winamp (${zIndices.winamp})`
    );

    // ── Test 4: Clicking a window brings it to front ──────────────────────
    console.log('\nTest 4: Click to bring window to front');

    // Winamp is at the bottom — click it to bring to front
    await page.evaluate(() => {
      document
        .getElementById('winampWindow')
        .dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    await page.waitForTimeout(100);

    const zAfterClick = await page.evaluate(() => {
      const winamp = parseInt(document.getElementById('winampWindow').style.zIndex) || 0;
      const myComputer = parseInt(document.getElementById('myComputerWindow').style.zIndex) || 0;
      return { winamp, myComputer };
    });

    assert(
      zAfterClick.winamp > zAfterClick.myComputer,
      `After click, Winamp z-index (${zAfterClick.winamp}) > My Computer (${zAfterClick.myComputer})`
    );

    // ── Test 5: Titlebar active/inactive state ────────────────────────────
    console.log('\nTest 5: Titlebar active/inactive state');

    const titlebarStates = await page.evaluate(() => {
      const minesweeperTb = document.querySelector('#minesweeperWindow .titlebar');
      const myComputerTb = document.querySelector('#myComputerWindow .titlebar');
      return {
        minesweeperInactive: minesweeperTb.classList.contains('inactive'),
        myComputerInactive: myComputerTb.classList.contains('inactive'),
      };
    });

    // Winamp is headless (no titlebar), so the other visible windows should be inactive.
    assert(titlebarStates.minesweeperInactive, 'Minesweeper titlebar is inactive');
    assert(titlebarStates.myComputerInactive, 'My Computer titlebar is inactive');

    // Focus should move active titlebar class between non-headless windows.
    await page.evaluate(() => {
      WindoesApp.WindowManager.bringToFront('myComputer');
    });
    await page.waitForTimeout(100);

    const afterMyComputerFocus = await page.evaluate(() => {
      const minesweeperTb = document.querySelector('#minesweeperWindow .titlebar');
      const myComputerTb = document.querySelector('#myComputerWindow .titlebar');
      return {
        minesweeperInactive: minesweeperTb.classList.contains('inactive'),
        myComputerInactive: myComputerTb.classList.contains('inactive'),
      };
    });

    assert(!afterMyComputerFocus.myComputerInactive, 'My Computer titlebar is active when focused');
    assert(
      afterMyComputerFocus.minesweeperInactive,
      'Minesweeper titlebar is inactive when My Computer is focused'
    );

    await page.evaluate(() => {
      WindoesApp.WindowManager.bringToFront('minesweeper');
    });
    await page.waitForTimeout(100);

    const afterMinesweeperFocus = await page.evaluate(() => {
      const minesweeperTb = document.querySelector('#minesweeperWindow .titlebar');
      const myComputerTb = document.querySelector('#myComputerWindow .titlebar');
      return {
        minesweeperInactive: minesweeperTb.classList.contains('inactive'),
        myComputerInactive: myComputerTb.classList.contains('inactive'),
      };
    });

    assert(
      !afterMinesweeperFocus.minesweeperInactive,
      'Minesweeper titlebar is active when focused'
    );
    assert(
      afterMinesweeperFocus.myComputerInactive,
      'My Computer titlebar is inactive when Minesweeper is focused'
    );

    // ── Test 6: Minimize via button and restore via taskbar ───────────────
    console.log('\nTest 6: Minimize and restore via taskbar');

    // Minimize Winamp (headless — use WindowManager API)
    await page.evaluate(() => WindoesApp.WindowManager.minimize('winamp'));
    await page.waitForTimeout(100);

    const winampHiddenAfterMin = await page.evaluate(() =>
      document.getElementById('winampWindow').classList.contains('hidden')
    );
    assert(winampHiddenAfterMin, 'Winamp is hidden after minimize');

    const winampTaskVisible = await page.evaluate(
      () => document.getElementById('winampTaskBtn').style.display !== 'none'
    );
    assert(winampTaskVisible, 'Winamp taskbar button still visible after minimize');

    // Restore via taskbar click
    await page.click('#winampTaskBtn');
    await page.waitForTimeout(100);

    const winampVisibleAfterRestore = await page.evaluate(
      () => !document.getElementById('winampWindow').classList.contains('hidden')
    );
    assert(winampVisibleAfterRestore, 'Winamp is visible after taskbar restore');

    // ── Test 7: Taskbar toggle — visible window gets minimized ────────────
    console.log('\nTest 7: Taskbar toggle minimizes visible window');

    // Winamp should be visible now — click taskbar to minimize
    await page.click('#winampTaskBtn');
    await page.waitForTimeout(100);

    const winampHiddenAfterToggle = await page.evaluate(() =>
      document.getElementById('winampWindow').classList.contains('hidden')
    );
    assert(winampHiddenAfterToggle, 'Winamp is hidden after taskbar toggle');

    // ── Test 8: Show Desktop minimizes all windows ────────────────────────
    console.log('\nTest 8: Show Desktop minimizes all');

    // Restore Winamp first
    await page.click('#winampTaskBtn');
    await page.waitForTimeout(100);

    const beforeShowDesktop = await getVisibleWindows(page);
    assert(
      beforeShowDesktop.length >= 2,
      `At least 2 windows visible before Show Desktop (got ${beforeShowDesktop.length})`
    );

    await page.click('.ql-desktop');
    await page.waitForTimeout(100);

    const afterShowDesktop = await getVisibleWindows(page);
    assert(
      afterShowDesktop.length === 0,
      `No windows visible after Show Desktop (got ${afterShowDesktop.length})`
    );

    // ── Test 9: WindowManager stack is accessible ─────────────────────────
    console.log('\nTest 9: WindowManager API available and stack works');

    const hasWM = await page.evaluate(
      () =>
        typeof WindoesApp !== 'undefined' && typeof WindoesApp.WindowManager.getStack === 'function'
    );
    assert(hasWM, 'WindoesApp.WindowManager is accessible globally');

    const stack = await page.evaluate(() => WindoesApp.WindowManager.getStack());
    assert(Array.isArray(stack), 'getStack() returns an array');

    // ── Test 10: Close removes from stack ─────────────────────────────────
    console.log('\nTest 10: Close removes window from stack');

    // Open Winamp, then close it, check stack
    await page.dblclick('#iconWinamp');
    await page.waitForTimeout(200);

    const stackWithWinamp = await page.evaluate(() => WindoesApp.WindowManager.getStack());
    assert(stackWithWinamp.includes('winamp'), 'Stack includes winamp after open');

    await page.evaluate(() => WindoesApp.WindowManager.close('winamp'));
    await page.waitForTimeout(200);

    const stackAfterClose = await page.evaluate(() => WindoesApp.WindowManager.getStack());
    assert(!stackAfterClose.includes('winamp'), 'Stack does not include winamp after close');

    // ── Test 11: Multiple reopen cycles ───────────────────────────────────
    console.log('\nTest 11: Multiple open-close-reopen cycles work');

    for (let i = 0; i < 3; i++) {
      await page.dblclick('#iconWinamp');
      await page.waitForTimeout(300);

      const src = await page.evaluate(() =>
        document.getElementById('winampFrame').getAttribute('src')
      );
      assert(src && src.includes('winamp-player'), `Cycle ${i + 1}: Winamp iframe loaded`);

      const visible = await page.evaluate(
        () => !document.getElementById('winampWindow').classList.contains('hidden')
      );
      assert(visible, `Cycle ${i + 1}: Winamp visible`);

      await page.evaluate(() => WindoesApp.WindowManager.close('winamp'));
      await page.waitForTimeout(200);
    }

    // Same for Minesweeper
    for (let i = 0; i < 3; i++) {
      await page.dblclick('#iconMinesweeper');
      await page.waitForTimeout(300);

      const src = await page.evaluate(() =>
        document.getElementById('minesweeperFrame').getAttribute('src')
      );
      assert(src && src.includes('minesweeper'), `Cycle ${i + 1}: Minesweeper iframe loaded`);

      await page.click('#minesweeperCloseBtn');
      await page.waitForTimeout(200);
    }

    // ── Test 12: Phase 4 window-component migration (slice 1) ──────────────
    console.log('\nTest 12: App + Recycle Bin use shared Window component shell');

    await page.evaluate(() => {
      WindoesApp.open.app('ASCII Runner', './applications/ascii-runner/index.html');
      WindoesApp.open.recycleBin();
    });
    await page.waitForTimeout(300);

    const windowComponentShellState = await page.evaluate(() => {
      const appWindow = document.getElementById('appWindow');
      const recycleBinWindow = document.getElementById('recycleBinWindow');

      function readShellState(windowEl) {
        if (!windowEl) return { exists: false };
        const menubar = windowEl.querySelector('.menubar');
        return {
          exists: true,
          usesSharedWindowComponent: windowEl.dataset.windowComponent === 'true',
          hasTitlebar: !!windowEl.querySelector('.titlebar'),
          hasMenubar: !!menubar,
          menubarRole: menubar?.getAttribute('role') || '',
          menubarHasLabel: !!menubar?.getAttribute('aria-label'),
          menubarItemsAreMenuitems: [...windowEl.querySelectorAll('.menubar .menubar-item')].every(
            (item) => item.getAttribute('role') === 'menuitem'
          ),
          hasView: !!windowEl.querySelector('.view'),
        };
      }

      return {
        app: readShellState(appWindow),
        recycleBin: readShellState(recycleBinWindow),
      };
    });

    assert(windowComponentShellState.app.exists, 'App window exists');
    assert(windowComponentShellState.recycleBin.exists, 'Recycle Bin window exists');
    assert(
      windowComponentShellState.app.usesSharedWindowComponent,
      'App window tagged as shared Window component'
    );
    assert(
      windowComponentShellState.recycleBin.usesSharedWindowComponent,
      'Recycle Bin window tagged as shared Window component'
    );
    assert(windowComponentShellState.app.hasTitlebar, 'App window keeps titlebar chrome');
    assert(windowComponentShellState.app.hasMenubar, 'App window keeps menubar chrome');
    assert(windowComponentShellState.app.hasView, 'App window keeps view area');
    assert(windowComponentShellState.recycleBin.hasTitlebar, 'Recycle Bin keeps titlebar chrome');
    assert(windowComponentShellState.recycleBin.hasMenubar, 'Recycle Bin keeps menubar chrome');
    assert(windowComponentShellState.recycleBin.hasView, 'Recycle Bin keeps view area');

    // ── Test 13: Phase 4 window-component migration (slice 2) ──────────────
    console.log('\nTest 13: IE + Notepad use shared Window component shell');

    await page.evaluate(() => {
      WindoesApp.open.internetExplorer();
      WindoesApp.open.notepad();
    });
    await page.waitForTimeout(300);

    const ieNotepadWindowComponentShellState = await page.evaluate(() => {
      const ieWindow = document.getElementById('ieWindow');
      const notepadWindow = document.getElementById('notepadWindow');

      function readShellState(windowEl) {
        if (!windowEl) return { exists: false };
        const menubar = windowEl.querySelector('.menubar');
        return {
          exists: true,
          usesSharedWindowComponent: windowEl.dataset.windowComponent === 'true',
          hasTitlebar: !!windowEl.querySelector('.titlebar'),
          hasMenubar: !!menubar,
          menubarRole: menubar?.getAttribute('role') || '',
          menubarHasLabel: !!menubar?.getAttribute('aria-label'),
          menubarItemsAreMenuitems: [...windowEl.querySelectorAll('.menubar .menubar-item')].every(
            (item) => item.getAttribute('role') === 'menuitem'
          ),
          hasView: !!windowEl.querySelector('.view'),
        };
      }

      return {
        ie: readShellState(ieWindow),
        notepad: readShellState(notepadWindow),
      };
    });

    assert(ieNotepadWindowComponentShellState.ie.exists, 'IE window exists');
    assert(ieNotepadWindowComponentShellState.notepad.exists, 'Notepad window exists');
    assert(
      ieNotepadWindowComponentShellState.ie.usesSharedWindowComponent,
      'IE window tagged as shared Window component'
    );
    assert(
      ieNotepadWindowComponentShellState.notepad.usesSharedWindowComponent,
      'Notepad window tagged as shared Window component'
    );
    assert(ieNotepadWindowComponentShellState.ie.hasTitlebar, 'IE window keeps titlebar chrome');
    assert(ieNotepadWindowComponentShellState.ie.hasMenubar, 'IE window keeps menubar chrome');
    assert(
      ieNotepadWindowComponentShellState.ie.menubarRole === 'menubar',
      'IE menubar exposes role="menubar"'
    );
    assert(
      ieNotepadWindowComponentShellState.ie.menubarHasLabel,
      'IE menubar exposes an accessible label'
    );
    assert(
      ieNotepadWindowComponentShellState.ie.menubarItemsAreMenuitems,
      'IE menubar items expose role="menuitem"'
    );
    assert(ieNotepadWindowComponentShellState.ie.hasView, 'IE window keeps view area');
    assert(
      ieNotepadWindowComponentShellState.notepad.hasTitlebar,
      'Notepad window keeps titlebar chrome'
    );
    assert(
      ieNotepadWindowComponentShellState.notepad.hasMenubar,
      'Notepad window keeps menubar chrome'
    );
    assert(
      ieNotepadWindowComponentShellState.notepad.menubarRole === 'menubar',
      'Notepad menubar exposes role="menubar"'
    );
    assert(
      ieNotepadWindowComponentShellState.notepad.menubarHasLabel,
      'Notepad menubar exposes an accessible label'
    );
    assert(
      ieNotepadWindowComponentShellState.notepad.menubarItemsAreMenuitems,
      'Notepad menubar items expose role="menuitem"'
    );
    assert(ieNotepadWindowComponentShellState.notepad.hasView, 'Notepad window keeps view area');

    // ── Test 14: Phase 4 window-component migration (slice 3) ──────────────
    console.log('\nTest 14: My Computer + Minesweeper use shared Window component shell');

    await page.evaluate(() => {
      WindoesApp.open.myComputer();
      WindoesApp.open.minesweeper();
    });
    await page.waitForTimeout(300);

    const myComputerMinesweeperWindowComponentShellState = await page.evaluate(() => {
      const myComputerWindow = document.getElementById('myComputerWindow');
      const minesweeperWindow = document.getElementById('minesweeperWindow');

      function readShellState(windowEl) {
        if (!windowEl) return { exists: false };
        const menubar = windowEl.querySelector('.menubar');
        return {
          exists: true,
          usesSharedWindowComponent: windowEl.dataset.windowComponent === 'true',
          hasTitlebar: !!windowEl.querySelector('.titlebar'),
          hasMenubar: !!menubar,
          menubarRole: menubar?.getAttribute('role') || '',
          menubarHasLabel: !!menubar?.getAttribute('aria-label'),
          menubarItemsAreMenuitems: [...windowEl.querySelectorAll('.menubar .menubar-item')].every(
            (item) => item.getAttribute('role') === 'menuitem'
          ),
          hasView: !!windowEl.querySelector('.view'),
        };
      }

      return {
        myComputer: readShellState(myComputerWindow),
        minesweeper: readShellState(minesweeperWindow),
      };
    });

    assert(
      myComputerMinesweeperWindowComponentShellState.myComputer.exists,
      'My Computer window exists'
    );
    assert(
      myComputerMinesweeperWindowComponentShellState.minesweeper.exists,
      'Minesweeper window exists'
    );
    assert(
      myComputerMinesweeperWindowComponentShellState.myComputer.usesSharedWindowComponent,
      'My Computer window tagged as shared Window component'
    );
    assert(
      myComputerMinesweeperWindowComponentShellState.minesweeper.usesSharedWindowComponent,
      'Minesweeper window tagged as shared Window component'
    );
    assert(
      myComputerMinesweeperWindowComponentShellState.myComputer.hasTitlebar,
      'My Computer window keeps titlebar chrome'
    );
    assert(
      myComputerMinesweeperWindowComponentShellState.myComputer.hasMenubar,
      'My Computer window keeps menubar chrome'
    );
    assert(
      myComputerMinesweeperWindowComponentShellState.myComputer.hasView,
      'My Computer window keeps view area'
    );
    assert(
      myComputerMinesweeperWindowComponentShellState.minesweeper.hasTitlebar,
      'Minesweeper window keeps titlebar chrome'
    );
    assert(
      !myComputerMinesweeperWindowComponentShellState.minesweeper.hasMenubar,
      'Minesweeper window remains no-menubar (expected for this window type)'
    );
    assert(
      myComputerMinesweeperWindowComponentShellState.minesweeper.hasView,
      'Minesweeper window keeps view area'
    );

    // ── Test 15: Phase 4 window-component migration (slice 4) ──────────────
    console.log('\nTest 15: Solitaire uses shared Window component shell');

    await page.evaluate(() => {
      WindoesApp.open.solitaire();
    });
    await page.waitForTimeout(300);

    const solitaireWindowComponentShellState = await page.evaluate(() => {
      const solitaireWindow = document.getElementById('solitaireWindow');

      function readShellState(windowEl) {
        if (!windowEl) return { exists: false };
        const menubar = windowEl.querySelector('.menubar');
        return {
          exists: true,
          usesSharedWindowComponent: windowEl.dataset.windowComponent === 'true',
          hasTitlebar: !!windowEl.querySelector('.titlebar'),
          hasMenubar: !!menubar,
          menubarRole: menubar?.getAttribute('role') || '',
          menubarHasLabel: !!menubar?.getAttribute('aria-label'),
          menubarItemsAreMenuitems: [...windowEl.querySelectorAll('.menubar .menubar-item')].every(
            (item) => item.getAttribute('role') === 'menuitem'
          ),
          hasView: !!windowEl.querySelector('.view'),
        };
      }

      return readShellState(solitaireWindow);
    });

    assert(solitaireWindowComponentShellState.exists, 'Solitaire window exists');
    assert(
      solitaireWindowComponentShellState.usesSharedWindowComponent,
      'Solitaire window tagged as shared Window component'
    );
    assert(
      solitaireWindowComponentShellState.hasTitlebar,
      'Solitaire window keeps titlebar chrome'
    );
    assert(
      !solitaireWindowComponentShellState.hasMenubar,
      'Solitaire window remains no-menubar (expected for this window type)'
    );
    assert(solitaireWindowComponentShellState.hasView, 'Solitaire window keeps view area');

    // ── Test 16: Phase 4 window-component migration (slice 5: headless) ────
    console.log('\nTest 16: Winamp headless window is marked as shared component migration');

    await page.evaluate(() => {
      WindoesApp.open.winamp();
    });
    await page.waitForTimeout(300);

    const winampWindowComponentShellState = await page.evaluate(() => {
      const winampWindow = document.getElementById('winampWindow');
      if (!winampWindow) return { exists: false };

      return {
        exists: true,
        usesSharedWindowComponent: winampWindow.dataset.windowComponent === 'true',
        hasTitlebar: !!winampWindow.querySelector('.titlebar'),
        hasMenubar: !!winampWindow.querySelector('.menubar'),
        hasView: !!winampWindow.querySelector('#winampFrame'),
        isHeadless: winampWindow.classList.contains('window-headless'),
      };
    });

    assert(winampWindowComponentShellState.exists, 'Winamp window exists');
    assert(
      winampWindowComponentShellState.usesSharedWindowComponent,
      'Winamp window tagged as shared Window migration component'
    );
    assert(winampWindowComponentShellState.isHeadless, 'Winamp remains headless');
    assert(
      !winampWindowComponentShellState.hasTitlebar,
      'Winamp has no titlebar (headless expected)'
    );
    assert(
      !winampWindowComponentShellState.hasMenubar,
      'Winamp has no menubar (headless expected)'
    );
    assert(winampWindowComponentShellState.hasView, 'Winamp keeps iframe view');

    // ── Test 17: Explorer navigation still works after DOM refactor safety ───
    console.log('\nTest 17: My Computer navigation + address/back/up remain functional');

    await page.evaluate(() => {
      WindoesApp.open.myComputer();
    });
    await page.waitForTimeout(300);

    const explorerInitialState = await page.evaluate(() => {
      const address = document.getElementById('explorerAddress')?.value || '';
      return { address };
    });

    assert(
      explorerInitialState.address === 'My Computer',
      `Explorer starts at My Computer root (got: ${explorerInitialState.address})`
    );

    await page.dblclick('#myComputerWindow .folder-item:has-text("Local Disk (C:)")');
    await page.waitForTimeout(250);

    const explorerAfterNavigate = await page.evaluate(() => {
      const address = document.getElementById('explorerAddress')?.value || '';
      const backDisabled = !!document.getElementById('explorerBackBtn')?.disabled;
      return { address, backDisabled };
    });

    assert(
      explorerAfterNavigate.address === 'C:',
      `Explorer navigates into Local Disk (got: ${explorerAfterNavigate.address})`
    );
    assert(!explorerAfterNavigate.backDisabled, 'Explorer Back is enabled after navigation');

    await page.click('#explorerUpBtn');
    await page.waitForTimeout(250);

    const explorerAfterUp = await page.evaluate(() => ({
      address: document.getElementById('explorerAddress')?.value || '',
    }));

    assert(
      explorerAfterUp.address === 'My Computer',
      `Explorer Up returns to My Computer root (got: ${explorerAfterUp.address})`
    );

    // ── Test 18: Desktop icon interactions survive icon DOM remount ─────────
    console.log('\nTest 18: Desktop icon interactions survive icon DOM remount');

    await page.evaluate(() => {
      const desktopIcons = document.getElementById('desktopIcons');
      if (!desktopIcons) return;
      desktopIcons.innerHTML = desktopIcons.innerHTML;
    });
    await page.waitForTimeout(100);

    await page.click('#iconMyComputer');
    const selectedAfterRemount = await page.evaluate(() => {
      return document.getElementById('iconMyComputer')?.classList.contains('selected') || false;
    });
    assert(selectedAfterRemount, 'My Computer icon can still be selected after icons DOM remount');

    await page.evaluate(() => {
      WindoesApp.open.minesweeper();
    });
    await page.waitForTimeout(250);

    const beforeDesktopReopenFocus = await page.evaluate(() => {
      const myComputerWindow = document.getElementById('myComputerWindow');
      const minesweeperWindow = document.getElementById('minesweeperWindow');
      return {
        myComputerZ: Number(myComputerWindow?.style?.zIndex || 0),
        minesweeperZ: Number(minesweeperWindow?.style?.zIndex || 0),
      };
    });

    await page.dblclick('#iconMyComputer');
    await page.waitForTimeout(300);

    const afterDesktopReopenFocus = await page.evaluate(() => {
      const myComputerWindow = document.getElementById('myComputerWindow');
      const minesweeperWindow = document.getElementById('minesweeperWindow');
      return {
        myComputerExists: !!myComputerWindow,
        myComputerZ: Number(myComputerWindow?.style?.zIndex || 0),
        minesweeperZ: Number(minesweeperWindow?.style?.zIndex || 0),
      };
    });
    assert(
      afterDesktopReopenFocus.myComputerExists,
      'My Computer window exists after icon activate'
    );
    assert(
      afterDesktopReopenFocus.myComputerZ > beforeDesktopReopenFocus.myComputerZ,
      `My Computer z-index increases after icon activate (${beforeDesktopReopenFocus.myComputerZ} -> ${afterDesktopReopenFocus.myComputerZ})`
    );
    assert(
      afterDesktopReopenFocus.myComputerZ > afterDesktopReopenFocus.minesweeperZ,
      `My Computer is focused above Minesweeper after icon activate (${afterDesktopReopenFocus.myComputerZ} > ${afterDesktopReopenFocus.minesweeperZ})`
    );

    // ── Test 19: My Computer reopen resets explorer navigation state ─────────
    console.log('\nTest 19: My Computer reopen resets explorer navigation state');

    await page.dblclick('#myComputerWindow .folder-item:has-text("Local Disk (C:)")');
    await page.waitForTimeout(250);

    await page.evaluate(() => {
      WindoesApp.WindowManager.close('myComputerWindow');
    });
    await page.waitForTimeout(250);

    await page.dblclick('#iconMyComputer');
    await page.waitForTimeout(300);

    const explorerReopenState = await page.evaluate(() => ({
      address: document.getElementById('explorerAddress')?.value || '',
      backDisabled: !!document.getElementById('explorerBackBtn')?.disabled,
    }));

    assert(
      explorerReopenState.address === 'My Computer',
      `Reopened explorer starts at My Computer root (got: ${explorerReopenState.address})`
    );
    assert(explorerReopenState.backDisabled, 'Reopened explorer Back is disabled at root');

    // ── Test 20: My Computer toolbar is componentized and keeps nav behavior ─
    console.log(
      '\nTest 20: My Computer toolbar component renders and navigation controls still work'
    );

    const myComputerToolbarComponentState = await page.evaluate(() => {
      const marker = document.querySelector(
        '#myComputerWindow [data-my-computer-component="true"]'
      );
      return {
        markerExists: !!marker,
      };
    });

    assert(
      myComputerToolbarComponentState.markerExists,
      'My Computer toolbar has componentized marker'
    );

    await page.dblclick('#myComputerWindow .folder-item:has-text("Local Disk (C:)")');
    await page.waitForTimeout(250);
    await page.click('#explorerBackBtn');
    await page.waitForTimeout(250);

    const myComputerToolbarAfterBack = await page.evaluate(() => ({
      address: document.getElementById('explorerAddress')?.value || '',
      backDisabled: !!document.getElementById('explorerBackBtn')?.disabled,
    }));

    assert(
      myComputerToolbarAfterBack.address === 'My Computer',
      `Toolbar Back returns to My Computer root (got: ${myComputerToolbarAfterBack.address})`
    );
    assert(myComputerToolbarAfterBack.backDisabled, 'Toolbar Back is disabled again at root');

    // ── Test 21: Shell removes global DOM bridge and keeps Start menu behavior ─
    console.log('\nTest 21: Start menu works without WindoesApp.dom bridge');

    const shellBridgeState = await page.evaluate(() => ({
      hasDomBridge: Object.prototype.hasOwnProperty.call(WindoesApp, 'dom'),
      startMenuOpen: document.getElementById('startMenu')?.classList.contains('open') || false,
    }));
    assert(!shellBridgeState.hasDomBridge, 'WindoesApp.dom bridge is removed');
    assert(!shellBridgeState.startMenuOpen, 'Start menu starts closed');

    await page.click('#startButton');
    await page.waitForTimeout(120);

    const startMenuAfterOpen = await page.evaluate(() => ({
      startMenuOpen: document.getElementById('startMenu')?.classList.contains('open') || false,
      startPressed: document.getElementById('startButton')?.classList.contains('pressed') || false,
    }));
    assert(startMenuAfterOpen.startMenuOpen, 'Start button opens Start menu');
    assert(startMenuAfterOpen.startPressed, 'Start button pressed state follows Start menu open');

    await page.click('#startButton');
    await page.waitForTimeout(120);

    const startMenuAfterClose = await page.evaluate(() => ({
      startMenuOpen: document.getElementById('startMenu')?.classList.contains('open') || false,
      startPressed: document.getElementById('startButton')?.classList.contains('pressed') || false,
    }));
    assert(!startMenuAfterClose.startMenuOpen, 'Start button closes Start menu');
    assert(!startMenuAfterClose.startPressed, 'Start button pressed state clears when menu closes');

    // ── Test 22: My Computer folder view is React-componentized ───────────────
    console.log('\nTest 22: My Computer folder view component marker and nav still work');

    await page.dblclick('#iconMyComputer');
    await page.waitForTimeout(250);

    const myComputerViewComponentState = await page.evaluate(() => ({
      hasViewMarker: !!document.querySelector(
        '#myComputerWindow [data-my-computer-view-component="true"]'
      ),
      rootItemCount: document.querySelectorAll('#myComputerWindow .folder-item').length,
    }));

    assert(myComputerViewComponentState.hasViewMarker, 'My Computer view has component marker');
    assert(
      myComputerViewComponentState.rootItemCount >= 4,
      `My Computer root view renders expected items (got ${myComputerViewComponentState.rootItemCount})`
    );

    // ── Test 23: Start menu accessibility semantics + declarative submenu positioning ─
    console.log('\nTest 23: Start menu accessibility semantics and submenu positioning state');

    await page.click('#startButton');
    await page.waitForTimeout(120);
    await page.hover('#menuPrograms');
    await page.waitForTimeout(120);
    await page.hover('#subAccessories');
    await page.waitForTimeout(120);
    await page.hover('#subAccGames');
    await page.waitForTimeout(120);

    const startMenuAccessibilityState = await page.evaluate(() => {
      const startButton = document.getElementById('startButton');
      const startMenu = document.getElementById('startMenu');
      const menuPrograms = document.getElementById('menuPrograms');
      const programsSubmenu = document.getElementById('programsSubmenu');
      const accessoriesSubmenu = document.getElementById('accessoriesSubmenu');
      const gamesSubmenu = document.getElementById('gamesSubmenu');
      const subAccessories = document.getElementById('subAccessories');
      const subAccGames = document.getElementById('subAccGames');

      return {
        startButtonHasPopup: startButton?.getAttribute('aria-haspopup') === 'menu',
        startButtonControls: startButton?.getAttribute('aria-controls') === 'startMenu',
        startButtonExpanded: startButton?.getAttribute('aria-expanded') === 'true',
        startMenuRole: startMenu?.getAttribute('role') === 'menu',
        menuProgramsRole: menuPrograms?.getAttribute('role') === 'menuitem',
        menuProgramsHasPopup: menuPrograms?.getAttribute('aria-haspopup') === 'menu',
        menuProgramsExpanded: menuPrograms?.getAttribute('aria-expanded') === 'true',
        subAccessoriesRole: subAccessories?.getAttribute('role') === 'menuitem',
        subAccessoriesHasPopup: subAccessories?.getAttribute('aria-haspopup') === 'menu',
        subAccessoriesExpanded: subAccessories?.getAttribute('aria-expanded') === 'true',
        subAccGamesExpanded: subAccGames?.getAttribute('aria-expanded') === 'true',
        programsSubmenuRole: programsSubmenu?.getAttribute('role') === 'menu',
        accessoriesSubmenuRole: accessoriesSubmenu?.getAttribute('role') === 'menu',
        gamesSubmenuRole: gamesSubmenu?.getAttribute('role') === 'menu',
        programsBottomSet: !!programsSubmenu?.style?.bottom,
        accessoriesPositionSet:
          !!accessoriesSubmenu?.style?.bottom && !!accessoriesSubmenu?.style?.left,
        gamesPositionSet: !!gamesSubmenu?.style?.bottom && !!gamesSubmenu?.style?.left,
      };
    });

    assert(
      startMenuAccessibilityState.startButtonHasPopup,
      'Start button exposes aria-haspopup=menu'
    );
    assert(
      startMenuAccessibilityState.startButtonControls,
      'Start button controls start menu by id'
    );
    assert(
      startMenuAccessibilityState.startButtonExpanded,
      'Start button aria-expanded tracks open state'
    );
    assert(startMenuAccessibilityState.startMenuRole, 'Start menu uses role="menu"');
    assert(startMenuAccessibilityState.menuProgramsRole, 'Programs trigger uses role="menuitem"');
    assert(
      startMenuAccessibilityState.menuProgramsHasPopup,
      'Programs trigger exposes aria-haspopup'
    );
    assert(
      startMenuAccessibilityState.menuProgramsExpanded,
      'Programs trigger aria-expanded is true when open'
    );
    assert(
      startMenuAccessibilityState.subAccessoriesRole,
      'Accessories trigger uses role="menuitem"'
    );
    assert(
      startMenuAccessibilityState.subAccessoriesHasPopup,
      'Accessories trigger exposes aria-haspopup'
    );
    assert(
      startMenuAccessibilityState.subAccessoriesExpanded,
      'Accessories trigger aria-expanded is true when submenu open'
    );
    assert(
      startMenuAccessibilityState.subAccGamesExpanded,
      'Games trigger aria-expanded is true when open'
    );
    assert(startMenuAccessibilityState.programsSubmenuRole, 'Programs submenu uses role="menu"');
    assert(
      startMenuAccessibilityState.accessoriesSubmenuRole,
      'Accessories submenu uses role="menu"'
    );
    assert(startMenuAccessibilityState.gamesSubmenuRole, 'Games submenu uses role="menu"');
    assert(
      startMenuAccessibilityState.programsBottomSet,
      'Programs submenu has computed bottom style'
    );
    assert(
      startMenuAccessibilityState.accessoriesPositionSet,
      'Accessories submenu has computed left/bottom style'
    );
    assert(
      startMenuAccessibilityState.gamesPositionSet,
      'Games submenu has computed left/bottom style'
    );

    // ── Test 24: Launching from nested Start submenu closes all Start layers ─
    console.log('\nTest 24: Start submenus fully close after launching Notepad');

    await page.click('#subAccNotepad');
    await page.waitForTimeout(150);

    const startMenuLaunchState = await page.evaluate(() => ({
      startMenuOpen: document.getElementById('startMenu')?.classList.contains('open') || false,
      programsOpen: document.getElementById('programsSubmenu')?.classList.contains('open') || false,
      accessoriesOpen:
        document.getElementById('accessoriesSubmenu')?.classList.contains('open') || false,
      gamesOpen: document.getElementById('gamesSubmenu')?.classList.contains('open') || false,
      notepadVisible: !document.getElementById('notepadWindow')?.classList.contains('hidden'),
    }));

    assert(startMenuLaunchState.notepadVisible, 'Notepad opens from Start submenu launch');
    assert(!startMenuLaunchState.startMenuOpen, 'Start menu closes after launching Notepad');
    assert(!startMenuLaunchState.programsOpen, 'Programs submenu closes after launching Notepad');
    assert(
      !startMenuLaunchState.accessoriesOpen,
      'Accessories submenu closes after launching Notepad'
    );
    assert(!startMenuLaunchState.gamesOpen, 'Nested Games submenu closes after launching Notepad');

    // ── Test 25: IE Favorites/History use Windoes error dialog (no native alert) ─
    console.log('\nTest 25: IE Favorites/History avoid native alert and use error dialog');

    await page.evaluate(() => WindoesApp.open.internetExplorer());
    await page.waitForTimeout(150);

    const alertCountBefore = nativeAlertCount;

    await page.click('#favoritesBtn');
    await page.waitForTimeout(150);

    const favoritesDialogState = await page.evaluate(() => {
      const dialog = document.getElementById('errorDialog');
      return {
        open: dialog?.classList.contains('active') || false,
        title: document.getElementById('errorDialogTitle')?.textContent || '',
      };
    });

    assert(nativeAlertCount === alertCountBefore, 'Favorites action does not trigger native alert');
    assert(favoritesDialogState.open, 'Favorites action opens Windoes dialog');
    assert(
      favoritesDialogState.title.includes('Favorites'),
      `Favorites dialog title is descriptive (got: ${favoritesDialogState.title})`
    );

    await page.click('#errorOkBtn');
    await page.waitForTimeout(100);

    const alertCountAfterFavorites = nativeAlertCount;

    await page.click('#historyBtn');
    await page.waitForTimeout(150);

    const historyDialogState = await page.evaluate(() => {
      const dialog = document.getElementById('errorDialog');
      return {
        open: dialog?.classList.contains('active') || false,
        title: document.getElementById('errorDialogTitle')?.textContent || '',
      };
    });

    assert(
      nativeAlertCount === alertCountAfterFavorites,
      'History action does not trigger native alert'
    );
    assert(historyDialogState.open, 'History action opens Windoes dialog');
    assert(
      historyDialogState.title.includes('History'),
      `History dialog title is descriptive (got: ${historyDialogState.title})`
    );

    await page.click('#errorOkBtn');
    await page.waitForTimeout(100);

    // ── Test 26: Dialog focus trap + focus restore across Run/Error/Notepad/Shutdown ─
    console.log('\nTest 26: Dialogs trap Tab focus and restore opener focus on close');

    // Run dialog: focus starts on input, Tab loops within controls, close restores opener
    await page.evaluate(() => {
      const startButton = document.getElementById('startButton');
      startButton?.focus();
      WindoesApp.runDialog.open();
    });
    await page.waitForTimeout(120);

    const runDialogFocusState = await page.evaluate(() => ({
      activeId: document.activeElement?.id || '',
      isOpen: document.getElementById('runDialog')?.classList.contains('active') || false,
    }));
    assert(runDialogFocusState.isOpen, 'Run dialog opens');
    assert(runDialogFocusState.activeId === 'runInput', 'Run dialog initially focuses input');

    await page.keyboard.press('Tab'); // runOkBtn
    await page.keyboard.press('Tab'); // runCancelBtn
    await page.keyboard.press('Tab'); // Browse...
    await page.keyboard.press('Tab'); // close button
    await page.keyboard.press('Tab'); // loops back to input

    const runLoopFocusId = await page.evaluate(() => document.activeElement?.id || '');
    assert(runLoopFocusId === 'runInput', 'Run dialog traps Tab and loops back to first focusable');

    await page.click('#runCancelBtn');
    await page.waitForTimeout(100);

    const runRestoreFocusId = await page.evaluate(() => document.activeElement?.id || '');
    assert(runRestoreFocusId === 'startButton', 'Run dialog close restores focus to opener');

    // Error dialog: open via IE Favorites and ensure focus restores to favorites button
    await page.click('#favoritesBtn');
    await page.waitForTimeout(120);

    const errorDialogOpenState = await page.evaluate(() => ({
      activeId: document.activeElement?.id || '',
      isOpen: document.getElementById('errorDialog')?.classList.contains('active') || false,
    }));
    assert(errorDialogOpenState.isOpen, 'Error dialog opens');
    assert(
      errorDialogOpenState.activeId === 'errorOkBtn',
      'Error dialog initially focuses OK button'
    );

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const errorLoopFocusId = await page.evaluate(() => document.activeElement?.id || '');
    assert(errorLoopFocusId === 'errorOkBtn', 'Error dialog traps Tab focus within dialog');

    await page.click('#errorOkBtn');
    await page.waitForTimeout(100);

    const errorRestoreFocusId = await page.evaluate(() => document.activeElement?.id || '');
    assert(errorRestoreFocusId === 'favoritesBtn', 'Error dialog close restores focus to opener');

    // Notepad Save dialog: open from focused file menu and close restores focus
    await page.evaluate(() => {
      const fileMenu = document.getElementById('notepadFileMenu');
      fileMenu?.focus();
      WindoesApp.state.dispatch({
        type: 'NOTEPAD_SAVE_DIALOG_OPEN',
        path: '/C:/My Documents/Untitled.txt',
      });
    });
    await page.waitForTimeout(120);

    const saveDialogOpenState = await page.evaluate(() => ({
      activeId: document.activeElement?.id || '',
      isOpen: document.getElementById('notepadSaveDialog')?.classList.contains('active') || false,
    }));
    assert(saveDialogOpenState.isOpen, 'Notepad Save dialog opens');
    assert(
      saveDialogOpenState.activeId === 'notepadSavePathInput',
      'Save dialog initially focuses path input'
    );

    await page.keyboard.press('Tab'); // Save
    await page.keyboard.press('Tab'); // Cancel
    await page.keyboard.press('Tab'); // Close
    await page.keyboard.press('Tab'); // loops back to input

    const saveLoopFocusId = await page.evaluate(() => document.activeElement?.id || '');
    assert(saveLoopFocusId === 'notepadSavePathInput', 'Save dialog traps Tab and loops focus');

    await page.click('#notepadSaveCancelBtn');
    await page.waitForTimeout(100);

    const saveRestoreFocusId = await page.evaluate(() => document.activeElement?.id || '');
    assert(saveRestoreFocusId === 'notepadFileMenu', 'Save dialog close restores focus to opener');

    // Shutdown dialog: opener focus restored and focus trapped among controls
    await page.evaluate(() => {
      const startButton = document.getElementById('startButton');
      startButton?.focus();
      WindoesApp.state.dispatch({ type: 'SHUTDOWN_DIALOG_OPEN' });
    });
    await page.waitForTimeout(120);

    const shutdownOpenState = await page.evaluate(() => ({
      activeId: document.activeElement?.id || '',
      isOpen: document.getElementById('shutdownDialog')?.classList.contains('active') || false,
    }));
    assert(shutdownOpenState.isOpen, 'Shutdown dialog opens');
    assert(
      shutdownOpenState.activeId === 'shutdownOkBtn',
      'Shutdown dialog initially focuses OK button'
    );

    await page.keyboard.press('Shift+Tab');

    const shutdownShiftTabState = await page.evaluate(() => {
      const active = document.activeElement;
      const dialog = document.querySelector('#shutdownDialog .dialog-box');
      return {
        activeId: active?.id || '',
        withinDialog: !!(active && dialog && dialog.contains(active)),
      };
    });
    assert(
      shutdownShiftTabState.withinDialog && shutdownShiftTabState.activeId !== 'shutdownOkBtn',
      'Shutdown dialog keeps Shift+Tab focus trapped within dialog'
    );

    await page.keyboard.press('Tab');

    const shutdownLoopFocusId = await page.evaluate(() => document.activeElement?.id || '');
    assert(shutdownLoopFocusId === 'shutdownOkBtn', 'Shutdown dialog traps Tab and loops focus');

    await page.click('#shutdownCancelBtn');
    await page.waitForTimeout(120);

    const shutdownRestoreFocusId = await page.evaluate(() => document.activeElement?.id || '');
    assert(
      shutdownRestoreFocusId === 'startButton',
      'Shutdown dialog close restores focus to opener'
    );

    // ── Test 27: Decorative shell icons are aria-hidden ─
    console.log('\nTest 27: Decorative shell icons are hidden from assistive tech');

    const decorativeIconState = await page.evaluate(() => {
      const selectors = {
        desktopIconGraphic: '.desktop-icons .icon .icon-graphic',
        runDialogIcon: '#runDialog .dialog-icon',
        errorDialogIcon: '#errorDialogIcon',
        notepadSaveDialogIcon: '#notepadSaveDialog .dialog-icon',
        titlebarLogo: '#ieWindow .title-logo',
        taskbarWindowIcon: '#taskButton .task-icon',
      };

      const state = {};
      for (const [key, selector] of Object.entries(selectors)) {
        const el = document.querySelector(selector);
        state[key] = {
          exists: !!el,
          ariaHidden: el?.getAttribute('aria-hidden') === 'true',
        };
      }
      return state;
    });

    for (const [key, info] of Object.entries(decorativeIconState)) {
      assert(info.exists, `${key} exists`);
      assert(info.ariaHidden, `${key} has aria-hidden="true"`);
    }

    // ── Test 28: Menu items are semantic controls (button or role=menuitem) ─
    console.log('\nTest 28: Menu items use semantic controls for accessibility');

    const menuSemanticsState = await page.evaluate(() => {
      const selectors = {
        startMenuItems: '.start-menu .menu-item, .start-menu .submenu-item',
        desktopContextItems: '#contextMenu .context-menu-item',
        explorerContextItems: '#explorerContextMenu .context-menu-item',
        notepadFileItems: '#notepadFileDropdown .context-menu-item',
        menubarItems: '.window .menubar .menubar-item',
      };

      const result = {};
      for (const [key, selector] of Object.entries(selectors)) {
        const nodes = [...document.querySelectorAll(selector)];
        result[key] = {
          count: nodes.length,
          allSemantic: nodes.every((node) => {
            const isButton = node.tagName === 'BUTTON';
            const hasMenuitemRole = node.getAttribute('role') === 'menuitem';
            return isButton || hasMenuitemRole;
          }),
          nonSemanticExamples: nodes
            .filter((node) => {
              const isButton = node.tagName === 'BUTTON';
              const hasMenuitemRole = node.getAttribute('role') === 'menuitem';
              return !(isButton || hasMenuitemRole);
            })
            .slice(0, 3)
            .map(
              (node) =>
                `${node.tagName.toLowerCase()}#${node.id || '(no-id)'}.${node.className || ''}`
            ),
        };
      }

      return result;
    });

    for (const [key, info] of Object.entries(menuSemanticsState)) {
      assert(info.count > 0, `${key} exposes at least one menu item (got ${info.count})`);
      assert(
        info.allSemantic,
        `${key} menu items are semantic controls${
          info.nonSemanticExamples.length
            ? ` (non-semantic: ${info.nonSemanticExamples.join(', ')})`
            : ''
        }`
      );
    }
  } finally {
    await browser.close();
    server.close();
  }

  // ── Summary ───────────────────────────────────────────────────────────
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error('TESTS FAILED');
    process.exit(1);
  } else {
    console.log('ALL TESTS PASSED');
  }
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
