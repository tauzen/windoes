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
        return {
          exists: true,
          usesSharedWindowComponent: windowEl.dataset.windowComponent === 'true',
          hasTitlebar: !!windowEl.querySelector('.titlebar'),
          hasMenubar: !!windowEl.querySelector('.menubar'),
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
        return {
          exists: true,
          usesSharedWindowComponent: windowEl.dataset.windowComponent === 'true',
          hasTitlebar: !!windowEl.querySelector('.titlebar'),
          hasMenubar: !!windowEl.querySelector('.menubar'),
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
    assert(ieNotepadWindowComponentShellState.ie.hasView, 'IE window keeps view area');
    assert(
      ieNotepadWindowComponentShellState.notepad.hasTitlebar,
      'Notepad window keeps titlebar chrome'
    );
    assert(
      ieNotepadWindowComponentShellState.notepad.hasMenubar,
      'Notepad window keeps menubar chrome'
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
        return {
          exists: true,
          usesSharedWindowComponent: windowEl.dataset.windowComponent === 'true',
          hasTitlebar: !!windowEl.querySelector('.titlebar'),
          hasMenubar: !!windowEl.querySelector('.menubar'),
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
        return {
          exists: true,
          usesSharedWindowComponent: windowEl.dataset.windowComponent === 'true',
          hasTitlebar: !!windowEl.querySelector('.titlebar'),
          hasMenubar: !!windowEl.querySelector('.menubar'),
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
