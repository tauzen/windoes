// ══════════════════════════════════════════════
// Boot Sequence (state-driven)
// ══════════════════════════════════════════════
import WindoesApp from './app-state.js';
import { BOOT_MEMORY_TARGET_KB, BOOT_SPLASH_MIN_MS } from './constants.js';
import { preloadBootAssets } from './boot-preload.js';

export function runBootSequence() {
  WindoesApp.state.dispatch({ type: 'BOOT_RESET' });

  // Phase 1: BIOS POST
  let memCount = 0;
  const memInterval = setInterval(() => {
    memCount += 32768;
    if (memCount >= BOOT_MEMORY_TARGET_KB) {
      memCount = BOOT_MEMORY_TARGET_KB;
      clearInterval(memInterval);
      WindoesApp.state.dispatch({ type: 'BOOT_BIOS_PROGRESS', value: memCount.toLocaleString() });
      WindoesApp.state.dispatch({
        type: 'BOOT_BIOS_STATUS',
        value: 'Press DEL to enter SETUP, ESC to skip memory test',
      });
      setTimeout(() => {
        WindoesApp.state.dispatch({ type: 'BOOT_BIOS_STATUS', value: 'Starting Windoes XD...' });
        setTimeout(showSplashScreen, 600);
      }, 500);
    } else {
      WindoesApp.state.dispatch({ type: 'BOOT_BIOS_PROGRESS', value: memCount.toLocaleString() });
    }
  }, 80);
}

function showSplashScreen() {
  WindoesApp.state.dispatch({ type: 'BOOT_PHASE_SPLASH' });

  // The splash ends once the real asset preload has settled, but never before
  // BOOT_SPLASH_MIN_MS, so a warm cache does not flash it past.
  const minimumShown = new Promise((resolve) => setTimeout(resolve, BOOT_SPLASH_MIN_MS));
  Promise.all([preloadBootAssets(), minimumShown]).then(finishBoot);
}

function finishBoot() {
  WindoesApp.state.dispatch({ type: 'BOOT_FINISH' });

  // Trigger startup sound after user interaction enables audio
  WindoesApp.sound.playStartupSound();

  // Schedule random events
  WindoesApp.bsod.scheduleRandomBSOD();
  WindoesApp.bsod.scheduleRandomError();
}
