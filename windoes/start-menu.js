// ══════════════════════════════════════════════
// Start Menu & Submenus
// ══════════════════════════════════════════════
const programsSubmenu = document.getElementById('programsSubmenu');

startButton.addEventListener('click', (e) => {
    e.stopPropagation();
    startMenu.classList.toggle('open');
    startButton.classList.toggle('pressed', startMenu.classList.contains('open'));
    if (!startMenu.classList.contains('open')) {
        closeProgramsSubmenu();
    }
    playClickSound();
});

document.addEventListener('click', (e) => {
    if (!startButton.contains(e.target) && !startMenu.contains(e.target) && !programsSubmenu.contains(e.target)) {
        startMenu.classList.remove('open');
        startButton.classList.remove('pressed');
        closeProgramsSubmenu();
    }
});

// Programs submenu
const menuPrograms = document.getElementById('menuPrograms');
menuPrograms.addEventListener('mouseenter', () => {
    const rect = menuPrograms.getBoundingClientRect();
    programsSubmenu.style.bottom = (window.innerHeight - rect.top - rect.height) + 'px';
    programsSubmenu.classList.add('open');
});

function closeProgramsSubmenu() {
    programsSubmenu.classList.remove('open');
}

// Close submenu when leaving the Programs area
startMenu.addEventListener('mouseleave', (e) => {
    if (!programsSubmenu.contains(e.relatedTarget)) {
        closeProgramsSubmenu();
    }
});

programsSubmenu.addEventListener('mouseleave', (e) => {
    if (!startMenu.contains(e.relatedTarget)) {
        closeProgramsSubmenu();
    }
});

// Submenu items
document.getElementById('subIE').addEventListener('click', () => {
    openInternetExplorer();
    closeProgramsSubmenu();
});

document.getElementById('subNotepad').addEventListener('click', () => {
    openNotepad();
    closeProgramsSubmenu();
});

document.getElementById('subAsciiRunner').addEventListener('click', () => {
    openApp('ASCII Runner', './applications/ascii-runner/index.html');
    closeProgramsSubmenu();
});

document.getElementById('subWinamp').addEventListener('click', () => {
    openWinamp();
    closeProgramsSubmenu();
});

document.getElementById('subMinesweeper').addEventListener('click', () => {
    openMinesweeper();
    closeProgramsSubmenu();
});

document.getElementById('subAccessories').addEventListener('click', () => {
    openNotepad();
});

document.getElementById('subGames').addEventListener('click', () => {
    showErrorDialog({ title: 'Games', text: 'Solitaire has encountered an error and needs to close.\n\nWould you like to send an error report?', icon: 'error' });
    closeProgramsSubmenu();
    startMenu.classList.remove('open');
    startButton.classList.remove('pressed');
});

// Help menu item
document.getElementById('menuHelp').addEventListener('click', () => {
    showErrorDialog({ title: 'Windows Help', text: 'Help is not available for this program.\n\nTry searching online at microsoft.com for help topics.', icon: 'info' });
    startMenu.classList.remove('open');
    startButton.classList.remove('pressed');
});

// ══════════════════════════════════════════════
// Shutdown
// ══════════════════════════════════════════════
document.getElementById('menuShutdown').addEventListener('click', () => {
    startMenu.classList.remove('open');
    startButton.classList.remove('pressed');
    document.body.style.background = '#000';
    theDesktop.style.display = 'none';
    theTaskbar.style.display = 'none';
    startMenu.style.display = 'none';

    const shutdownMsg = document.createElement('div');
    shutdownMsg.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;color:#FF8000;font-size:24px;font-family:"MS Sans Serif",sans-serif;background:#000;z-index:99998;';
    shutdownMsg.innerHTML = 'It\'s now safe to turn off<br>your computer.';
    shutdownMsg.style.textAlign = 'center';
    document.body.appendChild(shutdownMsg);
});
