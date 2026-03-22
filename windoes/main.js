// ══════════════════════════════════════════════
// Orchestrator — single entry point
//
// Module load order (each builds on the previous):
//   simulator.config.js  – static config (boot messages, BSOD texts, run actions)
//   sound.js             – Web Audio helpers (playBeep, playStartupSound, …)
//   window-manager.js    – WindowManager object + bringToFront()
//   dragging.js          – makeDraggable()
//   boot.js              – shared DOM refs (startButton, startMenu, …) + runBootSequence()
//   bsod.js              – triggerBSOD(), showErrorDialog(), scheduleRandom*()
//   ie-window.js         – IE window, navigate(), openInternetExplorer(), body_loading()
//   app-windows.js       – openApp(), openWinamp(), openMinesweeper()
//   utility-windows.js   – openMyComputer(), openNotepad(), openRecycleBin()
//   desktop.js           – icon double-click handlers, taskbar button wiring
//   start-menu.js        – Start menu, submenus, shutdown, closeProgramsSubmenu()
//   run-dialog.js        – Run dialog command dispatch
//   context-menu.js      – right-click menu, Show Desktop, clock tooltip, tray
//   main.js              ← you are here
// ══════════════════════════════════════════════

setTimeout(WindoesApp.boot.runBootSequence, 300);
