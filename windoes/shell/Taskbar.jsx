import { useEffect, useState } from 'react';
import WindoesApp from '../app-state.js';

function formatClock(now) {
  return now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function Taskbar({ taskbarRef, startButtonRef, startMenuOpen, setStartMenuOpen }) {
  const bootDone = WindoesApp.state.use((s) => s.boot.done);
  const shutdownScreenVisible = WindoesApp.state.use((s) => s.dialogs.shutdownScreenVisible);
  const [clockText, setClockText] = useState(() => formatClock(new Date()));

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
          if (typeof WindoesApp.startMenu.toggle === 'function') {
            WindoesApp.startMenu.toggle();
            return;
          }
          setStartMenuOpen((open) => !open);
          WindoesApp.sound.playClickSound();
        }}
      >
        <span className="start-flag">
          <span className="f1"></span>
          <span className="f2"></span>
          <span className="f3"></span>
          <span className="f4"></span>
        </span>
        Start
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
      <div className="task-area" id="taskArea"></div>
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
