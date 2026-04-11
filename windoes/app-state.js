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
    },
    selection: {
        desktopIconId: null,
        explorerItemPath: null,
    },
    drag: {
        active: false,
        sourceId: null,
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
    // Allowed imperative API (non-UI side-effect service).
    sound: {},

    // ── boot API (filled by boot.js) ──────────
    // @deprecated bridge. Migration target: boot transitions dispatched from React boot controller.
    boot: {},

    // ── bsod / error dialog API (filled by bsod.jsx) ──
    // @deprecated bridge. Migration target: dialog state/actions in React shell reducer.
    bsod: {},

    // ── window-open helpers (filled by ie-window.jsx, app-windows.jsx, utility-windows.jsx) ──
    // @deprecated bridge. Migration target: typed window actions dispatched through WindoesApp.state.
    open: {},

    // ── menu helpers (filled by start-menu.jsx) ──
    // @deprecated bridge. Migration target: menu open/close/focus state in reducer + component handlers.
    menu: {},

    // ── ie helpers (filled by ie-window.jsx) ──
    // @deprecated bridge. Migration target: feature-local module exports/hooks.
    ie: {},

    // ── misc helpers (filled by ie-window.jsx) ──
    // @deprecated bridge. Migration target: explicit utility modules.
    helpers: {},
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
