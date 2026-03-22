// ══════════════════════════════════════════════
// Orchestrator — single entry point
//
// Module load order (each builds on the previous):
//   simulator.config.js  – static config (boot messages, BSOD texts, run actions)
//   app-state.js         – WindoesApp namespace (shared state & cross-module APIs)
//   sound.js             – WindoesApp.sound (playBeep, playStartupSound, …)
//   window-manager.js    – WindoesApp.WindowManager + bringToFront()
//   dragging.js          – WindoesApp.helpers.makeDraggable()
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

setTimeout(WindoesApp.boot.runBootSequence, 300);
