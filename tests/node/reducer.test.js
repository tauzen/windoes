const test = require('node:test');
const assert = require('node:assert/strict');

let reducerModulePromise;
function loadReducerModule() {
  if (!reducerModulePromise) {
    reducerModulePromise = import('../../windoes/app-state-reducer.mjs');
  }
  return reducerModulePromise;
}

async function freshState() {
  const { initialState } = await loadReducerModule();
  return structuredClone(initialState);
}

test('BOOT_RESET resets boot and preserves custom splash status', async () => {
  const { reduce } = await loadReducerModule();
  const current = await freshState();
  current.boot.done = true;
  const next = reduce(current, { type: 'BOOT_RESET', splashStatus: 'Loading modules...' });
  assert.equal(next.boot.done, false);
  assert.equal(next.boot.phase, 'bios');
  assert.equal(next.boot.splashStatus, 'Loading modules...');
});

test('BOOT_BIOS_PROGRESS updates bios memory', async () => {
  const { reduce } = await loadReducerModule();
  const next = reduce(await freshState(), { type: 'BOOT_BIOS_PROGRESS', value: 12345 });
  assert.equal(next.boot.biosMemory, 12345);
});

test('BOOT_BIOS_STATUS updates bios status', async () => {
  const { reduce } = await loadReducerModule();
  const next = reduce(await freshState(), {
    type: 'BOOT_BIOS_STATUS',
    value: 'Checking drives...',
  });
  assert.equal(next.boot.biosStatus, 'Checking drives...');
});

test('BOOT_PHASE_SPLASH enters splash phase', async () => {
  const { reduce } = await loadReducerModule();
  const next = reduce(await freshState(), {
    type: 'BOOT_PHASE_SPLASH',
    status: 'Starting shell...',
  });
  assert.equal(next.boot.phase, 'splash');
  assert.equal(next.boot.splashProgress, 0);
  assert.equal(next.boot.splashStatus, 'Starting shell...');
});

test('BOOT_SPLASH_PROGRESS updates progress and optional status', async () => {
  const { reduce } = await loadReducerModule();
  const current = await freshState();
  const next = reduce(current, {
    type: 'BOOT_SPLASH_PROGRESS',
    progress: 44,
    status: 'Almost there...',
  });
  assert.equal(next.boot.splashProgress, 44);
  assert.equal(next.boot.splashStatus, 'Almost there...');
});

test('BOOT_FINISH marks boot as complete', async () => {
  const { reduce } = await loadReducerModule();
  const next = reduce(await freshState(), { type: 'BOOT_FINISH' });
  assert.equal(next.boot.phase, 'ready');
  assert.equal(next.boot.splashProgress, 100);
  assert.equal(next.boot.done, true);
});

test('WINDOW_REGISTER creates default window state', async () => {
  const { reduce } = await loadReducerModule();
  const next = reduce(await freshState(), { type: 'WINDOW_REGISTER', id: 'a' });
  assert.equal(next.windows.byId.a.open, false);
  assert.equal(next.windows.byId.a.minimized, false);
  assert.equal(next.windows.byId.a.maximized, false);
  assert.equal(next.windows.byId.a.focused, false);
  assert.equal(next.windows.byId.a.taskbarVisible, false);
});

test('WINDOW_OPEN opens window, makes taskbar visible, and focuses it', async () => {
  const { reduce } = await loadReducerModule();
  let next = reduce(await freshState(), { type: 'WINDOW_REGISTER', id: 'a' });
  next = reduce(next, { type: 'WINDOW_OPEN', id: 'a' });
  assert.deepEqual(next.windows.stack, ['a']);
  assert.equal(next.windows.focusedId, 'a');
  assert.equal(next.windows.byId.a.open, true);
  assert.equal(next.windows.byId.a.taskbarVisible, true);
  assert.equal(next.windows.byId.a.focused, true);
});

test('WINDOW_MINIMIZE removes from stack and keeps taskbar visible', async () => {
  const { reduce } = await loadReducerModule();
  let next = reduce(await freshState(), { type: 'WINDOW_REGISTER', id: 'a' });
  next = reduce(next, { type: 'WINDOW_OPEN', id: 'a' });
  next = reduce(next, { type: 'WINDOW_MINIMIZE', id: 'a' });
  assert.deepEqual(next.windows.stack, []);
  assert.equal(next.windows.byId.a.open, false);
  assert.equal(next.windows.byId.a.minimized, true);
  assert.equal(next.windows.byId.a.taskbarVisible, true);
});

