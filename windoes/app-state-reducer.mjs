// ─── State shape ─────────────────────────────────────────────────────────────

/**
 * @typedef {Object} BootState
 * @property {'bios' | 'splash' | 'ready'} phase
 * @property {number} biosMemory
 * @property {string} biosStatus
 * @property {number} splashProgress
 * @property {string} splashStatus
 * @property {boolean} done
 */

/**
 * @typedef {Object} MenusState
 * @property {boolean} startOpen
 * @property {boolean} programsOpen
 * @property {boolean} gamesOpen
 * @property {boolean} desktopContextOpen
 * @property {boolean} explorerContextOpen
 */

/**
 * @typedef {Object} DialogsState
 * @property {boolean} runOpen
 * @property {boolean} errorOpen
 * @property {boolean} shutdownOpen
 * @property {boolean} shutdownScreenVisible
 * @property {boolean} notepadSaveOpen
 * @property {boolean} notepadUnsavedOpen
 */

/**
 * @typedef {Object} WindowState
 * @property {string} id
 * @property {boolean} open
 * @property {boolean} minimized
 * @property {boolean} maximized
 * @property {boolean} focused
 * @property {number} zIndex
 * @property {boolean} taskbarVisible
 */

/**
 * @typedef {Object} WindowsState
 * @property {string[]} stack
 * @property {string | null} focusedId
 * @property {Record<string, WindowState>} byId
 */

/**
 * @typedef {Object} SelectionState
 * @property {string | null} desktopIconId
 * @property {string | null} explorerItemPath
 */

/**
 * @typedef {Object} ExplorerState
 * @property {boolean} contextMenuOpen
 * @property {number} contextMenuX
 * @property {number} contextMenuY
 * @property {string | null} selectedPath
 * @property {boolean} selectedIsSystem
 */

/**
 * @typedef {Object} NotepadState
 * @property {boolean} fileMenuOpen
 * @property {number} fileMenuLeft
 * @property {number} fileMenuTop
 * @property {boolean} saveDialogOpen
 * @property {string} saveDialogPath
 * @property {string} currentFilePath
 */

/**
 * @typedef {Object} BrowserState
 * @property {string[]} historyStack
 * @property {number} historyIndex
 * @property {string} title
 * @property {string} status
 * @property {string} taskLabel
 */

/**
 * @typedef {Object} AppState
 * @property {string} title
 * @property {string} status
 * @property {string} taskLabel
 */

/**
 * @typedef {Object} State
 * @property {BootState} boot
 * @property {MenusState} menus
 * @property {DialogsState} dialogs
 * @property {WindowsState} windows
 * @property {SelectionState} selection
 * @property {ExplorerState} explorer
 * @property {NotepadState} notepad
 * @property {BrowserState} browser
 * @property {AppState} app
 */

// ─── Action union ────────────────────────────────────────────────────────────

/**
 * Discriminated union of every action the reducer understands. Each member
 * carries only the payload fields its case reads, so `switch (action.type)`
 * narrows `action` to the exact shape inside each branch.
 *
 * @typedef {(
 *   | { type: 'BOOT_RESET', splashStatus?: string }
 *   | { type: 'BOOT_BIOS_PROGRESS', value: number }
 *   | { type: 'BOOT_BIOS_STATUS', value: string }
 *   | { type: 'BOOT_PHASE_SPLASH', status?: string }
 *   | { type: 'BOOT_SPLASH_PROGRESS', progress: number, status?: string }
 *   | { type: 'BOOT_FINISH' }
 *   | { type: 'START_MENU_TOGGLE' }
 *   | { type: 'START_MENU_CLOSE' }
 *   | { type: 'MENU_SUBMENUS_KEEP', keep?: string[] }
 *   | { type: 'WINDOW_REGISTER', id: string }
 *   | { type: 'WINDOW_OPEN', id: string }
 *   | { type: 'WINDOW_CLOSE', id: string }
 *   | { type: 'WINDOW_MINIMIZE', id: string }
 *   | { type: 'WINDOW_RESTORE', id: string }
 *   | { type: 'WINDOW_FOCUS', id: string }
 *   | { type: 'WINDOW_MAXIMIZE_TOGGLE', id: string }
 *   | { type: 'EXPLORER_CONTEXT_OPEN', x?: number, y?: number, selectedPath?: string | null, selectedIsSystem?: boolean }
 *   | { type: 'EXPLORER_CONTEXT_CLOSE' }
 *   | { type: 'NOTEPAD_FILE_MENU_OPEN', left?: number, top?: number }
 *   | { type: 'NOTEPAD_FILE_MENU_CLOSE' }
 *   | { type: 'NOTEPAD_SAVE_DIALOG_OPEN', path?: string }
 *   | { type: 'NOTEPAD_SAVE_DIALOG_SET_PATH', path: string }
 *   | { type: 'NOTEPAD_SAVE_DIALOG_CLOSE' }
 *   | { type: 'NOTEPAD_SET_FILE_PATH', path: string }
 *   | { type: 'SHUTDOWN_DIALOG_OPEN' }
 *   | { type: 'SHUTDOWN_DIALOG_CLOSE' }
 *   | { type: 'SHUTDOWN_SCREEN_SHOW' }
 *   | { type: 'SHUTDOWN_SCREEN_HIDE' }
 *   | { type: 'BROWSER_NAVIGATE', url: string }
 *   | { type: 'BROWSER_BACK' }
 *   | { type: 'BROWSER_FORWARD' }
 *   | { type: 'BROWSER_HISTORY_RESET' }
 *   | { type: 'BROWSER_SET_PAGE', title: string, taskLabel: string, status: string }
 *   | { type: 'BROWSER_SET_STATUS', status: string }
 *   | { type: 'APP_SET_PAGE', title: string, taskLabel: string, status: string }
 *   | { type: 'APP_SET_STATUS', status: string }
 * )} WindoesAction
 */

