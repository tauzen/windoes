// ══════════════════════════════════════════════
// Orchestrator — single entry point (ES module)
//
// Module load order (each builds on the previous):
//   simulator.config.js  – static config (boot messages, BSOD texts, run actions)
//   app-state.js         – WindoesApp namespace (shared state & cross-module APIs)
//   sound.js             – WindoesApp.sound (playBeep, playStartupSound, …)
//   window-manager.js    – WindoesApp.WindowManager + bringToFront()
//   dragging.js          – makeDraggable() (imported by window-manager.js)
//   boot.js              – WindoesApp.boot, WindoesApp.dom refs
//   bsod.js              – WindoesApp.bsod (showErrorDialog, scheduleRandom*, …)
//   ie-window.js         – WindoesApp.open.internetExplorer, WindoesApp.ie, WindoesApp.helpers
//   app-windows.js       – WindoesApp.open.app/winamp/minesweeper
//   utility-windows.js   – WindoesApp.open.myComputer/notepad/recycleBin
//   desktop.js           – icon double-click handlers, taskbar button wiring
//   start-menu.js        – WindoesApp.dom.startMenu, WindoesApp.menu
//   run-dialog.js        – Run dialog command dispatch
//   context-menu.js      – right-click menu, Show Desktop, clock tooltip, tray
//   main.js              ← you are here
// ══════════════════════════════════════════════

import './sound.js';
import './window-manager.js';
import './boot.js';
import './bsod.js';
import './ie-window.js';
import './app-windows.js';
import './utility-windows.js';
import './desktop.js';
import './start-menu.js';
import './run-dialog.js';
import './context-menu.js';
import WindoesApp from './app-state.js';

setTimeout(WindoesApp.boot.runBootSequence, 300);