test('WINDOW_RESTORE reopens a minimized window and focuses it', async () => {
  const { reduce } = await loadReducerModule();
  let next = reduce(await freshState(), { type: 'WINDOW_REGISTER', id: 'a' });
  next = reduce(next, { type: 'WINDOW_OPEN', id: 'a' });
  next = reduce(next, { type: 'WINDOW_MINIMIZE', id: 'a' });
  next = reduce(next, { type: 'WINDOW_RESTORE', id: 'a' });
  assert.deepEqual(next.windows.stack, ['a']);
  assert.equal(next.windows.byId.a.open, true);
  assert.equal(next.windows.byId.a.minimized, false);
  assert.equal(next.windows.byId.a.focused, true);
});

test('WINDOW_FOCUS reorders stack to focused topmost window', async () => {
  const { reduce } = await loadReducerModule();
  let next = reduce(await freshState(), { type: 'WINDOW_REGISTER', id: 'a' });
  next = reduce(next, { type: 'WINDOW_REGISTER', id: 'b' });
  next = reduce(next, { type: 'WINDOW_OPEN', id: 'a' });
  next = reduce(next, { type: 'WINDOW_OPEN', id: 'b' });
  next = reduce(next, { type: 'WINDOW_FOCUS', id: 'a' });
  assert.deepEqual(next.windows.stack, ['b', 'a']);
  assert.equal(next.windows.focusedId, 'a');
});

test('WINDOW_MAXIMIZE_TOGGLE toggles maximized state', async () => {
  const { reduce } = await loadReducerModule();
  let next = reduce(await freshState(), { type: 'WINDOW_REGISTER', id: 'a' });
  next = reduce(next, { type: 'WINDOW_OPEN', id: 'a' });
  next = reduce(next, { type: 'WINDOW_MAXIMIZE_TOGGLE', id: 'a' });
  assert.equal(next.windows.byId.a.maximized, true);
  next = reduce(next, { type: 'WINDOW_MAXIMIZE_TOGGLE', id: 'a' });
  assert.equal(next.windows.byId.a.maximized, false);
});

test('WINDOW_CLOSE closes window and hides taskbar button', async () => {
  const { reduce } = await loadReducerModule();
  let next = reduce(await freshState(), { type: 'WINDOW_REGISTER', id: 'a' });
  next = reduce(next, { type: 'WINDOW_OPEN', id: 'a' });
  next = reduce(next, { type: 'WINDOW_CLOSE', id: 'a' });
  assert.deepEqual(next.windows.stack, []);
  assert.equal(next.windows.focusedId, null);
  assert.equal(next.windows.byId.a.open, false);
  assert.equal(next.windows.byId.a.minimized, false);
  assert.equal(next.windows.byId.a.taskbarVisible, false);
});

test('EXPLORER_CONTEXT_OPEN opens context menu and sets selection', async () => {
  const { reduce } = await loadReducerModule();
  const next = reduce(await freshState(), {
    type: 'EXPLORER_CONTEXT_OPEN',
    x: 12,
    y: 34,
    selectedPath: '/C:/x',
  });
  assert.equal(next.explorer.contextMenuOpen, true);
  assert.equal(next.explorer.contextMenuX, 12);
  assert.equal(next.explorer.contextMenuY, 34);
  assert.equal(next.explorer.selectedPath, '/C:/x');
});

test('EXPLORER_CONTEXT_CLOSE closes menu when open', async () => {
  const { reduce } = await loadReducerModule();
  const current = await freshState();
  current.explorer.contextMenuOpen = true;
  current.explorer.selectedPath = '/C:/x';
  const next = reduce(current, { type: 'EXPLORER_CONTEXT_CLOSE' });
  assert.equal(next.explorer.contextMenuOpen, false);
  assert.equal(next.explorer.selectedPath, null);
});

test('NOTEPAD_FILE_MENU_OPEN opens menu and records coordinates', async () => {
  const { reduce } = await loadReducerModule();
  const next = reduce(await freshState(), { type: 'NOTEPAD_FILE_MENU_OPEN', left: 7, top: 9 });
  assert.equal(next.notepad.fileMenuOpen, true);
  assert.equal(next.notepad.fileMenuLeft, 7);
  assert.equal(next.notepad.fileMenuTop, 9);
});

