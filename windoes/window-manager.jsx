// ══════════════════════════════════════════════
// Window Manager (JSX-rendered shell windows)
// ══════════════════════════════════════════════
import WindoesApp from './app-state.js';
import { makeDraggable } from './dragging.js';
import { renderInto } from './react-view.js';
import { WINDOW_Z_BASE } from './constants.js';

function WindowTitlebar({ windowId, template }) {
  const isActive = WindoesApp.state.use((s) => {
    const win = s.windows?.byId?.[windowId];
    return !!(win && win.focused && win.open && !win.minimized);
  });

  const hasMaxBtn = template.maximizeBtn || template.maximizeBtnId;

  return (
    <div
      className={isActive ? 'titlebar' : 'titlebar inactive'}
      {...(template.titlebarId ? { id: template.titlebarId } : {})}
    >
      <div className="title-left">
        {(template.titleIcon || template.titleLogoClass) && (
          <span
            className={template.titleLogoClass || 'app-title-logo ' + (template.titleIcon || '')}
            aria-hidden={true}
          ></span>
        )}
        <span {...(template.titleSpanId ? { id: template.titleSpanId } : {})}>
          {template.title}
        </span>
      </div>
      <div className="window-controls">
        {template.minimizeBtnId && (
          <div className="ctrl-btn" id={template.minimizeBtnId}>
            _
          </div>
        )}
        {hasMaxBtn && (
          <div
            className="ctrl-btn ctrl-max"
            {...(template.maximizeBtnId ? { id: template.maximizeBtnId } : {})}
          >
            □
          </div>
        )}
        {template.closeBtnId && (
          <button className="ctrl-btn" id={template.closeBtnId} aria-label="Close">
            ×
          </button>
        )}
      </div>
    </div>
  );
}

