// ══════════════════════════════════════════════
// Shared Application State & Namespace
// ══════════════════════════════════════════════
import { useSyncExternalStore } from 'react';
import defaultConfig from './simulator.config.js';

// Allow runtime config override (used by tests via addInitScript)
const runtimeOverride = window.WIN_ME_SIMULATOR_CONFIG;
const config = runtimeOverride ? { ...defaultConfig, ...runtimeOverride } : defaultConfig;

const initialState = {
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
        notepadSaveOpen: false,
        notepadUnsavedOpen: false,
    },
    windows: {
        stack: [],
        focusedId: null,
        byId: {},
        interactionCommand: null,
        interactionCommandSeq: 0,
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
        actionCommand: null,
        actionSeq: 0,
    },
    notepad: {
        fileMenuOpen: false,
        fileMenuLeft: 0,
        fileMenuTop: 0,
        actionCommand: null,
        actionSeq: 0,
        saveDialogOpen: false,
        saveDialogPath: '/C:/My Documents/Untitled.txt',
    },
    drag: {
        active: false,
        sourceId: null,
        startX: null,
        startY: null,
        origLeft: null,
        origTop: null,
        currentLeft: null,
        currentTop: null,
    },
};

let state = initialState;
const listeners = new Set();

function reduce(current, action) {
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
    case 'WINDOW_STACK_SET': {
        const stack = action.stack || [];
        return {
            ...current,
            windows: {
                ...current.windows,
                stack,
                focusedId: stack.length ? stack[stack.length - 1] : null,
            },
        };
    }
    case 'WINDOWS_STATE_SET': {
        const stack = action.stack || [];
        const focusedId = action.focusedId !== undefined
            ? action.focusedId
            : (stack.length ? stack[stack.length - 1] : null);
        return {
            ...current,
            windows: {
                ...current.windows,
                stack,
                focusedId,
                byId: action.byId || {},
            },
        };
    }
    case 'WINDOW_INTERACTION_DISPATCH':
        return {
            ...current,
            windows: {
                ...current.windows,
                interactionCommand: action.command || null,
                interactionCommandSeq: (current.windows.interactionCommandSeq || 0) + 1,
            },
        };
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
    case 'EXPLORER_CONTEXT_ACTION_DISPATCH':
        return {
            ...current,
            explorer: {
                ...current.explorer,
                contextMenuOpen: false,
                actionCommand: {
                    type: action.commandType || null,
                    selectedPath: action.selectedPath || null,
                },
                actionSeq: (current.explorer.actionSeq || 0) + 1,
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
    case 'NOTEPAD_ACTION_DISPATCH':
        return {
            ...current,
            notepad: {
                ...current.notepad,
                fileMenuOpen: false,
                actionCommand: { type: action.commandType || null },
                actionSeq: (current.notepad.actionSeq || 0) + 1,
            },
        };
    case 'NOTEPAD_SAVE_DIALOG_OPEN':
        return {
            ...current,
            notepad: {
                ...current.notepad,
                saveDialogOpen: true,
                saveDialogPath: action.path || current.notepad.saveDialogPath || '/C:/My Documents/Untitled.txt',
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
    case 'DRAG_START':
        return {
            ...current,
            drag: {
                active: true,
                sourceId: action.sourceId || null,
                startX: action.startX,
                startY: action.startY,
                origLeft: action.origLeft,
                origTop: action.origTop,
                currentLeft: action.origLeft,
                currentTop: action.origTop,
            },
        };
    case 'DRAG_MOVE':
        if (!current.drag.active || current.drag.sourceId !== action.sourceId) return current;
        return {
            ...current,
            drag: {
                ...current.drag,
                currentLeft: action.left,
                currentTop: action.top,
            },
        };
    case 'DRAG_END':
        if (!current.drag.active) return current;
        return {
            ...current,
            drag: {
                ...initialState.drag,
            },
        };
    default:
        return current;
    }
}

function emit() {
    for (const listener of listeners) {
        listener();
    }
}

function dispatch(action) {
    const next = reduce(state, action);
    if (next !== state) {
        state = next;
        emit();
    }
}

function getState() {
    return state;
}

function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function useWindoesState(selector = (s) => s) {
    return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}

const WindoesApp = {
    // ── shared config ──────────────────────────
    config,

    // DOM refs populated by shell-app.jsx.
    // Compatibility-only escape hatch during React migration.
    // Migration target: pass refs through React components/hooks instead of global DOM refs.
    dom: {
        startButton: null,
        startMenu: null,
        theDesktop: null,
        theTaskbar: null,
    },

    // Canonical shell state store.
    // Allowed imperative API long-term: get/dispatch/subscribe/use
    state: {
        get: getState,
        subscribe,
        dispatch,
        use: useWindoesState,
    },

    // ── sound API (filled by sound.js) ────────
    sound: {},

    // ── runtime service APIs (filled by feature modules) ────────
    bsod: {},
    open: {},
    startMenu: {},
    runDialog: {},
    errorDialog: {},
    browser: {},
    ui: {},
    desktopContext: {},
    notepadDialogs: {},
};

Object.defineProperty(WindoesApp, 'bootDone', {
    get() {
        return state.boot.done;
    },
    set(value) {
        if (value) {
            dispatch({ type: 'BOOT_FINISH' });
        }
    },
});

// Keep on window for iframe communication
window.WindoesApp = WindoesApp;

export default WindoesApp;