test('NOTEPAD_FILE_MENU_CLOSE closes open menu', async () => {
  const { reduce } = await loadReducerModule();
  const current = await freshState();
  current.notepad.fileMenuOpen = true;
  const next = reduce(current, { type: 'NOTEPAD_FILE_MENU_CLOSE' });
  assert.equal(next.notepad.fileMenuOpen, false);
});

test('NOTEPAD_SAVE_DIALOG_OPEN opens dialog with custom path', async () => {
  const { reduce } = await loadReducerModule();
  const next = reduce(await freshState(), {
    type: 'NOTEPAD_SAVE_DIALOG_OPEN',
    path: '/C:/My Documents/foo.txt',
  });
  assert.equal(next.notepad.saveDialogOpen, true);
  assert.equal(next.notepad.saveDialogPath, '/C:/My Documents/foo.txt');
});

test('NOTEPAD_SAVE_DIALOG_SET_PATH updates dialog path', async () => {
  const { reduce } = await loadReducerModule();
  const next = reduce(await freshState(), {
    type: 'NOTEPAD_SAVE_DIALOG_SET_PATH',
    path: '/C:/tmp.txt',
  });
  assert.equal(next.notepad.saveDialogPath, '/C:/tmp.txt');
});

test('NOTEPAD_SAVE_DIALOG_CLOSE closes open dialog', async () => {
  const { reduce } = await loadReducerModule();
  const current = await freshState();
  current.notepad.saveDialogOpen = true;
  const next = reduce(current, { type: 'NOTEPAD_SAVE_DIALOG_CLOSE' });
  assert.equal(next.notepad.saveDialogOpen, false);
});

test('SHUTDOWN_DIALOG_OPEN opens shutdown dialog', async () => {
  const { reduce } = await loadReducerModule();
  const next = reduce(await freshState(), { type: 'SHUTDOWN_DIALOG_OPEN' });
  assert.equal(next.dialogs.shutdownOpen, true);
});

test('SHUTDOWN_DIALOG_CLOSE closes shutdown dialog', async () => {
  const { reduce } = await loadReducerModule();
  const current = await freshState();
  current.dialogs.shutdownOpen = true;
  const next = reduce(current, { type: 'SHUTDOWN_DIALOG_CLOSE' });
  assert.equal(next.dialogs.shutdownOpen, false);
});

test('SHUTDOWN_SCREEN_SHOW closes dialog and marks shutdown screen visible', async () => {
  const { reduce } = await loadReducerModule();
  const current = await freshState();
  current.dialogs.shutdownOpen = true;
  const next = reduce(current, { type: 'SHUTDOWN_SCREEN_SHOW' });
  assert.equal(next.dialogs.shutdownOpen, false);
  assert.equal(next.dialogs.shutdownScreenVisible, true);
});

test('SHUTDOWN_SCREEN_HIDE hides shutdown screen', async () => {
  const { reduce } = await loadReducerModule();
  const current = await freshState();
  current.dialogs.shutdownScreenVisible = true;
  const next = reduce(current, { type: 'SHUTDOWN_SCREEN_HIDE' });
  assert.equal(next.dialogs.shutdownScreenVisible, false);
});

test('START_MENU_TOGGLE opens then closes the start menu', async () => {
  const { reduce } = await loadReducerModule();
  let next = reduce(await freshState(), { type: 'START_MENU_TOGGLE' });
  assert.equal(next.menus.startOpen, true);
  next = reduce(next, { type: 'START_MENU_TOGGLE' });
  assert.equal(next.menus.startOpen, false);
});

test('START_MENU_TOGGLE collapses any open submenus', async () => {
  const { reduce } = await loadReducerModule();
  const current = await freshState();
  current.menus.startOpen = true;
  current.menus.programsOpen = true;
  current.menus.gamesOpen = true;
  const next = reduce(current, { type: 'START_MENU_TOGGLE' });
  assert.equal(next.menus.startOpen, false);
  assert.equal(next.menus.programsOpen, false);
  assert.equal(next.menus.gamesOpen, false);
});

test('START_MENU_CLOSE closes the menu and submenus, and is a no-op when already closed', async () => {
  const { reduce } = await loadReducerModule();
  const current = await freshState();
  current.menus.startOpen = true;
  current.menus.programsOpen = true;
  const next = reduce(current, { type: 'START_MENU_CLOSE' });
  assert.equal(next.menus.startOpen, false);
  assert.equal(next.menus.programsOpen, false);
  const same = reduce(next, { type: 'START_MENU_CLOSE' });
  assert.equal(same, next);
});

