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

test('EXPLORER_CONTEXT_ACTION_DISPATCH closes menu and emits command', async () => {
  const { reduce } = await loadReducerModule();
  const next = reduce(await freshState(), {
    type: 'EXPLORER_CONTEXT_ACTION_DISPATCH',
    commandType: 'delete',
    selectedPath: '/C:/x',
  });
  assert.equal(next.explorer.contextMenuOpen, false);
  assert.deepEqual(next.explorer.actionCommand, { type: 'delete', selectedPath: '/C:/x' });
  assert.equal(next.explorer.actionSeq, 1);
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

test('NOTEPAD_ACTION_DISPATCH closes menu and increments action seq', async () => {
  const { reduce } = await loadReducerModule();
  const current = await freshState();
  current.notepad.fileMenuOpen = true;
  current.notepad.actionSeq = 2;
  const next = reduce(current, { type: 'NOTEPAD_ACTION_DISPATCH', commandType: 'save' });
  assert.equal(next.notepad.fileMenuOpen, false);
  assert.deepEqual(next.notepad.actionCommand, { type: 'save' });
  assert.equal(next.notepad.actionSeq, 3);
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

test('unknown action returns current state object', async () => {
  const { reduce } = await loadReducerModule();
  const current = await freshState();
  const next = reduce(current, { type: 'UNKNOWN_ACTION' });
  assert.equal(next, current);
});
