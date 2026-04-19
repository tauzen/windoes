import WindoesApp from '../app-state.js';

export function ensureAttached(manager, win) {
  if (win._attached) return;
  const desktop = manager._getDesktop();
  if (desktop && win.el) {
    desktop.appendChild(win.el);
  }
  if (win.taskBtn) {
    const taskArea = manager._getTaskArea();
    if (taskArea) taskArea.appendChild(win.taskBtn);
  }
  win._attached = true;
}

export function updateMaxBtn(win, maximized) {
  const btn = win.el ? win.el.querySelector('.ctrl-max') : null;
  if (btn) btn.textContent = maximized ? '⧉' : '□';
}

export function applyWindowState(manager, win, state) {
  if (!state) return;

  const prev = win._lastState || null;

  if ((state.open || state.minimized || state.taskbarVisible) && !win._attached) {
    manager._ensureAttached(win);
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

    win.el.style.zIndex = String(manager._baseZ + (state.zIndex || 0));

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

    manager._updateMaxBtn(win, !!state.maximized);
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
}

export function applyStateFromStore(manager) {
  const windowsState = WindoesApp.state.get().windows?.byId || {};
  Object.entries(manager._windows).forEach(([id, win]) => {
    manager._applyWindowState(win, windowsState[id] || null);
  });
}

export function handleWindowInteraction(manager, command) {
  if (!command || !command.type) return;
  if (command.type === 'TOGGLE_MAXIMIZE' && command.id) {
    manager.toggleMaximize(command.id);
    return;
  }
  if (command.type === 'BRING_TO_FRONT' && command.id) {
    manager.bringToFront(command.id);
  }
}