test('MENU_SUBMENUS_KEEP opens only the kept submenus', async () => {
  const { reduce } = await loadReducerModule();
  const current = await freshState();
  current.menus.startOpen = true;
  const next = reduce(current, {
    type: 'MENU_SUBMENUS_KEEP',
    keep: ['programs', 'games'],
  });
  assert.equal(next.menus.programsOpen, true);
  assert.equal(next.menus.gamesOpen, true);
});

test('MENU_SUBMENUS_KEEP cannot open submenus while the start menu is closed', async () => {
  const { reduce } = await loadReducerModule();
  const current = await freshState();
  current.menus.startOpen = false;
  current.menus.programsOpen = true;
  const next = reduce(current, { type: 'MENU_SUBMENUS_KEEP', keep: ['programs'] });
  assert.equal(next.menus.programsOpen, false);
});

test('MENU_SUBMENUS_KEEP is a no-op when the submenu set is unchanged', async () => {
  const { reduce } = await loadReducerModule();
  const current = await freshState();
  current.menus.startOpen = true;
  current.menus.programsOpen = true;
  const next = reduce(current, { type: 'MENU_SUBMENUS_KEEP', keep: ['programs'] });
  assert.equal(next, current);
});

test('NOTEPAD_SET_FILE_PATH records the current document path', async () => {
  const { reduce } = await loadReducerModule();
  const next = reduce(await freshState(), {
    type: 'NOTEPAD_SET_FILE_PATH',
    path: '/C:/My Documents/notes.txt',
  });
  assert.equal(next.notepad.currentFilePath, '/C:/My Documents/notes.txt');
});

test('NOTEPAD_SET_FILE_PATH clears the path for a new document', async () => {
  const { reduce } = await loadReducerModule();
  const current = await freshState();
  current.notepad.currentFilePath = '/C:/My Documents/notes.txt';
  const next = reduce(current, { type: 'NOTEPAD_SET_FILE_PATH', path: '' });
  assert.equal(next.notepad.currentFilePath, '');
});

test('NOTEPAD_SET_FILE_PATH is a no-op when the path is unchanged', async () => {
  const { reduce } = await loadReducerModule();
  const current = await freshState();
  current.notepad.currentFilePath = '/C:/x.txt';
  const next = reduce(current, { type: 'NOTEPAD_SET_FILE_PATH', path: '/C:/x.txt' });
  assert.equal(next, current);
});

test('BROWSER_NAVIGATE pushes onto history and advances the index', async () => {
  const { reduce } = await loadReducerModule();
  let next = reduce(await freshState(), { type: 'BROWSER_NAVIGATE', url: 'about:blank' });
  assert.deepEqual(next.browser.historyStack, ['about:blank']);
  assert.equal(next.browser.historyIndex, 0);
  next = reduce(next, { type: 'BROWSER_NAVIGATE', url: 'https://example.com' });
  assert.deepEqual(next.browser.historyStack, ['about:blank', 'https://example.com']);
  assert.equal(next.browser.historyIndex, 1);
});

test('BROWSER_NAVIGATE drops forward entries after going back', async () => {
  const { reduce } = await loadReducerModule();
  let next = reduce(await freshState(), { type: 'BROWSER_NAVIGATE', url: 'a' });
  next = reduce(next, { type: 'BROWSER_NAVIGATE', url: 'b' });
  next = reduce(next, { type: 'BROWSER_NAVIGATE', url: 'c' });
  next = reduce(next, { type: 'BROWSER_BACK' });
  next = reduce(next, { type: 'BROWSER_BACK' });
  assert.equal(next.browser.historyIndex, 0);
  // Navigating from a back position truncates the forward history.
  next = reduce(next, { type: 'BROWSER_NAVIGATE', url: 'd' });
  assert.deepEqual(next.browser.historyStack, ['a', 'd']);
  assert.equal(next.browser.historyIndex, 1);
});

test('BROWSER_BACK moves the index back and is a no-op at the start', async () => {
  const { reduce } = await loadReducerModule();
  let next = reduce(await freshState(), { type: 'BROWSER_NAVIGATE', url: 'a' });
  next = reduce(next, { type: 'BROWSER_NAVIGATE', url: 'b' });
  next = reduce(next, { type: 'BROWSER_BACK' });
  assert.equal(next.browser.historyIndex, 0);
  const same = reduce(next, { type: 'BROWSER_BACK' });
  assert.equal(same, next);
});

