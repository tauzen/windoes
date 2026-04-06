// ══════════════════════════════════════════════
// Shared Application State & Namespace
//
// Loaded early (before all other modules) to provide a single
// namespace for cross-module state and APIs.  Modules register
// their public functions here so consumers can use explicit
// references instead of implicit globals.
// ══════════════════════════════════════════════

import defaultConfig from './simulator.config.js';

// Allow runtime config override (used by tests via addInitScript)
const runtimeOverride = window.WIN_ME_SIMULATOR_CONFIG;
const config = runtimeOverride ? { ...defaultConfig, ...runtimeOverride } : defaultConfig;

const WindoesApp = {
    // ── shared state ──────────────────────────
    config,
    bootDone: false,

    // DOM refs populated once the DOM is ready (set by boot.js)
    dom: {
        startButton: null,
        startMenu: null,
        theDesktop: null,
        theTaskbar: null,
    },

    // ── sound API (filled by sound.js) ────────
    sound: {},

    // ── boot API (filled by boot.js) ──────────
    boot: {},

    // ── bsod / error dialog API (filled by bsod.jsx) ──
    bsod: {},

    // ── window-open helpers (filled by ie-window.jsx, app-windows.jsx, utility-windows.jsx) ──
    open: {},

    // ── menu helpers (filled by start-menu.jsx) ──
    menu: {},

    // ── ie helpers (filled by ie-window.jsx) ──
    ie: {},

    // ── misc helpers (filled by ie-window.jsx) ──
    helpers: {},
};

// Keep on window for iframe communication
window.WindoesApp = WindoesApp;

export default WindoesApp;
