// Shared helpers for window launchers (open*).
import WindoesApp from './app-state.js';

// Close the Start menu, unpress the Start button, collapse submenus,
// and play the click sound. Called from every open*() so the behaviour stays
// consistent regardless of how the launcher was triggered.
export function closeStartMenuBoilerplate() {
  if (typeof WindoesApp.startMenu.closeAll === 'function') {
    WindoesApp.startMenu.closeAll();
  } else if (typeof WindoesApp.startMenu.closeSubmenus === 'function') {
    WindoesApp.startMenu.closeSubmenus();
  }
  WindoesApp.sound.playClickSound();
}

// Open a window and apply the standard launch side-effects used by app launchers.
export function openWindowBoilerplate(windowId) {
  WindoesApp.WindowManager.open(windowId);
  closeStartMenuBoilerplate();
}
