// ══════════════════════════════════════════════
// Start Menu & Submenus (generated from JS)
// ══════════════════════════════════════════════

// Create Start Menu DOM and register on shared namespace
const startMenuEl = document.createElement('div');
startMenuEl.className = 'start-menu';
startMenuEl.id = 'startMenu';
startMenuEl.setAttribute('aria-label', 'Start menu');
startMenuEl.innerHTML = `<div class="start-rail"><strong>Windoes XD</strong></div>
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
startMenuEl.style.display = 'none';
document.body.appendChild(startMenuEl);
WindoesApp.dom.startMenu = startMenuEl;

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
    <div class="submenu-item" id="subAsciiRunner"><span class="submenu-icon submenu-icon-ascii-runner"></span>ASCII Runner</div>
    <div class="submenu-item" id="subSkifree"><span class="submenu-icon submenu-icon-skifree"></span>SkiFree</div>`;
document.body.appendChild(programsSubmenu);

// Start button toggle
WindoesApp.dom.startButton.addEventListener('click', (e) => {
    e.stopPropagation();
    startMenuEl.classList.toggle('open');
    WindoesApp.dom.startButton.classList.toggle('pressed', startMenuEl.classList.contains('open'));
    if (!startMenuEl.classList.contains('open')) {
        closeProgramsSubmenu();
    }
    WindoesApp.sound.playClickSound();
});

document.addEventListener('click', (e) => {
    if (!WindoesApp.dom.startButton.contains(e.target) && !startMenuEl.contains(e.target) && !programsSubmenu.contains(e.target)) {
        startMenuEl.classList.remove('open');
        WindoesApp.dom.startButton.classList.remove('pressed');
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

// Register on shared namespace
WindoesApp.menu.closeProgramsSubmenu = closeProgramsSubmenu;

// Close submenu when leaving the Programs area
startMenuEl.addEventListener('mouseleave', (e) => {
    if (!programsSubmenu.contains(e.relatedTarget)) {
        closeProgramsSubmenu();
    }
});

programsSubmenu.addEventListener('mouseleave', (e) => {
    if (!startMenuEl.contains(e.relatedTarget)) {
        closeProgramsSubmenu();
    }
});

// Submenu items
document.getElementById('subIE').addEventListener('click', () => {
    WindoesApp.open.internetExplorer();
    closeProgramsSubmenu();
});

document.getElementById('subNotepad').addEventListener('click', () => {
    WindoesApp.open.notepad();
    closeProgramsSubmenu();
});

document.getElementById('subAsciiRunner').addEventListener('click', () => {
    WindoesApp.open.app('ASCII Runner', './applications/ascii-runner/index.html');
    closeProgramsSubmenu();
});

document.getElementById('subWinamp').addEventListener('click', () => {
    WindoesApp.open.winamp();
    closeProgramsSubmenu();
});

document.getElementById('subMinesweeper').addEventListener('click', () => {
    WindoesApp.open.minesweeper();
    closeProgramsSubmenu();
});

document.getElementById('subSkifree').addEventListener('click', () => {
    WindoesApp.open.skifree();
    closeProgramsSubmenu();
});

document.getElementById('subAccessories').addEventListener('click', () => {
    WindoesApp.open.notepad();
});

document.getElementById('subGames').addEventListener('click', () => {
    WindoesApp.bsod.showErrorDialog({ title: 'Games', text: 'Solitaire has encountered an error and needs to close.\n\nWould you like to send an error report?', icon: 'error' });
    closeProgramsSubmenu();
    startMenuEl.classList.remove('open');
    WindoesApp.dom.startButton.classList.remove('pressed');
});

// Help menu item
document.getElementById('menuHelp').addEventListener('click', () => {
    WindoesApp.bsod.showErrorDialog({ title: 'Windows Help', text: 'Help is not available for this program.\n\nTry searching online at microsoft.com for help topics.', icon: 'info' });
    startMenuEl.classList.remove('open');
    WindoesApp.dom.startButton.classList.remove('pressed');
});

// ══════════════════════════════════════════════
// Shutdown
// ══════════════════════════════════════════════
document.getElementById('menuShutdown').addEventListener('click', () => {
    startMenuEl.classList.remove('open');
    WindoesApp.dom.startButton.classList.remove('pressed');
    document.body.style.background = '#000';
    WindoesApp.dom.theDesktop.style.display = 'none';
    WindoesApp.dom.theTaskbar.style.display = 'none';
    startMenuEl.style.display = 'none';

    const shutdownMsg = document.createElement('div');
    shutdownMsg.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;color:#FF8000;font-size:24px;font-family:"MS Sans Serif",sans-serif;background:#000;z-index:99998;';
    shutdownMsg.innerHTML = 'It\'s now safe to turn off<br>your computer.';
    shutdownMsg.style.textAlign = 'center';
    document.body.appendChild(shutdownMsg);
});
