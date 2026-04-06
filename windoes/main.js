// ══════════════════════════════════════════════
// Orchestrator — single entry point (ES module)
//
// Module load order (each builds on the previous):
//   simulator.config.js  – static config (boot messages, BSOD texts, run actions)
//   app-state.js         – WindoesApp namespace (shared state & cross-module APIs)
//   sound.js             – WindoesApp.sound (playBeep, playStartupSound, …)
//   window-manager.jsx   – WindoesApp.WindowManager + bringToFront()
//   dragging.js          – makeDraggable() (imported by window-manager.jsx)
//   boot.js              – WindoesApp.boot, WindoesApp.dom refs
//   bsod.jsx             – WindoesApp.bsod (showErrorDialog, scheduleRandom*, …)
//   ie-window.jsx        – WindoesApp.open.internetExplorer, WindoesApp.ie, WindoesApp.helpers
//   app-windows.jsx      – WindoesApp.open.app/winamp/minesweeper
//   utility-windows.jsx  – WindoesApp.open.myComputer/notepad/recycleBin
//   desktop.jsx          – icon double-click handlers, taskbar button wiring
//   start-menu.jsx       – WindoesApp.dom.startMenu, WindoesApp.menu
//   run-dialog.jsx       – Run dialog command dispatch
//   context-menu.jsx     – right-click menu, Show Desktop, clock tooltip, tray
//   main.js              ← you are here
// ══════════════════════════════════════════════

import './sound.js';
import './window-manager.jsx';
import './boot.js';
import './bsod.jsx';
import './ie-window.jsx';
import './app-windows.jsx';
import './utility-windows.jsx';
import './desktop.jsx';
import './start-menu.jsx';
import './run-dialog.jsx';
import './context-menu.jsx';
import WindoesApp from './app-state.js';

setTimeout(WindoesApp.boot.runBootSequence, 300);
