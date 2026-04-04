// ══════════════════════════════════════════════
// Boot Sequence
// ══════════════════════════════════════════════
import WindoesApp from './app-state.js';

const bootBios = document.getElementById('bootBios');
const bootScreen = document.getElementById('bootScreen');
const bootProgress = document.getElementById('bootProgress');
const bootStatus = document.getElementById('bootStatus');
const biosMemory = document.getElementById('biosMemory');
const biosStatus = document.getElementById('biosStatus');

// Populate shared DOM refs in namespace
WindoesApp.dom.startButton = document.getElementById('startButton');
WindoesApp.dom.theDesktop = document.getElementById('theDesktop');
WindoesApp.dom.theTaskbar = document.getElementById('theTaskbar');

// Hide desktop & taskbar during boot
WindoesApp.dom.theDesktop.style.display = 'none';
WindoesApp.dom.theTaskbar.style.display = 'none';

function runBootSequence() {
    // Phase 1: BIOS POST
    let memCount = 0;
    const memTarget = 262144; // 256 MB in KB
    const memInterval = setInterval(() => {
        memCount += 32768;
        if (memCount >= memTarget) {
            memCount = memTarget;
            clearInterval(memInterval);
            biosMemory.textContent = memCount.toLocaleString();
            biosStatus.textContent = 'Press DEL to enter SETUP, ESC to skip memory test';
            setTimeout(() => {
                biosStatus.textContent = 'Starting Windoes XD...';
                setTimeout(showSplashScreen, 600);
            }, 500);
        } else {
            biosMemory.textContent = memCount.toLocaleString();
        }
    }, 80);
}

function showSplashScreen() {
    bootBios.classList.add('hidden');
    bootScreen.classList.remove('hidden');

    const bootMessages = WindoesApp.config.bootMessages || [
        'Loading Windoes...',
        'Loading system files...',
        'Initializing device drivers...',
        'Loading Registry...',
        'Preparing network connections...',
        'Loading your personal settings...',
        'Applying computer settings...'
    ];

    let progress = 0;
    let msgIdx = 0;
    const progressInterval = setInterval(() => {
        progress += Math.random() * 8 + 2;
        if (progress > 100) progress = 100;
        bootProgress.style.width = progress + '%';

        if (progress > (msgIdx + 1) * 14 && msgIdx < bootMessages.length - 1) {
            msgIdx++;
            bootStatus.textContent = bootMessages[msgIdx];
        }

        if (progress >= 100) {
            clearInterval(progressInterval);
            setTimeout(finishBoot, 400);
        }
    }, 150);
}

function finishBoot() {
    bootScreen.classList.add('hidden');
    WindoesApp.dom.theDesktop.style.display = '';
    WindoesApp.dom.theTaskbar.style.display = '';
    if (WindoesApp.dom.startMenu) WindoesApp.dom.startMenu.style.display = '';
    WindoesApp.bootDone = true;

    // Trigger startup sound after user interaction enables audio
    WindoesApp.sound.playStartupSound();

    // Schedule random events
    WindoesApp.bsod.scheduleRandomBSOD();
    WindoesApp.bsod.scheduleRandomError();
}

// Register on shared namespace
WindoesApp.boot = { runBootSequence };
