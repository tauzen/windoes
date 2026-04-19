// ══════════════════════════════════════════════
// Shared Application State & Namespace
// ══════════════════════════════════════════════
import { useSyncExternalStore } from 'react';
import defaultConfig from './simulator.config.js';
import { initialState, reduce } from './app-state-reducer.mjs';
import { createEventBus } from './event-bus.js';

// Allow runtime config override (used by tests via addInitScript)
const runtimeOverride = window.WIN_ME_SIMULATOR_CONFIG;
const config = runtimeOverride ? { ...defaultConfig, ...runtimeOverride } : defaultConfig;

let state = initialState;
const listeners = new Set();

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
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state)
  );
}

const WindoesApp = {
  // ── shared config ──────────────────────────
  config,

  // Canonical shell state store.
  // Allowed imperative API long-term: get/dispatch/subscribe/use
  state: {
    get: getState,
    subscribe,
    dispatch,
    use: useWindoesState,
  },

  // Typed event buses for imperative one-shot interactions.
  events: {
    windowInteraction: createEventBus(),
    explorerInteraction: createEventBus(),
    notepadInteraction: createEventBus(),
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

// Keep on window for iframe communication
window.WindoesApp = WindoesApp;

export default WindoesApp;
