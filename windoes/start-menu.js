// ══════════════════════════════════════════════
// Start Menu & Submenus (generated from JS)
// ══════════════════════════════════════════════

// Create Start Menu DOM
startMenu = document.createElement('div');
startMenu.className = 'start-menu';
startMenu.id = 'startMenu';
startMenu.setAttribute('aria-label', 'Start menu');
startMenu.innerHTML = `<div class="start-rail"><strong>Windoes XD</strong></div>
    <div class="menu-list">
        <div class="menu-item menu-item-arrow" id="menuPrograms"><span class="menu-icon menu-icon-programs"></span>Programs</div>
        <div class="menu-item menu-item-arrow"><span class="menu-icon menu-icon-docs"></span>Documents</div>
        <div class="menu-item menu-item-arrow"><span class="menu-icon menu-icon-settings"></span>Settings</div>
        <div class="menu-item"><span class="menu-icon menu-icon-find"></span>Search</div>
        <div class="menu-item" id="menuHelp"><span class="menu-icon menu-icon-help"></span>Help</div>
        <div class="menu-item" id="menuRun"><span class="menu-icon menu-icon-run"></span>Run...</div>
        <div class="menu-separator"></div>
        <div class="menu-item menu-shutdown" id="menuShutdown"><span class="menu-icon"></span>Shut Down...</div>
    </div>`;
// Hidden during boot — finishBoot() will show it
startMenu.style.display = 'none';
document.body.appendChild(startMenu);

// Create Programs Submenu DOM
const programsSubmenu = document.createElement('div');
programsSubmenu.className = 'programs-submenu';
programsSubmenu.id = 'programsSubmenu';
programsSubmenu.innerHTML = `<div class="submenu-item" id="subAccessories"><span class="submenu-icon submenu-icon-folder"></span>Accessories &nbsp; &nbsp; &#9654;</div>
    <div class="submenu-item" id="subGames"><span class="submenu-icon submenu-icon-folder"></span>Games &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &#9654;</div>
    <div class="submenu-item" id="subStartup"><span class="submenu-icon submenu-icon-folder"></span>StartUp</div>
    <div class="context-menu-sep"></div>
    <div class="submenu-item" id="subIE"><span class="submenu-icon submenu-icon-ie"></span>Internet Explorer</div>
    <div class="submenu-item" id="subNotepad"><span class="submenu-icon submenu-icon-notepad"></span>Notepad</div>
    <div class="submenu-item" id="subWinamp"><span class="submenu-icon submenu-icon-winamp"></span>Winamp</div>
    <div class="submenu-item" id="subMinesweeper"><span class="submenu-icon submenu-icon-minesweeper"></span>Minesweeper</div>
    <div class="submenu-item" id="subAsciiRunner"><span class="submenu-icon submenu-icon-ascii-runner"></span>ASCII Runner</div>`;
document.body.appendChild(programsSubmenu);

// Start button toggle
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
