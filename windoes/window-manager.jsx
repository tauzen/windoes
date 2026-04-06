// ══════════════════════════════════════════════
// Window Manager (JSX-rendered shell windows)
// ══════════════════════════════════════════════
import WindoesApp from './app-state.js';
import { makeDraggable } from './dragging.js';
import { renderInto } from './react-view.js';

const WindowManager = {
    _stack: [],      // ordered bottom→top by z-index
    _windows: {},    // id → config
    _baseZ: 10,
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
        section.className = 'window window-headless hidden' + (tmpl.className ? ' ' + tmpl.className : '');
        section.id = tmpl.id;
        section.setAttribute('aria-label', tmpl.ariaLabel || tmpl.title);
        if (tmpl.style) section.style.cssText = tmpl.style;

        renderInto(section, <>{tmpl.view || null}</>);

        return section;
    },

    /**
     * Build a window <section> element from a template config object.
     */
    _buildWindowEl(tmpl) {
        const hasMaxBtn = tmpl.maximizeBtn || tmpl.maximizeBtnId;
        const viewStyle = tmpl.viewStyle
            ? tmpl.viewStyle.split(';').filter(Boolean).reduce((acc, chunk) => {
                const [rawKey, ...rawValue] = chunk.split(':');
                if (!rawKey || rawValue.length === 0) return acc;
                const key = rawKey.trim().replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
                acc[key] = rawValue.join(':').trim();
                return acc;
            }, {})
            : undefined;

        const content = [
            <div
                key="titlebar"
                className="titlebar"
                {...(tmpl.titlebarId ? { id: tmpl.titlebarId } : {})}
            >
                <div className="title-left">
                    {(tmpl.titleIcon || tmpl.titleLogoClass) && (
                        <span
                            className={tmpl.titleLogoClass || ('app-title-logo ' + (tmpl.titleIcon || ''))}
                            aria-hidden={true}
                        ></span>
                    )}
                    <span {...(tmpl.titleSpanId ? { id: tmpl.titleSpanId } : {})}>{tmpl.title}</span>
                </div>
                <div className="window-controls">
                    {tmpl.minimizeBtnId && <div className="ctrl-btn" id={tmpl.minimizeBtnId}>_</div>}
                    {hasMaxBtn && (
                        <div
                            className="ctrl-btn ctrl-max"
                            {...(tmpl.maximizeBtnId ? { id: tmpl.maximizeBtnId } : {})}
                        >
                            □
                        </div>
                    )}
                    {tmpl.closeBtnId && <button className="ctrl-btn" id={tmpl.closeBtnId} aria-label="Close">×</button>}
                </div>
            </div>,
        ];

        if (tmpl.menubar) {
            content.push(
                <div key="menubar" className="menubar">
                    {tmpl.menubar.map((item, index) => {
                        if (typeof item === 'string') {
                            return <span key={`menu-${index}`}>{item}</span>;
                        }
                        return <span key={`menu-${item.id || index}`} {...(item.id ? { id: item.id } : {})}>{item.label}</span>;
                    })}
                </div>
            );
        }

        if (tmpl.toolbar) {
            content.push(tmpl.toolbar);
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

    /**
     * Register a window with the manager.
     */
    register(id, config) {
        // Build DOM from template if provided
        if (config.template) {
            config.el = config.headless
                ? this._buildHeadlessEl(config.template)
                : this._buildWindowEl(config.template);
        }

        // Build taskbar button if specified
        if (config.taskButton) {
            config.taskBtn = this._buildTaskBtn(config.taskButton);
        }

        // Resolve iframe reference from template
        if (config.iframeId && config.el) {
            config.iframe = config.el.querySelector('#' + config.iframeId);
        }

        config.id = id;
        config.isOpen = false;
        config._attached = false;
        this._windows[id] = config;

        // Click anywhere on window → bring to front
        config.el.addEventListener('mousedown', () => this.bringToFront(id));

        // Auto-wire close button
        if (config.template && config.template.closeBtnId) {
            const closeBtn = config.el.querySelector('#' + config.template.closeBtnId);
            if (closeBtn) closeBtn.addEventListener('click', () => this.close(id));
        }

        // Auto-wire minimize button
        if (config.template && config.template.minimizeBtnId) {
            const minBtn = config.el.querySelector('#' + config.template.minimizeBtnId);
            if (minBtn) minBtn.addEventListener('click', () => this.minimize(id));
        }

        // Auto-wire maximize button
        if (config.template && (config.template.maximizeBtnId || config.template.maximizeBtn)) {
            const maxBtn = config.el.querySelector('.ctrl-max');
            if (maxBtn) maxBtn.addEventListener('click', () => this.toggleMaximize(id));
        }

        // Auto-wire taskbar toggle
        if (config.taskBtn) {
            config.taskBtn.addEventListener('click', () => this.toggleFromTaskbar(id));
        }

        // Auto-wire dragging
        if (config.draggable !== false) {
            const titlebar = config.template && config.template.titlebarId
                ? config.el.querySelector('#' + config.template.titlebarId)
                : config.el.querySelector('.titlebar');
            if (titlebar) {
                makeDraggable(titlebar, config.el);
                // Double-click titlebar to toggle maximize (if window has a maximize button)
                if (config.template && (config.template.maximizeBtnId || config.template.maximizeBtn)) {
                    titlebar.addEventListener('dblclick', (e) => {
                        if (!e.target.classList.contains('ctrl-btn')) this.toggleMaximize(id);
                    });
                }
            }
        }

        // Run setup callback for custom wiring
        if (config.setup) config.setup(config);

        return config;
    },

    /** Get a registered window config by id */
    get(id) {
        return this._windows[id];
    },

    /** Return the ordered stack (bottom→top) of open window ids */
    getStack() {
        return this._stack.slice();
    },

    /** Return the topmost (focused) window id, or null */
    getFocused() {
        return this._stack.length ? this._stack[this._stack.length - 1] : null;
    },

    /**
     * Bring a window to the top of the stack and update z-indices.
     */
    bringToFront(id) {
        const win = this._windows[id];
        if (!win) return;

        // Move to top of stack
        const idx = this._stack.indexOf(id);
        if (idx !== -1) this._stack.splice(idx, 1);
        this._stack.push(id);

        // Reassign z-indices based on stack position
        this._stack.forEach((wid, i) => {
            this._windows[wid].el.style.zIndex = this._baseZ + i + 1;
        });

        // Update titlebars: active/inactive
        this._updateTitlebars();
    },

    /**
     * Attach window and taskbar button to the document (lazy, on first open).
     */
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

    /**
     * Open (show) a window. If already open, just brings to front.
     */
    open(id) {
        const win = this._windows[id];
        if (!win) return;

        // Lazy DOM attachment
        this._ensureAttached(win);

        // Load iframe if needed
        if (win.iframe && win.iframeSrc) {
            const currentSrc = win.iframe.getAttribute('src');
            if (!currentSrc || currentSrc === '' || currentSrc === 'about:blank') {
                win.iframe.src = win.iframeSrc;
            }
        }

        win.el.classList.remove('hidden');
        win.isOpen = true;

        if (win.taskBtn) {
            win.taskBtn.style.display = 'flex';
        }

        this.bringToFront(id);

        if (win.onOpen) win.onOpen();
    },

    /**
     * Close a window fully (hide + clear iframe + hide taskbar button).
     */
    close(id) {
        const win = this._windows[id];
        if (!win) return;

        if (win.isMaximized) {
            win.isMaximized = false;
            win.el.classList.remove('maximized');
            this._updateMaxBtn(win);
        }

        win.el.classList.add('hidden');
        win.isOpen = false;

        if (win.taskBtn) {
            win.taskBtn.style.display = 'none';
        }

        // Clear iframe to stop media/scripts
        if (win.iframe) {
            win.iframe.removeAttribute('src');
            win.iframe.src = 'about:blank';
        }

        // Remove from stack
        const idx = this._stack.indexOf(id);
        if (idx !== -1) this._stack.splice(idx, 1);

        this._updateTitlebars();

        if (win.onClose) win.onClose();
    },

    minimize(id) {
        const win = this._windows[id];
        if (!win) return;

        win.el.classList.add('hidden');

        const idx = this._stack.indexOf(id);
        if (idx !== -1) this._stack.splice(idx, 1);

        this._updateTitlebars();
    },

    restore(id) {
        const win = this._windows[id];
        if (!win) return;

        win.el.classList.remove('hidden');
        this.bringToFront(id);
    },

    toggleFromTaskbar(id) {
        const win = this._windows[id];
        if (!win) return;

        if (win.el.classList.contains('hidden')) {
            this.restore(id);
        } else {
            this.minimize(id);
        }
    },

    minimizeAll() {
        const openIds = this._stack.slice();
        openIds.forEach(id => this.minimize(id));
    },

    maximize(id) {
        const win = this._windows[id];
        if (!win || win.isMaximized) return;
        const el = win.el;
        win._savedStyle = { left: el.style.left, top: el.style.top, width: el.style.width, height: el.style.height };
        win.isMaximized = true;
        el.classList.add('maximized');
        this._updateMaxBtn(win);
        this.bringToFront(id);
    },

    unmaximize(id) {
        const win = this._windows[id];
        if (!win || !win.isMaximized) return;
        const el = win.el;
        win.isMaximized = false;
        el.classList.remove('maximized');
        if (win._savedStyle) {
            el.style.left = win._savedStyle.left;
            el.style.top = win._savedStyle.top;
            el.style.width = win._savedStyle.width;
            el.style.height = win._savedStyle.height;
        }
        this._updateMaxBtn(win);
        this.bringToFront(id);
    },

    toggleMaximize(id) {
        const win = this._windows[id];
        if (!win) return;
        win.isMaximized ? this.unmaximize(id) : this.maximize(id);
    },

    _updateMaxBtn(win) {
        const btn = win.el ? win.el.querySelector('.ctrl-max') : null;
        if (btn) btn.textContent = win.isMaximized ? '⧉' : '□';
    },

    _updateTitlebars() {
        const focusedId = this.getFocused();
        Object.values(this._windows).forEach(win => {
            const tb = win.el.querySelector('.titlebar');
            const isActive = win.id === focusedId && !win.el.classList.contains('hidden');
            if (tb) {
                if (isActive) {
                    tb.classList.remove('inactive');
                } else {
                    tb.classList.add('inactive');
                }
            }
            if (win.taskBtn && win.taskBtn.style.display !== 'none') {
                if (isActive) {
                    win.taskBtn.classList.add('active');
                } else {
                    win.taskBtn.classList.remove('active');
                }
            }
        });
    }
};

// Register on shared namespace
WindoesApp.WindowManager = WindowManager;

// Legacy helper for any code still calling bringToFront(el)
export function bringToFront(windowEl) {
    const entry = Object.values(WindowManager._windows).find(w => w.el === windowEl);
    if (entry) {
        WindowManager.bringToFront(entry.id);
    } else {
        const maxZ = WindowManager._baseZ + WindowManager._stack.length + 1;
        windowEl.style.zIndex = maxZ;
    }
}