import { DEFAULT_NOTEPAD_SAVE_PATH } from './constants.js';

/** @type {State} */
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
    selectedIsSystem: false,
  },
  notepad: {
    fileMenuOpen: false,
    fileMenuLeft: 0,
    fileMenuTop: 0,
    saveDialogOpen: false,
    saveDialogPath: DEFAULT_NOTEPAD_SAVE_PATH,
    currentFilePath: '',
  },
  browser: {
    historyStack: [],
    historyIndex: -1,
    title: 'about:blank - Microsoft Internet Explorer',
    status: 'Done',
    taskLabel: 'about:blank - Microsoft Int...',
  },
  app: {
    title: 'Application',
    status: 'Done',
    taskLabel: 'Application',
  },
};

/**
 * @param {string} id
 * @returns {WindowState}
 */
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

/**
 * @param {Record<string, WindowState>} byId
 * @param {string} id
 * @returns {WindowState}
 */
function upsertWindow(byId, id) {
  return byId[id] ? { ...byId[id] } : defaultWindowState(id);
}

/**
 * @param {WindowsState} windows
 * @returns {WindowsState}
 */
function recomputeWindowMeta(windows) {
  const stack = windows.stack;
  const focusedId = stack.length ? stack[stack.length - 1] : null;
  /** @type {Record<string, WindowState>} */
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

/**
 * @param {State} current
 * @param {string} id
 * @param {(windows: WindowsState, win: WindowState, previous: WindowState | undefined) => void} mutate
 * @returns {State}
 */
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

/**
 * @param {string[]} stack
 * @param {string} id
 */
function moveWindowToTop(stack, id) {
  const idx = stack.indexOf(id);
  if (idx !== -1) stack.splice(idx, 1);
  stack.push(id);
}

/**
 * @param {string[]} stack
 * @param {string} id
 */
function removeWindowFromStack(stack, id) {
  const idx = stack.indexOf(id);
  if (idx !== -1) stack.splice(idx, 1);
}

/**
 * @param {State} current
 * @param {Partial<NotepadState>} nextNotepad
 * @returns {State}
 */
function withNotepad(current, nextNotepad) {
  return {
    ...current,
    notepad: {
      ...current.notepad,
      ...nextNotepad,
    },
  };
}

/**
 * @param {State} current
 * @param {Partial<MenusState>} nextMenus
 * @returns {State}
 */
function withMenus(current, nextMenus) {
  return {
    ...current,
    menus: {
      ...current.menus,
      ...nextMenus,
    },
  };
}

/**
 * @param {State} current
 * @param {Partial<BrowserState>} nextBrowser
 * @returns {State}
 */
function withBrowser(current, nextBrowser) {
  return {
    ...current,
    browser: {
      ...current.browser,
      ...nextBrowser,
    },
  };
}

/**
 * @param {State} current
 * @param {Partial<AppState>} nextApp
 * @returns {State}
 */
function withApp(current, nextApp) {
  return {
    ...current,
    app: {
      ...current.app,
      ...nextApp,
    },
  };
}

/**
 * @param {State} current
 * @param {Partial<DialogsState>} nextDialogs
 * @returns {State}
 */
function withDialogs(current, nextDialogs) {
  return {
    ...current,
    dialogs: {
      ...current.dialogs,
      ...nextDialogs,
    },
  };
}

/**
 * @param {State} current
 * @param {WindoesAction} action
 * @returns {State}
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

    case 'START_MENU_TOGGLE':
      // Toggling always collapses submenus; they reopen on hover.
      return withMenus(current, {
        startOpen: !current.menus.startOpen,
        programsOpen: false,
        gamesOpen: false,
      });
    case 'START_MENU_CLOSE':
      if (!current.menus.startOpen && !current.menus.programsOpen && !current.menus.gamesOpen) {
        return current;
      }
      return withMenus(current, {
        startOpen: false,
        programsOpen: false,
        gamesOpen: false,
      });
    case 'MENU_SUBMENUS_KEEP': {
      // Submenus can only be open while the Start menu itself is open.
      const keep = new Set(current.menus.startOpen ? action.keep || [] : []);
      const programsOpen = keep.has('programs');
      const gamesOpen = keep.has('games');
      if (programsOpen === current.menus.programsOpen && gamesOpen === current.menus.gamesOpen) {
        return current;
      }
      return withMenus(current, { programsOpen, gamesOpen });
    }

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
          selectedIsSystem: !!action.selectedIsSystem,
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
          selectedIsSystem: false,
        },
      };

    case 'NOTEPAD_FILE_MENU_OPEN':
      return withNotepad(current, {
        fileMenuOpen: true,
        fileMenuLeft: Number.isFinite(action.left)
          ? /** @type {number} */ (action.left)
          : current.notepad.fileMenuLeft,
        fileMenuTop: Number.isFinite(action.top)
          ? /** @type {number} */ (action.top)
          : current.notepad.fileMenuTop,
      });
    case 'NOTEPAD_FILE_MENU_CLOSE':
      if (!current.notepad.fileMenuOpen) return current;
      return withNotepad(current, { fileMenuOpen: false });

    case 'NOTEPAD_SAVE_DIALOG_OPEN':
      return withNotepad(current, {
        saveDialogOpen: true,
        saveDialogPath: action.path || current.notepad.saveDialogPath || DEFAULT_NOTEPAD_SAVE_PATH,
      });
    case 'NOTEPAD_SAVE_DIALOG_SET_PATH':
      return withNotepad(current, { saveDialogPath: action.path });
    case 'NOTEPAD_SAVE_DIALOG_CLOSE':
      if (!current.notepad.saveDialogOpen) return current;
      return withNotepad(current, { saveDialogOpen: false });
    case 'NOTEPAD_SET_FILE_PATH':
      if (current.notepad.currentFilePath === action.path) return current;
      return withNotepad(current, { currentFilePath: action.path });
    case 'SHUTDOWN_DIALOG_OPEN':
      if (current.dialogs.shutdownOpen) return current;
      return withDialogs(current, { shutdownOpen: true });
    case 'SHUTDOWN_DIALOG_CLOSE':
      if (!current.dialogs.shutdownOpen) return current;
      return withDialogs(current, { shutdownOpen: false });
    case 'SHUTDOWN_SCREEN_SHOW':
      return withDialogs(current, {
        shutdownOpen: false,
        shutdownScreenVisible: true,
      });
    case 'SHUTDOWN_SCREEN_HIDE':
      if (!current.dialogs.shutdownScreenVisible) return current;
      return withDialogs(current, { shutdownScreenVisible: false });

    case 'BROWSER_NAVIGATE': {
      // Drop any forward entries past the current position, then append.
      const historyStack = current.browser.historyStack.slice(0, current.browser.historyIndex + 1);
      historyStack.push(action.url);
      return withBrowser(current, {
        historyStack,
        historyIndex: historyStack.length - 1,
      });
    }
    case 'BROWSER_BACK':
      if (current.browser.historyIndex <= 0) return current;
      return withBrowser(current, { historyIndex: current.browser.historyIndex - 1 });
    case 'BROWSER_FORWARD':
      if (current.browser.historyIndex >= current.browser.historyStack.length - 1) return current;
      return withBrowser(current, { historyIndex: current.browser.historyIndex + 1 });
    case 'BROWSER_HISTORY_RESET':
      if (current.browser.historyStack.length === 0 && current.browser.historyIndex === -1) {
        return current;
      }
      return withBrowser(current, { historyStack: [], historyIndex: -1 });
    case 'BROWSER_SET_PAGE':
      return withBrowser(current, {
        title: action.title,
        taskLabel: action.taskLabel,
        status: action.status,
      });
    case 'BROWSER_SET_STATUS':
      if (current.browser.status === action.status) return current;
      return withBrowser(current, { status: action.status });

    case 'APP_SET_PAGE':
      return withApp(current, {
        title: action.title,
        taskLabel: action.taskLabel,
        status: action.status,
      });
    case 'APP_SET_STATUS':
      if (current.app.status === action.status) return current;
      return withApp(current, { status: action.status });

    default:
      return current;
  }
}
