/**
 * @typedef {Object} WindoesAction
 * @property {string} type
 * @property {number=} value
 * @property {string=} splashStatus
 * @property {string=} status
 * @property {number=} progress
 * @property {string[]=} stack
 * @property {string|null=} focusedId
 * @property {Record<string, unknown>=} byId
 * @property {number=} x
 * @property {number=} y
 * @property {string|null=} selectedPath
 * @property {number=} left
 * @property {number=} top
 * @property {string=} path
 * @property {string=} id
 */

export const initialState = {
  boot: {
    phase: 'bios', // bios | splash | ready
    biosMemory: 0,
    biosStatus: 'Initializing Plug and Play Cards...',
    splashProgress: 0,
    splashStatus: 'Loading Windoes...',
    done: false,
  },
  menus: {
    startOpen: false,
    programsOpen: false,
    accessoriesOpen: false,
    gamesOpen: false,
    desktopContextOpen: false,
    explorerContextOpen: false,
  },
  dialogs: {
    runOpen: false,
    errorOpen: false,
    shutdownOpen: false,
    shutdownScreenVisible: false,
    notepadSaveOpen: false,
    notepadUnsavedOpen: false,
  },
  windows: {
    stack: [],
    focusedId: null,
    byId: {},
  },
  selection: {
    desktopIconId: null,
    explorerItemPath: null,
  },
  explorer: {
    contextMenuOpen: false,
    contextMenuX: 0,
    contextMenuY: 0,
    selectedPath: null,
  },
  notepad: {
    fileMenuOpen: false,
    fileMenuLeft: 0,
    fileMenuTop: 0,
    saveDialogOpen: false,
    saveDialogPath: '/C:/My Documents/Untitled.txt',
  },
};

function defaultWindowState(id) {
  return {
    id,
    open: false,
    minimized: false,
    maximized: false,
    focused: false,
    zIndex: 0,
    taskbarVisible: false,
  };
}

function upsertWindow(byId, id) {
  return byId[id] ? { ...byId[id] } : defaultWindowState(id);
}

function recomputeWindowMeta(windows) {
  const stack = windows.stack;
  const focusedId = stack.length ? stack[stack.length - 1] : null;
  const nextById = {};

  Object.entries(windows.byId).forEach(([id, win]) => {
    nextById[id] = {
      ...win,
      focused: false,
      zIndex: 0,
    };
  });

  stack.forEach((id, index) => {
    if (!nextById[id]) {
      nextById[id] = defaultWindowState(id);
    }
    nextById[id] = {
      ...nextById[id],
      focused: id === focusedId,
      zIndex: index + 1,
    };
  });

  return {
    ...windows,
    focusedId,
    byId: nextById,
  };
}

function withWindowState(current, id, mutate) {
  if (!id) return current;

  const windows = {
    ...current.windows,
    stack: current.windows.stack.slice(),
    byId: { ...current.windows.byId },
  };

  const previous = windows.byId[id];
  const win = upsertWindow(windows.byId, id);
  windows.byId[id] = win;

  mutate(windows, win, previous);

  return {
    ...current,
    windows: recomputeWindowMeta(windows),
  };
}

function moveWindowToTop(stack, id) {
  const idx = stack.indexOf(id);
  if (idx !== -1) stack.splice(idx, 1);
  stack.push(id);
}

function removeWindowFromStack(stack, id) {
  const idx = stack.indexOf(id);
  if (idx !== -1) stack.splice(idx, 1);
}

/**
 * @param {typeof initialState} current
 * @param {WindoesAction} action
 */
