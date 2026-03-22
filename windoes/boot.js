// ══════════════════════════════════════════════
// Boot Sequence
// ══════════════════════════════════════════════

// Shared config — aliased from namespace for backward compat with later modules
var simulatorConfig = WindoesApp.config;

const bootBios = document.getElementById('bootBios');
const bootScreen = document.getElementById('bootScreen');
const bootProgress = document.getElementById('bootProgress');
const bootStatus = document.getElementById('bootStatus');
const biosMemory = document.getElementById('biosMemory');
const biosStatus = document.getElementById('biosStatus');
const theDesktop = document.getElementById('theDesktop');
const theTaskbar = document.getElementById('theTaskbar');

// Shared UI elements used across multiple modules
const startButton = document.getElementById('startButton');
// startMenu is created by start-menu.js — declared as var so it can be assigned later
var startMenu = null;

// Populate shared DOM refs in namespace
WindoesApp.dom.startButton = startButton;
WindoesApp.dom.theDesktop = theDesktop;
WindoesApp.dom.theTaskbar = theTaskbar;

// Hide desktop & taskbar during boot
theDesktop.style.display = 'none';
theTaskbar.style.display = 'none';

let bootDone = false;

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
                biosStatus.textContent = 'Starting Windows Me...';
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

    const bootMessages = simulatorConfig.bootMessages || [
        'Loading Windows...',
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
    theDesktop.style.display = '';
    theTaskbar.style.display = '';
    if (startMenu) startMenu.style.display = '';
    bootDone = true;
    WindoesApp.bootDone = true;

    // Trigger startup sound after user interaction enables audio
    playStartupSound();

    // Schedule random events
    scheduleRandomBSOD();
    scheduleRandomError();
}

// Register on shared namespace
WindoesApp.boot = { runBootSequence };

// Boot is triggered by main.js (the orchestrator entry point)
