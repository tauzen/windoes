(function () {
  function createWindowManager() {
    return {
      _stack: [],
      _windows: {},
      _baseZ: 10,
      register(id, config) {
        config.id = id;
        config.isOpen = false;
        this._windows[id] = config;
        config.el.addEventListener('mousedown', () => this.bringToFront(id));
      },
      get(id) {
        return this._windows[id];
      },
      getStack() {
        return this._stack.slice();
      },
      getFocused() {
        return this._stack.length ? this._stack[this._stack.length - 1] : null;
      },
      bringToFront(id) {
        const win = this._windows[id];
        if (!win) return;
        const idx = this._stack.indexOf(id);
        if (idx !== -1) this._stack.splice(idx, 1);
        this._stack.push(id);
        this._stack.forEach((wid, i) => {
          this._windows[wid].el.style.zIndex = this._baseZ + i + 1;
        });
        this._updateTitlebars();
      },
      open(id) {
        const win = this._windows[id];
        if (!win) return;
        if (win.iframe && win.iframeSrc) {
          const currentSrc = win.iframe.getAttribute('src');
          if (!currentSrc || currentSrc === '' || currentSrc === 'about:blank') {
            win.iframe.src = win.iframeSrc;
          }
        }
        win.el.classList.remove('hidden');
        win.isOpen = true;
        if (win.taskBtn) win.taskBtn.style.display = 'flex';
        this.bringToFront(id);
        if (win.onOpen) win.onOpen();
      },
      close(id) {
        const win = this._windows[id];
        if (!win) return;
        win.el.classList.add('hidden');
        win.isOpen = false;
        if (win.taskBtn) win.taskBtn.style.display = 'none';
        if (win.iframe) {
          win.iframe.removeAttribute('src');
          win.iframe.src = 'about:blank';
        }
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
        if (win.el.classList.contains('hidden')) this.restore(id);
        else this.minimize(id);
      },
      minimizeAll() {
        const openIds = this._stack.slice();
        openIds.forEach(id => this.minimize(id));
      },
      _updateTitlebars() {
        const focusedId = this.getFocused();
        Object.values(this._windows).forEach(win => {
          const tb = win.el.querySelector('.titlebar');
          if (!tb) return;
          if (win.id === focusedId && !win.el.classList.contains('hidden')) tb.classList.remove('inactive');
          else tb.classList.add('inactive');
        });
      },
    };
  }

  window.createWindowManager = createWindowManager;
})();
