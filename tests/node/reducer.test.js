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

test('WINDOW_STACK_SET updates stack and focused id', async () => {
  const { reduce } = await loadReducerModule();
  const next = reduce(await freshState(), { type: 'WINDOW_STACK_SET', stack: ['a', 'b'] });
  assert.deepEqual(next.windows.stack, ['a', 'b']);
  assert.equal(next.windows.focusedId, 'b');
});

test('WINDOWS_STATE_SET updates stack/byId with inferred focus', async () => {
  const { reduce } = await loadReducerModule();
  const byId = { a: { open: true } };
  const next = reduce(await freshState(), { type: 'WINDOWS_STATE_SET', stack: ['a'], byId });
  assert.deepEqual(next.windows.stack, ['a']);
  assert.equal(next.windows.focusedId, 'a');
  assert.deepEqual(next.windows.byId, byId);
});

test('WINDOW_INTERACTION_DISPATCH increments seq and stores command', async () => {
  const { reduce } = await loadReducerModule();
  const current = await freshState();
  current.windows.interactionCommandSeq = 4;
  const next = reduce(current, {
    type: 'WINDOW_INTERACTION_DISPATCH',
    command: { type: 'FOCUS', id: 'a' },
  });
  assert.equal(next.windows.interactionCommandSeq, 5);
  assert.deepEqual(next.windows.interactionCommand, { type: 'FOCUS', id: 'a' });
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

test('DRAG_START initializes drag state', async () => {
  const { reduce } = await loadReducerModule();
  const next = reduce(await freshState(), {
    type: 'DRAG_START',
    sourceId: 'w1',
    startX: 10,
    startY: 20,
    origLeft: 30,
    origTop: 40,
  });
  assert.equal(next.drag.active, true);
  assert.equal(next.drag.sourceId, 'w1');
  assert.equal(next.drag.currentLeft, 30);
  assert.equal(next.drag.currentTop, 40);
});

test('DRAG_MOVE updates coordinates only for active matching source', async () => {
  const { reduce } = await loadReducerModule();
  const current = await freshState();
  current.drag = {
    active: true,
    sourceId: 'w1',
    startX: 10,
    startY: 20,
    origLeft: 30,
    origTop: 40,
    currentLeft: 30,
    currentTop: 40,
  };
  const next = reduce(current, { type: 'DRAG_MOVE', sourceId: 'w1', left: 35, top: 45 });
  assert.equal(next.drag.currentLeft, 35);
  assert.equal(next.drag.currentTop, 45);
});

test('DRAG_END resets drag state', async () => {
  const { initialState, reduce } = await loadReducerModule();
  const current = await freshState();
  current.drag.active = true;
  current.drag.sourceId = 'w1';
  const next = reduce(current, { type: 'DRAG_END' });
  assert.deepEqual(next.drag, initialState.drag);
});

test('unknown action returns current state object', async () => {
  const { reduce } = await loadReducerModule();
  const current = await freshState();
  const next = reduce(current, { type: 'UNKNOWN_ACTION' });
  assert.equal(next, current);
});
