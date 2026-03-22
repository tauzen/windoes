// ══════════════════════════════════════════════
// Window Manager
// ══════════════════════════════════════════════
const WindowManager = {
    _stack: [],      // ordered bottom→top by z-index
    _windows: {},    // id → config
    _baseZ: 10,

    /**
     * Register a window with the manager.
     * @param {string} id         - unique key
     * @param {object} config
     *   .el            - the window section element
     *   .taskBtn       - taskbar button element (or null)
     *   .iframe        - iframe element (or null)
     *   .iframeSrc     - source URL to load when opening (or null)
     *   .hasChrome     - true if window has menubar/toolbar/status
     *   .onOpen        - optional callback after opening
     *   .onClose       - optional callback after closing
     */
    register(id, config) {
        config.id = id;
        config.isOpen = false;
        this._windows[id] = config;

        // Click anywhere on window → bring to front
        config.el.addEventListener('mousedown', () => this.bringToFront(id));
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
     * Open (show) a window. If already open, just brings to front.
     */
    open(id) {
        const win = this._windows[id];
        if (!win) return;

        // Load iframe if needed (first open or after close cleared it)
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

        win.el.classList.add('hidden');
        win.isOpen = false;

        if (win.taskBtn) {
            win.taskBtn.style.display = 'none';
        }

        // Clear iframe to stop media/scripts — use removeAttribute
        // so the src property doesn't resolve to the page URL
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

    /**
     * Minimize a window (hide it but keep taskbar button visible).
     */
    minimize(id) {
        const win = this._windows[id];
        if (!win) return;

        win.el.classList.add('hidden');

        // Remove from stack so it doesn't hold focus
        const idx = this._stack.indexOf(id);
        if (idx !== -1) this._stack.splice(idx, 1);

        this._updateTitlebars();
    },

    /**
     * Restore a minimized window (show + bring to front).
     */
    restore(id) {
        const win = this._windows[id];
        if (!win) return;

        win.el.classList.remove('hidden');
        this.bringToFront(id);
    },

    /**
     * Toggle from taskbar: if visible → minimize, if hidden → restore.
     */
    toggleFromTaskbar(id) {
        const win = this._windows[id];
        if (!win) return;

        if (win.el.classList.contains('hidden')) {
            this.restore(id);
        } else {
            this.minimize(id);
        }
    },

    /**
     * Minimize all open windows (Show Desktop).
     */
    minimizeAll() {
        // Copy stack since minimize mutates it
        const openIds = this._stack.slice();
        openIds.forEach(id => this.minimize(id));
    },

    /** Update titlebar active/inactive classes */
    _updateTitlebars() {
        const focusedId = this.getFocused();
        Object.values(this._windows).forEach(win => {
            const tb = win.el.querySelector('.titlebar');
            if (!tb) return;
            if (win.id === focusedId && !win.el.classList.contains('hidden')) {
                tb.classList.remove('inactive');
            } else {
                tb.classList.add('inactive');
            }
        });
    }
};

// Legacy helper for any code still calling bringToFront(el)
function bringToFront(windowEl) {
    // Find the registered id for this element
    const entry = Object.values(WindowManager._windows).find(w => w.el === windowEl);
    if (entry) {
        WindowManager.bringToFront(entry.id);
    } else {
        // Fallback for unregistered windows (dialogs etc.)
        const maxZ = WindowManager._baseZ + WindowManager._stack.length + 1;
        windowEl.style.zIndex = maxZ;
    }
}
