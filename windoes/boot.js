// ══════════════════════════════════════════════
// Boot Sequence (state-driven)
// ══════════════════════════════════════════════
import WindoesApp from './app-state.js';
import { BOOT_MEMORY_TARGET_KB } from './constants.js';
import defaultConfig from './simulator.config.js';

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

  let progress = 0;
  let msgIdx = 0;
  const progressInterval = setInterval(() => {
    progress += Math.random() * 8 + 2;
    if (progress > 100) progress = 100;

    if (progress > (msgIdx + 1) * 14 && msgIdx < bootMessages.length - 1) {
      msgIdx++;
    }

    WindoesApp.state.dispatch({
      type: 'BOOT_SPLASH_PROGRESS',
      progress,
      status: bootMessages[msgIdx],
    });

    if (progress >= 100) {
      clearInterval(progressInterval);
      setTimeout(finishBoot, 400);
    }
  }, 150);
}

function finishBoot() {
  WindoesApp.state.dispatch({ type: 'BOOT_FINISH' });

  // Trigger startup sound after user interaction enables audio
  WindoesApp.sound.playStartupSound();

  // Schedule random events
  WindoesApp.bsod.scheduleRandomBSOD();
  WindoesApp.bsod.scheduleRandomError();
}
