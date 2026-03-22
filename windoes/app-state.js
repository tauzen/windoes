// ══════════════════════════════════════════════
// Shared Application State & Namespace
//
// Loaded early (before all other modules) to provide a single
// namespace for cross-module state and APIs.  Modules register
// their public functions here so consumers can use explicit
// references instead of implicit globals.
// ══════════════════════════════════════════════

window.WindoesApp = {
    // ── shared state ──────────────────────────
    config: window.WIN_ME_SIMULATOR_CONFIG || {},
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

    // ── bsod / error dialog API (filled by bsod.js) ──
    bsod: {},

    // ── window-open helpers (filled by ie-window, app-windows, utility-windows) ──
    open: {},

    // ── menu helpers (filled by start-menu.js) ──
    menu: {},

    // ── ie helpers (filled by ie-window.js) ──
    ie: {},

    // ── misc helpers (filled by ie-window.js) ──
    helpers: {},
};
