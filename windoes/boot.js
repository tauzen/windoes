// ══════════════════════════════════════════════
// Boot Sequence (state-driven)
// ══════════════════════════════════════════════
import WindoesApp from './app-state.js';
import { BOOT_MEMORY_TARGET_KB } from './constants.js';
import defaultConfig from './simulator.config.js';
import { preloadBootAssets } from './boot-preload.js';

export function runBootSequence() {
  const bootMessages = WindoesApp.config.bootMessages || defaultConfig.bootMessages;

  WindoesApp.state.dispatch({ type: 'BOOT_RESET', splashStatus: bootMessages[0] });

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
        setTimeout(() => showSplashScreen(bootMessages), 600);
      }, 500);
    } else {
      WindoesApp.state.dispatch({ type: 'BOOT_BIOS_PROGRESS', value: memCount.toLocaleString() });
    }
  }, 80);
}

function showSplashScreen(bootMessages) {
  WindoesApp.state.dispatch({ type: 'BOOT_PHASE_SPLASH', status: bootMessages[0] });

  // `target` tracks how far the real asset preload has progressed (0-100);
  // `displayed` eases toward it so the bar always animates smoothly, even when
  // every asset is already cached and the preload finishes near-instantly.
  let target = 0;
  let displayed = 0;
  let preloadDone = false;

  preloadBootAssets({
    onProgress: (loaded, total) => {
      target = total === 0 ? 100 : (loaded / total) * 100;
    },
  }).finally(() => {
    target = 100;
    preloadDone = true;
  });

  const progressInterval = setInterval(() => {
    // Move at least 1% per tick, and a quarter of the remaining gap, so the bar
    // keeps pace with fast loads without ever jumping past real progress.
    if (displayed < target) {
      displayed = Math.min(target, displayed + Math.max(1, (target - displayed) * 0.25));
    }

    const msgIdx = Math.min(
      bootMessages.length - 1,
      Math.floor((displayed / 100) * bootMessages.length)
    );

    WindoesApp.state.dispatch({
      type: 'BOOT_SPLASH_PROGRESS',
      progress: displayed,
      status: bootMessages[msgIdx],
    });

    if (preloadDone && displayed >= 100) {
      clearInterval(progressInterval);
      setTimeout(finishBoot, 400);
    }
  }, 100);
}

function finishBoot() {
  WindoesApp.state.dispatch({ type: 'BOOT_FINISH' });

  // Trigger startup sound after user interaction enables audio
  WindoesApp.sound.playStartupSound();

  // Schedule random events
  WindoesApp.bsod.scheduleRandomBSOD();
  WindoesApp.bsod.scheduleRandomError();
}
