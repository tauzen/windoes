// ══════════════════════════════════════════════
// Start Menu & Submenus (generated from JS)
// ══════════════════════════════════════════════
import WindoesApp from './app-state.js';
import { renderInto } from './react-view.js';

// Start menu DOM is rendered by ShellApp
const startMenuEl = document.getElementById('startMenu');
startMenuEl.style.display = 'none';
WindoesApp.dom.startMenu = startMenuEl;

function syncStartMenuVisibility() {
    const bootDone = WindoesApp.state.get().boot.done;
    startMenuEl.style.display = bootDone ? '' : 'none';
}

WindoesApp.state.subscribe(syncStartMenuVisibility);
syncStartMenuVisibility();

const programsSubmenu = document.getElementById('programsSubmenu');
const accessoriesSubmenu = document.getElementById('accessoriesSubmenu');
const gamesSubmenu = document.getElementById('gamesSubmenu');

// Helper to close all menus and depress start button
function closeAllMenus() {
    startMenuEl.classList.remove('open');
    WindoesApp.dom.startButton.classList.remove('pressed');
    closeSubmenus();
}

function closeSubmenus() {
    programsSubmenu.classList.remove('open');
    accessoriesSubmenu.classList.remove('open');
    gamesSubmenu.classList.remove('open');
}

function closeProgramsSubmenu() {
    closeSubmenus();
}

// Register on shared namespace
WindoesApp.menu.closeProgramsSubmenu = closeProgramsSubmenu;

// Start button toggle
WindoesApp.dom.startButton.addEventListener('click', (e) => {
    e.stopPropagation();
    startMenuEl.classList.toggle('open');
    WindoesApp.dom.startButton.classList.toggle('pressed', startMenuEl.classList.contains('open'));
    if (!startMenuEl.classList.contains('open')) {
        closeSubmenus();
    }
    WindoesApp.sound.playClickSound();
});

document.addEventListener('click', (e) => {
    if (!WindoesApp.dom.startButton.contains(e.target) &&
        !startMenuEl.contains(e.target) &&
        !programsSubmenu.contains(e.target) &&
        !accessoriesSubmenu.contains(e.target) &&
        !gamesSubmenu.contains(e.target)) {
        closeAllMenus();
    }
});

// Position a submenu next to its parent, clamped to viewport
function positionSubmenu(submenu, triggerEl, parentSubmenu) {
    const rect = triggerEl.getBoundingClientRect();
    const taskbarHeight = 30;

    // Show temporarily to measure
    submenu.style.visibility = 'hidden';
    submenu.style.display = 'block';

    if (parentSubmenu) {
        const parentRect = parentSubmenu.getBoundingClientRect();
        let left = parentRect.right;
        // If it would go off-screen right, flip to the left
        if (left + submenu.offsetWidth > window.innerWidth) {
            left = parentRect.left - submenu.offsetWidth;
        }
        submenu.style.left = left + 'px';
    }

    // Calculate bottom, ensuring submenu stays within viewport
    let bottom = window.innerHeight - rect.top - rect.height;
    const minBottom = taskbarHeight;
    const maxBottom = window.innerHeight - submenu.offsetHeight;
    bottom = Math.max(minBottom, Math.min(bottom, maxBottom));
    submenu.style.bottom = bottom + 'px';

    submenu.style.visibility = '';
    submenu.style.display = '';
    submenu.classList.add('open');
}

// ── Programs submenu hover ──
const menuPrograms = document.getElementById('menuPrograms');
menuPrograms.addEventListener('mouseenter', () => {
    positionSubmenu(programsSubmenu, menuPrograms, null);
    // Close deeper submenus when re-entering Programs
    accessoriesSubmenu.classList.remove('open');
    gamesSubmenu.classList.remove('open');
});

// Close programs submenu when hovering other main menu items
startMenuEl.querySelectorAll('.menu-item').forEach(item => {
    if (item !== menuPrograms) {
        item.addEventListener('mouseenter', () => { closeSubmenus(); });
    }
});

// ── Accessories submenu hover ──
const subAccessories = document.getElementById('subAccessories');
subAccessories.addEventListener('mouseenter', () => {
    positionSubmenu(accessoriesSubmenu, subAccessories, programsSubmenu);
    gamesSubmenu.classList.remove('open');
});

// Close accessories when hovering other programs submenu items
programsSubmenu.querySelectorAll('.submenu-item').forEach(item => {
    if (item !== subAccessories) {
        item.addEventListener('mouseenter', () => {
            accessoriesSubmenu.classList.remove('open');
            gamesSubmenu.classList.remove('open');
        });
    }
});

// ── Games submenu hover ──
const subAccGames = document.getElementById('subAccGames');
subAccGames.addEventListener('mouseenter', () => {
    positionSubmenu(gamesSubmenu, subAccGames, accessoriesSubmenu);
});

// Close games when hovering other accessories submenu items
accessoriesSubmenu.querySelectorAll('.submenu-item').forEach(item => {
    if (item !== subAccGames) {
        item.addEventListener('mouseenter', () => {
            gamesSubmenu.classList.remove('open');
        });
    }
});

// ── Mouse leave handling for cascading menus ──
startMenuEl.addEventListener('mouseleave', (e) => {
    if (!programsSubmenu.contains(e.relatedTarget)) {
        closeSubmenus();
    }
});

programsSubmenu.addEventListener('mouseleave', (e) => {
    if (!startMenuEl.contains(e.relatedTarget) && !accessoriesSubmenu.contains(e.relatedTarget)) {
        programsSubmenu.classList.remove('open');
        accessoriesSubmenu.classList.remove('open');
        gamesSubmenu.classList.remove('open');
    }
});

