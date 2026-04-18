import { useEffect, useState } from 'react';
import WindoesApp from '../app-state.js';

function formatClock(now) {
  return now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function Taskbar({ taskbarRef, startButtonRef }) {
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
        className="start-btn"
        id="startButton"
        onClick={() => {
          if (typeof WindoesApp.startMenu.toggle === 'function') {
            WindoesApp.startMenu.toggle();
            return;
          }

          // Fallback during first-mount timing before StartMenu bridge is registered.
          const startMenu = WindoesApp.dom.startMenu;
          const startButton = WindoesApp.dom.startButton;
          if (!startMenu || !startButton) return;
          startMenu.classList.toggle('open');
          startButton.classList.toggle('pressed', startMenu.classList.contains('open'));
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
      <div className="quick-launch">
        <span className="ql-btn ql-ie" id="qlIE" title="Launch Internet Explorer"></span>
        <span
          className="ql-btn ql-desktop"
          title="Show Desktop"
          onClick={() => WindoesApp.desktopContext?.onShowDesktopClick?.()}
        ></span>
      </div>
      <div className="task-divider"></div>
      <div className="task-area" id="taskArea"></div>
      <div className="tray">
        <span
          className="tray-volume"
          aria-label="Volume"
          id="trayVolume"
          onClick={() => WindoesApp.desktopContext?.onTrayVolumeClick?.()}
        ></span>
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