const WindowManager = {
  _windows: {}, // id → config registry
  _baseZ: WINDOW_Z_BASE,
  _desktopEl: null,
  _taskAreaEl: null,

  _getDesktop() {
    if (!this._desktopEl) this._desktopEl = document.getElementById('theDesktop');
    return this._desktopEl;
  },

  _getTaskArea() {
    if (!this._taskAreaEl) this._taskAreaEl = document.getElementById('taskArea');
    return this._taskAreaEl;
  },

  /**
   * Build a headless window element (bare iframe, no chrome).
   */
  _buildHeadlessEl(tmpl) {
    const section = document.createElement('section');
    section.className =
      'window window-headless hidden' + (tmpl.className ? ' ' + tmpl.className : '');
    section.id = tmpl.id;
    section.setAttribute('aria-label', tmpl.ariaLabel || tmpl.title);
    if (tmpl.style) section.style.cssText = tmpl.style;

    renderInto(section, <>{tmpl.view || null}</>);

    return section;
  },

  /**
   * Build a window <section> element from a template config object.
   */
  _buildWindowEl(tmpl, windowId) {
    const viewStyle = tmpl.viewStyle
      ? tmpl.viewStyle
          .split(';')
          .filter(Boolean)
          .reduce((acc, chunk) => {
            const [rawKey, ...rawValue] = chunk.split(':');
            if (!rawKey || rawValue.length === 0) return acc;
            const key = rawKey.trim().replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
            acc[key] = rawValue.join(':').trim();
            return acc;
          }, {})
      : undefined;

    const content = [<WindowTitlebar key="titlebar" windowId={windowId} template={tmpl} />];

    if (tmpl.menubar) {
      content.push(
        <div key="menubar" className="menubar">
          {tmpl.menubar.map((item, index) => {
            if (typeof item === 'string') {
              return <span key={`menu-${index}`}>{item}</span>;
            }
            return (
              <span key={`menu-${item.id || index}`} {...(item.id ? { id: item.id } : {})}>
                {item.label}
              </span>
            );
          })}
        </div>
      );
    }

    if (tmpl.toolbar) {
      content.push(<div key="toolbar">{tmpl.toolbar}</div>);
    }

    if (tmpl.view !== undefined) {
      content.push(
        <div key="view" className="view" {...(viewStyle ? { style: viewStyle } : {})}>
          {tmpl.view}
        </div>
      );
    }

    if (tmpl.statusBar) {
      content.push(
        <div key="status" className="status">
          {tmpl.statusBar}
        </div>
      );
    }

    const section = document.createElement('section');
    section.className = 'window hidden' + (tmpl.className ? ' ' + tmpl.className : '');
    section.id = tmpl.id;
    section.setAttribute('aria-label', tmpl.ariaLabel || tmpl.title);
    if (tmpl.style) section.style.cssText = tmpl.style;

    renderInto(section, <>{content}</>);

    return section;
  },

  /**
   * Build a taskbar button element.
   */
  _buildTaskBtn(cfg) {
    const btn = document.createElement('button');
    btn.className = 'task-button';
    btn.style.display = 'none';
    if (cfg.id) btn.id = cfg.id;

    renderInto(
      btn,
      <>
        <span className={`task-icon ${cfg.icon}`}></span>
        <span {...(cfg.labelId ? { id: cfg.labelId } : {})}>{cfg.label}</span>
      </>
    );

    return btn;
  },

  _getWindowState(id) {
    return WindoesApp.state.get().windows.byId[id] || null;
  },

  _dispatch(action) {
    WindoesApp.state.dispatch(action);
  },

  _ensureAttached(win) {
    if (win._attached) return;
    const desktop = this._getDesktop();
    if (desktop && win.el) {
      desktop.appendChild(win.el);
    }
    if (win.taskBtn) {
      const taskArea = this._getTaskArea();
      if (taskArea) taskArea.appendChild(win.taskBtn);
    }
    win._attached = true;
  },

  _updateMaxBtn(win, maximized) {
    const btn = win.el ? win.el.querySelector('.ctrl-max') : null;
    if (btn) btn.textContent = maximized ? '⧉' : '□';
  },

  _applyWindowState(win, state) {
    if (!state) return;

    const prev = win._lastState || null;

    if ((state.open || state.minimized || state.taskbarVisible) && !win._attached) {
      this._ensureAttached(win);
    }

    if (win.iframe && win.iframeSrc && state.open && !prev?.open) {
      const currentSrc = win.iframe.getAttribute('src');
      if (!currentSrc || currentSrc === '' || currentSrc === 'about:blank') {
        win.iframe.src = win.iframeSrc;
      }
    }

    if (win.el) {
      if (state.open) {
        win.el.classList.remove('hidden');
      } else {
        win.el.classList.add('hidden');
      }

      win.el.style.zIndex = String(this._baseZ + (state.zIndex || 0));

      if (state.maximized && !prev?.maximized) {
        win._savedStyle = {
          left: win.el.style.left,
          top: win.el.style.top,
          width: win.el.style.width,
          height: win.el.style.height,
        };
      }

      if (state.maximized) {
        win.el.classList.add('maximized');
      } else {
        win.el.classList.remove('maximized');
        if (prev?.maximized && win._savedStyle) {
          win.el.style.left = win._savedStyle.left;
          win.el.style.top = win._savedStyle.top;
          win.el.style.width = win._savedStyle.width;
          win.el.style.height = win._savedStyle.height;
        }
      }

      this._updateMaxBtn(win, !!state.maximized);
    }

    if (win.taskBtn) {
      win.taskBtn.style.display = state.taskbarVisible ? 'flex' : 'none';
      const isActive = !!(state.focused && state.open && !state.minimized);
      win.taskBtn.classList.toggle('active', isActive);
    }

    const becameOpen = !prev?.open && !!state.open;
    if (becameOpen && win.onOpen) win.onOpen();

    const becameClosed = (prev?.open || prev?.minimized) && !state.open && !state.minimized;
    if (becameClosed) {
      if (win.iframe) {
        win.iframe.removeAttribute('src');
        win.iframe.src = 'about:blank';
      }
      if (win.onClose) win.onClose();
    }

    win._lastState = { ...state };
  },

  _applyStateFromStore() {
    const windowsState = WindoesApp.state.get().windows?.byId || {};
    Object.entries(this._windows).forEach(([id, win]) => {
      this._applyWindowState(win, windowsState[id] || null);
    });
  },

  _handleWindowInteraction(command) {
    if (!command || !command.type) return;
    if (command.type === 'TOGGLE_MAXIMIZE' && command.id) {
      this.toggleMaximize(command.id);
      return;
    }
    if (command.type === 'BRING_TO_FRONT' && command.id) {
      this.bringToFront(command.id);
    }
  },

  /**
   * Register a window with the manager.
   */
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

    config.el.addEventListener('mousedown', () => this.bringToFront(id));

    if (config.template && config.template.closeBtnId) {
      const closeBtn = config.el.querySelector('#' + config.template.closeBtnId);
      if (closeBtn) closeBtn.addEventListener('click', () => this.close(id));
    }

    if (config.template && config.template.minimizeBtnId) {
      const minBtn = config.el.querySelector('#' + config.template.minimizeBtnId);
      if (minBtn) minBtn.addEventListener('click', () => this.minimize(id));
    }

    if (config.template && (config.template.maximizeBtnId || config.template.maximizeBtn)) {
      const maxBtn = config.el.querySelector('.ctrl-max');
      if (maxBtn) {
        maxBtn.addEventListener('click', () => {
          WindoesApp.events.windowInteraction.emit({ type: 'TOGGLE_MAXIMIZE', id });
        });
      }
    }

    if (config.taskBtn) {
      config.taskBtn.addEventListener('click', () => this.toggleFromTaskbar(id));
    }

    if (config.draggable !== false) {
      const titlebar =
        config.template && config.template.titlebarId
          ? config.el.querySelector('#' + config.template.titlebarId)
          : config.el.querySelector('.titlebar');
      if (titlebar) {
        makeDraggable(titlebar, config.el);
        if (config.template && (config.template.maximizeBtnId || config.template.maximizeBtn)) {
          titlebar.addEventListener('dblclick', (e) => {
            if (e.target.classList.contains('ctrl-btn')) return;
            WindoesApp.events.windowInteraction.emit({ type: 'TOGGLE_MAXIMIZE', id });
          });
        }
      }
    }

    if (config.setup) config.setup(config);

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

// Register on shared namespace
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
  });
}

// Legacy helper for any code still calling bringToFront(el)
export function bringToFront(windowEl) {
  const entry = Object.values(WindowManager._windows).find((w) => w.el === windowEl);
  if (entry) {
    WindowManager.bringToFront(entry.id);
  } else {
    const maxZ = WindowManager._baseZ + WindowManager.getStack().length + 1;
    windowEl.style.zIndex = maxZ;
  }
}