export function reduce(current, action) {
  switch (action.type) {
    case 'BOOT_RESET':
      return {
        ...current,
        boot: {
          ...initialState.boot,
          splashStatus: action.splashStatus || initialState.boot.splashStatus,
        },
      };
    case 'BOOT_BIOS_PROGRESS':
      return {
        ...current,
        boot: {
          ...current.boot,
          biosMemory: action.value,
        },
      };
    case 'BOOT_BIOS_STATUS':
      return {
        ...current,
        boot: {
          ...current.boot,
          biosStatus: action.value,
        },
      };
    case 'BOOT_PHASE_SPLASH':
      return {
        ...current,
        boot: {
          ...current.boot,
          phase: 'splash',
          splashProgress: 0,
          splashStatus: action.status || current.boot.splashStatus,
        },
      };
    case 'BOOT_SPLASH_PROGRESS':
      return {
        ...current,
        boot: {
          ...current.boot,
          splashProgress: action.progress,
          splashStatus: action.status || current.boot.splashStatus,
        },
      };
    case 'BOOT_FINISH':
      return {
        ...current,
        boot: {
          ...current.boot,
          phase: 'ready',
          splashProgress: 100,
          done: true,
        },
      };

    case 'WINDOW_REGISTER':
      return withWindowState(current, action.id, () => {});

    case 'WINDOW_OPEN':
      return withWindowState(current, action.id, (windows, win) => {
        win.open = true;
        win.minimized = false;
        win.taskbarVisible = true;
        moveWindowToTop(windows.stack, win.id);
      });

    case 'WINDOW_CLOSE':
      return withWindowState(current, action.id, (windows, win) => {
        win.open = false;
        win.minimized = false;
        win.maximized = false;
        win.taskbarVisible = false;
        removeWindowFromStack(windows.stack, win.id);
      });

    case 'WINDOW_MINIMIZE':
      return withWindowState(current, action.id, (windows, win) => {
        win.open = false;
        win.minimized = true;
        win.taskbarVisible = true;
        removeWindowFromStack(windows.stack, win.id);
      });

    case 'WINDOW_RESTORE':
      return withWindowState(current, action.id, (windows, win) => {
        win.open = true;
        win.minimized = false;
        win.taskbarVisible = true;
        moveWindowToTop(windows.stack, win.id);
      });

    case 'WINDOW_FOCUS':
      return withWindowState(current, action.id, (windows, win, previous) => {
        if (!previous || !previous.open || previous.minimized) return;
        moveWindowToTop(windows.stack, win.id);
      });

    case 'WINDOW_MAXIMIZE_TOGGLE':
      return withWindowState(current, action.id, (windows, win) => {
        win.maximized = !win.maximized;
        if (!win.minimized) {
          win.open = true;
          moveWindowToTop(windows.stack, win.id);
        }
      });

    case 'EXPLORER_CONTEXT_OPEN':
      return {
        ...current,
        explorer: {
          ...current.explorer,
          contextMenuOpen: true,
          contextMenuX: action.x || 0,
          contextMenuY: action.y || 0,
          selectedPath: action.selectedPath || null,
        },
      };
    case 'EXPLORER_CONTEXT_CLOSE':
      if (!current.explorer.contextMenuOpen) return current;
      return {
        ...current,
        explorer: {
          ...current.explorer,
          contextMenuOpen: false,
          selectedPath: null,
        },
      };

    case 'NOTEPAD_FILE_MENU_OPEN':
      return {
        ...current,
        notepad: {
          ...current.notepad,
          fileMenuOpen: true,
          fileMenuLeft: Number.isFinite(action.left) ? action.left : current.notepad.fileMenuLeft,
          fileMenuTop: Number.isFinite(action.top) ? action.top : current.notepad.fileMenuTop,
        },
      };
    case 'NOTEPAD_FILE_MENU_CLOSE':
      if (!current.notepad.fileMenuOpen) return current;
      return {
        ...current,
        notepad: {
          ...current.notepad,
          fileMenuOpen: false,
        },
      };

    case 'NOTEPAD_SAVE_DIALOG_OPEN':
      return {
        ...current,
        notepad: {
          ...current.notepad,
          saveDialogOpen: true,
          saveDialogPath:
            action.path || current.notepad.saveDialogPath || '/C:/My Documents/Untitled.txt',
        },
      };
    case 'NOTEPAD_SAVE_DIALOG_SET_PATH':
      return {
        ...current,
        notepad: {
          ...current.notepad,
          saveDialogPath: action.path,
        },
      };
    case 'NOTEPAD_SAVE_DIALOG_CLOSE':
      if (!current.notepad.saveDialogOpen) return current;
      return {
        ...current,
        notepad: {
          ...current.notepad,
          saveDialogOpen: false,
        },
      };
    case 'SHUTDOWN_DIALOG_OPEN':
      if (current.dialogs.shutdownOpen) return current;
      return {
        ...current,
        dialogs: {
          ...current.dialogs,
          shutdownOpen: true,
        },
      };
    case 'SHUTDOWN_DIALOG_CLOSE':
      if (!current.dialogs.shutdownOpen) return current;
      return {
        ...current,
        dialogs: {
          ...current.dialogs,
          shutdownOpen: false,
        },
      };
    case 'SHUTDOWN_SCREEN_SHOW':
      return {
        ...current,
        dialogs: {
          ...current.dialogs,
          shutdownOpen: false,
          shutdownScreenVisible: true,
        },
      };
    case 'SHUTDOWN_SCREEN_HIDE':
      if (!current.dialogs.shutdownScreenVisible) return current;
      return {
        ...current,
        dialogs: {
          ...current.dialogs,
          shutdownScreenVisible: false,
        },
      };
    default:
      return current;
  }
}
