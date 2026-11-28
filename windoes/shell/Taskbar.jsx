import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import WindoesApp from '../app-state.js';

function formatClock(now) {
  return now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function Taskbar({ taskbarRef, startButtonRef }) {
  const bootDone = WindoesApp.state.use((s) => s.boot.done);
  const shutdownScreenVisible = WindoesApp.state.use((s) => s.dialogs.shutdownScreenVisible);
  const startMenuOpen = WindoesApp.state.use((s) => s.menus.startOpen);
  const [clockText, setClockText] = useState(() => formatClock(new Date()));
  const [menu, setMenu] = useState(null);
  const menuRef = useRef(null);
  const windowState = WindoesApp.state.use((s) => (menu ? s.windows.byId[menu.id] : null));
  const taskAreaRef = useRef(null);

  useEffect(() => {
    const area = taskAreaRef.current;
    function onContextMenu(event) {
      openWindowMenu(event);
    }
    function onKeyDown(event) {
      if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
        openWindowMenu(event, true);
      }
    }
    area.addEventListener('contextmenu', onContextMenu);
    area.addEventListener('keydown', onKeyDown);
    return () => {
      area.removeEventListener('contextmenu', onContextMenu);
      area.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  useLayoutEffect(() => {
    if (!menu || !menuRef.current) return;
    const element = menuRef.current;
    const rect = element.getBoundingClientRect();
    element.style.left = `${Math.max(0, Math.min(menu.x, window.innerWidth - rect.width))}px`;
    element.style.top = `${Math.max(0, Math.min(menu.y, window.innerHeight - rect.height))}px`;
    if (menu.keyboard) element.querySelector('button:not(:disabled)')?.focus();
  }, [menu]);

  useEffect(() => {
    if (!menu) return undefined;
    function dismiss(event) {
      if (!menuRef.current?.contains(event.target)) setMenu(null);
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenu(null);
        menu.button.focus();
      }
    }
    function onBlur() {
      if (document.activeElement?.tagName === 'IFRAME') setMenu(null);
    }
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('contextmenu', dismiss);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('contextmenu', dismiss);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('blur', onBlur);
    };
  }, [menu]);

  function openWindowMenu(event, keyboard = false) {
    const button = event.target.closest('.task-button');
    if (!button || !event.currentTarget.contains(button)) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = button.getBoundingClientRect();
    setMenu({
      id: button.dataset.windowId,
      button,
      x: keyboard ? rect.left : event.clientX,
      y: keyboard ? rect.top : event.clientY,
      keyboard,
    });
  }

  function performWindowAction(action) {
    const manager = WindoesApp.WindowManager;
    if (action === 'restore') {
      if (windowState.minimized) manager.restore(menu.id);
      else if (windowState.maximized) manager.unmaximize(menu.id);
    } else {
      if (action === 'maximize' && windowState.minimized) manager.restore(menu.id);
      manager[action](menu.id);
    }
    setMenu(null);
    if (action !== 'close') menu.button.focus();
  }

  const template = menu && WindoesApp.WindowManager.get(menu.id)?.template;
  const canMaximize = !!(template?.maximizeBtn || template?.maximizeBtnId);
  const actions = [
    ['restore', 'Restore', !windowState || (!windowState.minimized && !windowState.maximized)],
    ['minimize', 'Minimize', !windowState || windowState.minimized],
    ['maximize', 'Maximize', !windowState || !canMaximize || windowState.maximized],
    ['close', 'Close', !windowState],
  ];

  useEffect(() => {
    let intervalId;

    function updateClock() {
      setClockText(formatClock(new Date()));
    }

    function startClock() {
      if (intervalId || document.hidden) return;
      updateClock();
      intervalId = window.setInterval(updateClock, 1000);
    }

    function stopClock() {
      if (!intervalId) return;
      window.clearInterval(intervalId);
      intervalId = null;
    }

    function onVisibilityChange() {
      if (document.hidden) {
        stopClock();
      } else {
        startClock();
      }
    }

    startClock();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      stopClock();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return (
    <div
      ref={taskbarRef}
      className="taskbar"
      id="theTaskbar"
      style={{ display: bootDone && !shutdownScreenVisible ? '' : 'none' }}
    >
      <button
        ref={startButtonRef}
        className={`start-btn${startMenuOpen ? ' pressed' : ''}`}
        id="startButton"
        aria-haspopup="menu"
        aria-controls="startMenu"
        aria-expanded={startMenuOpen ? 'true' : 'false'}
        onClick={() => {
          WindoesApp.state.dispatch({ type: 'START_MENU_TOGGLE' });
          WindoesApp.sound.playClickSound();
        }}
      >
        <span className="start-flag">
          <span className="f1"></span>
          <span className="f2"></span>
          <span className="f3"></span>
          <span className="f4"></span>
        </span>
        <span>Start</span>
      </button>
      <div className="quick-launch" role="group" aria-label="Quick launch">
        <button
          type="button"
          className="ql-btn ql-ie"
          id="qlIE"
          title="Launch Internet Explorer"
          aria-label="Launch Internet Explorer"
          onClick={() => WindoesApp.open.internetExplorer()}
        ></button>
        <button
          type="button"
          className="ql-btn ql-desktop"
          title="Show Desktop"
          aria-label="Show Desktop"
          onClick={() => WindoesApp.desktopContext?.onShowDesktopClick?.()}
        ></button>
      </div>
      <div className="task-divider"></div>
      <div className="task-area" id="taskArea" ref={taskAreaRef}></div>
      {menu && windowState && (
        <div
          ref={menuRef}
          className="context-menu open"
          role="menu"
          aria-label="Window menu"
          style={{ left: menu.x, top: menu.y }}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
            event.preventDefault();
            const items = [...event.currentTarget.querySelectorAll('button:not(:disabled)')];
            const index = items.indexOf(document.activeElement);
            items[
              (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
            ]?.focus();
          }}
        >
          {actions.map(([action, label, disabled]) => (
            <button
              key={action}
              type="button"
              role="menuitem"
              className="context-menu-item"
              disabled={disabled}
              onClick={() => performWindowAction(action)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="tray">
        <button
          type="button"
          className="tray-volume"
          aria-label="Volume"
          id="trayVolume"
          onClick={() => WindoesApp.desktopContext?.onTrayVolumeClick?.()}
        ></button>
        <span
          id="clock"
          onMouseEnter={(e) => WindoesApp.desktopContext?.onClockEnter?.(e)}
          onMouseLeave={() => WindoesApp.desktopContext?.onClockLeave?.()}
        >
          {clockText}
        </span>
      </div>
    </div>
  );
}