accessoriesSubmenu.addEventListener('mouseleave', (e) => {
    if (!programsSubmenu.contains(e.relatedTarget) && !gamesSubmenu.contains(e.relatedTarget)) {
        accessoriesSubmenu.classList.remove('open');
        gamesSubmenu.classList.remove('open');
    }
});

gamesSubmenu.addEventListener('mouseleave', (e) => {
    if (!accessoriesSubmenu.contains(e.relatedTarget)) {
        gamesSubmenu.classList.remove('open');
    }
});

// ── Programs submenu items ──
document.getElementById('subIE').addEventListener('click', () => {
    WindoesApp.open.internetExplorer();
    closeAllMenus();
});

document.getElementById('subExplorer').addEventListener('click', () => {
    WindoesApp.open.myComputer();
    closeAllMenus();
});

document.getElementById('subMSDOS').addEventListener('click', () => {
    WindoesApp.bsod.showErrorDialog({ title: 'MS-DOS Prompt', text: 'This program cannot be run in Windoes mode.', icon: 'error' });
    closeAllMenus();
});

document.getElementById('subOutlook').addEventListener('click', () => {
    WindoesApp.bsod.showErrorDialog({ title: 'Outlook Express', text: 'No Internet mail server is configured.\n\nPlease check your mail settings in Internet Accounts.', icon: 'info' });
    closeAllMenus();
});

// ── Accessories submenu items ──
document.getElementById('subAccNotepad').addEventListener('click', () => {
    WindoesApp.open.notepad();
    closeAllMenus();
});

document.getElementById('subAccPaint').addEventListener('click', () => {
    WindoesApp.bsod.showErrorDialog({ title: 'Paint', text: 'Not enough memory to open Paint.\n\nClose some programs and try again.', icon: 'error' });
    closeAllMenus();
});

document.getElementById('subAccCalculator').addEventListener('click', () => {
    WindoesApp.bsod.showErrorDialog({ title: 'Calculator', text: 'Calculator is not available in this version of Windoes.', icon: 'info' });
    closeAllMenus();
});

document.getElementById('subAccWordPad').addEventListener('click', () => {
    WindoesApp.open.notepad();
    closeAllMenus();
});

// Non-functional accessories items
['subAccImaging'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => {
        WindoesApp.bsod.showErrorDialog({ title: 'Windoes', text: 'This feature is not available in this version of Windoes.', icon: 'info' });
        closeAllMenus();
    });
});

// ── Games submenu items ──
document.getElementById('subGameMinesweeper').addEventListener('click', () => {
    WindoesApp.open.minesweeper();
    closeAllMenus();
});

document.getElementById('subGameSolitaire').addEventListener('click', () => {
    WindoesApp.open.solitaire();
    closeAllMenus();
});

document.getElementById('subGameAsciiRunner').addEventListener('click', () => {
    WindoesApp.open.app('ASCII Runner', './applications/ascii-runner/index.html');
    closeAllMenus();
});

// ── Main menu items ──
document.getElementById('menuWindoesUpdate').addEventListener('click', () => {
    WindoesApp.open.internetExplorer();
    closeAllMenus();
});

document.getElementById('menuHelp').addEventListener('click', () => {
    WindoesApp.bsod.showErrorDialog({ title: 'Windoes Help', text: 'Help is not available for this program.\n\nTry searching online at microsoft.com for help topics.', icon: 'info' });
    closeAllMenus();
});

// ══════════════════════════════════════════════
// Shutdown Dialog (rendered by ShellApp)
// ══════════════════════════════════════════════
const shutdownDialog = document.getElementById('shutdownDialog');

function closeShutdownDialog() {
    shutdownDialog.classList.remove('active');
}

function performShutdown() {
    closeShutdownDialog();
    document.body.style.background = '#000';
    WindoesApp.dom.theDesktop.style.display = 'none';
    WindoesApp.dom.theTaskbar.style.display = 'none';
    startMenuEl.style.display = 'none';

    const shutdownMsg = document.createElement('div');
    shutdownMsg.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;color:#FF8000;font-size:24px;font-family:"MS Sans Serif",sans-serif;background:#000;z-index:99998;';
    shutdownMsg.style.textAlign = 'center';
    renderInto(
        shutdownMsg,
        <>
            <div>It's now safe to turn off</div>
            <div>your computer.</div>
        </>
    );
    document.body.appendChild(shutdownMsg);
}

function performRestart() {
    closeShutdownDialog();
    location.reload();
}

document.getElementById('menuShutdown').addEventListener('click', () => {
    closeAllMenus();
    shutdownDialog.classList.add('active');
    shutdownDialog.querySelector('input[value="shutdown"]').checked = true;
    WindoesApp.sound.playClickSound();
});

document.getElementById('shutdownOkBtn').addEventListener('click', () => {
    const selected = shutdownDialog.querySelector('input[name="shutdownOption"]:checked').value;
    if (selected === 'shutdown') {
        performShutdown();
    } else if (selected === 'restart') {
        performRestart();
    } else if (selected === 'msdos') {
        performRestart();
    }
});

document.getElementById('shutdownCancelBtn').addEventListener('click', closeShutdownDialog);
document.getElementById('shutdownCloseBtn').addEventListener('click', closeShutdownDialog);
document.getElementById('shutdownHelpBtn').addEventListener('click', () => {
    WindoesApp.bsod.showErrorDialog({ title: 'Windoes Help', text: 'Help is not available for Shut Down.\n\nFor more information, click Start, and then click Help.', icon: 'info' });
});
