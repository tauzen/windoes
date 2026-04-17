// Shared helpers for window launchers (open*).
import WindoesApp from './app-state.js';

// Close the Start menu, unpress the Start button, collapse submenus,
// and play the click sound. Called from every open*() so the behaviour stays
// consistent regardless of how the launcher was triggered.
export function closeStartMenuBoilerplate() {
    if (WindoesApp.dom.startMenu) WindoesApp.dom.startMenu.classList.remove('open');
    if (WindoesApp.dom.startButton) WindoesApp.dom.startButton.classList.remove('pressed');
    if (WindoesApp.startMenu.closeSubmenus) WindoesApp.startMenu.closeSubmenus();
    WindoesApp.sound.playClickSound();
}
