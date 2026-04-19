import WindoesApp from './app-state.js';
import { WINDOW_Z_BASE } from './constants.js';
import {
  buildHeadlessEl,
  buildTaskBtn,
  buildWindowEl,
} from './window-manager/window-renderers.jsx';
import {
  applyStateFromStore,
  applyWindowState,
  ensureAttached,
  handleWindowInteraction,
  updateMaxBtn,
} from './window-manager/state-applier.js';
import {
  runCleanupFns,
  setupRegistrationListeners,
  trackListener,
} from './window-manager/listener-utils.js';

const WindowManager = {
  _windows: {}, // id → config registry
  _baseZ: WINDOW_Z_BASE,
  _desktopEl: null,
  _taskAreaEl: null,

  _getDesktop() {
    if (!this._desktopEl) this._desktopEl = document.querySelector('#theDesktop');
    return this._desktopEl;
  },

  _getTaskArea() {
    if (!this._taskAreaEl) this._taskAreaEl = document.querySelector('#taskArea');
    return this._taskAreaEl;
  },

  _buildHeadlessEl: buildHeadlessEl,
  _buildWindowEl: buildWindowEl,
  _buildTaskBtn: buildTaskBtn,

  _getWindowState(id) {
    return WindoesApp.state.get().windows.byId[id] || null;
  },

  _dispatch(action) {
    WindoesApp.state.dispatch(action);
  },

  _trackListener: trackListener,
  _runCleanupFns: runCleanupFns,
  _ensureAttached(win) {
    ensureAttached(this, win);
  },
  _updateMaxBtn(win, maximized) {
    updateMaxBtn(win, maximized);
  },
  _applyWindowState(win, state) {
    applyWindowState(this, win, state);
  },
  _applyStateFromStore() {
    applyStateFromStore(this);
  },
  _handleWindowInteraction(command) {
    handleWindowInteraction(this, command);
  },

  register(id, config) {
    config.id = id;

    if (config.template) {
      config.el = config.headless
        ? this._buildHeadlessEl(config.template)
        : this._buildWindowEl(config.template, id);
    }

    if (config.taskButton) {
      config.taskBtn = this._buildTaskBtn(config.taskButton);
    }

    if (config.iframeId && config.el) {
      config.iframe = config.el.querySelector('#' + config.iframeId);
    }
    if (config.el) config.el.dataset.windowId = id;
    config._attached = false;
    config._lastState = null;
    this._windows[id] = config;

    this._dispatch({ type: 'WINDOW_REGISTER', id });

    const cleanups = [];
    config._cleanups = cleanups;
    setupRegistrationListeners(this, id, config, cleanups);

    return config;
  },

  get(id) {
    return this._windows[id];
  },

  getStack() {
    return WindoesApp.state.get().windows.stack.slice();
  },

  getFocused() {
    return WindoesApp.state.get().windows.focusedId;
  },

  bringToFront(id) {
    this._dispatch({ type: 'WINDOW_FOCUS', id });
  },

  open(id) {
    this._dispatch({ type: 'WINDOW_OPEN', id });
  },

  close(id) {
    this._dispatch({ type: 'WINDOW_CLOSE', id });
  },

  minimize(id) {
    this._dispatch({ type: 'WINDOW_MINIMIZE', id });
  },

  restore(id) {
    this._dispatch({ type: 'WINDOW_RESTORE', id });
  },

  toggleFromTaskbar(id) {
    const state = this._getWindowState(id);
    if (!state) return;

    if (state.minimized || !state.open) {
      this.restore(id);
    } else {
      this.minimize(id);
    }
  },

  minimizeAll() {
    const openIds = this.getStack();
    openIds.forEach((id) => this.minimize(id));
  },

  maximize(id) {
    const state = this._getWindowState(id);
    if (!state || state.maximized) return;
    this._dispatch({ type: 'WINDOW_MAXIMIZE_TOGGLE', id });
  },

  unmaximize(id) {
    const state = this._getWindowState(id);
    if (!state || !state.maximized) return;
    this._dispatch({ type: 'WINDOW_MAXIMIZE_TOGGLE', id });
  },

  toggleMaximize(id) {
    this._dispatch({ type: 'WINDOW_MAXIMIZE_TOGGLE', id });
  },
};

WindoesApp.WindowManager = WindowManager;

const unsubscribeWindowManagerBridge = WindoesApp.state.subscribe(() => {
  WindowManager._applyStateFromStore();
});

const unsubscribeWindowInteraction = WindoesApp.events.windowInteraction.subscribe((command) => {
  WindowManager._handleWindowInteraction(command);
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unsubscribeWindowManagerBridge();
    unsubscribeWindowInteraction();
    Object.values(WindowManager._windows).forEach((win) => {
      WindowManager._runCleanupFns(win?._cleanups);
      win._cleanups = [];
    });
  });
}

export function bringToFront(windowEl) {
  const entry = Object.values(WindowManager._windows).find((w) => w.el === windowEl);
  if (entry) {
    WindowManager.bringToFront(entry.id);
  } else {
    const maxZ = WindowManager._baseZ + WindowManager.getStack().length + 1;
    windowEl.style.zIndex = maxZ;
  }
}