test('BROWSER_FORWARD moves the index forward and is a no-op at the end', async () => {
  const { reduce } = await loadReducerModule();
  let next = reduce(await freshState(), { type: 'BROWSER_NAVIGATE', url: 'a' });
  next = reduce(next, { type: 'BROWSER_NAVIGATE', url: 'b' });
  next = reduce(next, { type: 'BROWSER_BACK' });
  next = reduce(next, { type: 'BROWSER_FORWARD' });
  assert.equal(next.browser.historyIndex, 1);
  const same = reduce(next, { type: 'BROWSER_FORWARD' });
  assert.equal(same, next);
});

test('BROWSER_HISTORY_RESET clears history and is a no-op when already empty', async () => {
  const { reduce } = await loadReducerModule();
  let next = reduce(await freshState(), { type: 'BROWSER_NAVIGATE', url: 'a' });
  next = reduce(next, { type: 'BROWSER_HISTORY_RESET' });
  assert.deepEqual(next.browser.historyStack, []);
  assert.equal(next.browser.historyIndex, -1);
  const same = reduce(next, { type: 'BROWSER_HISTORY_RESET' });
  assert.equal(same, next);
});

test('BROWSER_SET_PAGE updates IE title, task label, and status together', async () => {
  const { reduce } = await loadReducerModule();
  const next = reduce(await freshState(), {
    type: 'BROWSER_SET_PAGE',
    title: 'https://example.com - Microsoft Internet Explorer',
    taskLabel: 'https://example.com - M...',
    status: 'Opening page...',
  });
  assert.equal(next.browser.title, 'https://example.com - Microsoft Internet Explorer');
  assert.equal(next.browser.taskLabel, 'https://example.com - M...');
  assert.equal(next.browser.status, 'Opening page...');
});

test('BROWSER_SET_STATUS updates status and is a no-op when unchanged', async () => {
  const { reduce } = await loadReducerModule();
  const next = reduce(await freshState(), { type: 'BROWSER_SET_STATUS', status: 'Stopped' });
  assert.equal(next.browser.status, 'Stopped');
  const same = reduce(next, { type: 'BROWSER_SET_STATUS', status: 'Stopped' });
  assert.equal(same, next);
});

test('APP_SET_PAGE updates app-window title, task label, and status together', async () => {
  const { reduce } = await loadReducerModule();
  const next = reduce(await freshState(), {
    type: 'APP_SET_PAGE',
    title: 'ASCII Runner',
    taskLabel: 'ASCII Runner',
    status: 'Opening...',
  });
  assert.equal(next.app.title, 'ASCII Runner');
  assert.equal(next.app.taskLabel, 'ASCII Runner');
  assert.equal(next.app.status, 'Opening...');
});

test('APP_SET_STATUS updates status and is a no-op when unchanged', async () => {
  const { reduce } = await loadReducerModule();
  const current = await freshState();
  // Initial status is 'Done', so setting it again returns the same reference.
  assert.equal(reduce(current, { type: 'APP_SET_STATUS', status: 'Done' }), current);
  const changed = reduce(current, { type: 'APP_SET_STATUS', status: 'Opening...' });
  assert.equal(changed.app.status, 'Opening...');
  const same = reduce(changed, { type: 'APP_SET_STATUS', status: 'Opening...' });
  assert.equal(same, changed);
});

test('PAINT_SET_TITLE updates paint title and task label, no-op when unchanged', async () => {
  const { reduce } = await loadReducerModule();
  const current = await freshState();
  const next = reduce(current, {
    type: 'PAINT_SET_TITLE',
    title: 'sketch.png - Paint',
    taskLabel: 'sketch.png - Paint',
  });
  assert.equal(next.paint.title, 'sketch.png - Paint');
  assert.equal(next.paint.taskLabel, 'sketch.png - Paint');
  const same = reduce(next, {
    type: 'PAINT_SET_TITLE',
    title: 'sketch.png - Paint',
    taskLabel: 'sketch.png - Paint',
  });
  assert.equal(same, next);
});

test('unknown action returns current state object', async () => {
  const { reduce } = await loadReducerModule();
  const current = await freshState();
  const next = reduce(current, { type: 'UNKNOWN_ACTION' });
  assert.equal(next, current);
});
