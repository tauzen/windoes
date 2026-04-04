// ══════════════════════════════════════════════
// App Window (experiment apps)
// ══════════════════════════════════════════════
import WindoesApp from './app-state.js';

const appConfig = WindoesApp.WindowManager.register('app', {
    template: {
        id: 'appWindow',
        className: 'app-window',
        ariaLabel: 'Application window',
        title: 'Application',
        titleIcon: 'titlelogo-app',
        titleSpanId: 'appWindowTitle',
        titlebarId: 'appTitlebar',
        minimizeBtnId: 'appMinimizeBtn',
        maximizeBtn: true,
        closeBtnId: 'appCloseBtn',
        style: 'left: clamp(110px, 15vw, 190px); top: 28px;',
        menubar: ['File', 'View', 'Help'],
        view: '<iframe id="appFrame" title="Application content" referrerpolicy="no-referrer" allow="autoplay"></iframe>',
        statusBar: '<span class="status-left" id="appStatusText">Done</span>',
    },
    taskButton: { id: 'appTaskButton', icon: 'task-icon-app', label: 'Application', labelId: 'appTaskLabel' },
    iframeId: 'appFrame',
    iframeSrc: null,  // set dynamically per openApp call
    hasChrome: true,
});

const appFrame = appConfig.el.querySelector('#appFrame');
const appWindowTitle = appConfig.el.querySelector('#appWindowTitle');
const appStatusText = appConfig.el.querySelector('#appStatusText');
const appTaskLabel = appConfig.taskBtn.querySelector('#appTaskLabel');

function openApp(title, url) {
    appWindowTitle.textContent = title;
    appStatusText.textContent = 'Opening...';
    appTaskLabel.textContent = title.length > 22 ? title.substring(0, 20) + '...' : title;
    // Set dynamic iframe src before opening
    WindoesApp.WindowManager.get('app').iframeSrc = url;
    appFrame.src = url;
    WindoesApp.WindowManager.open('app');
    if (WindoesApp.dom.startMenu) WindoesApp.dom.startMenu.classList.remove('open');
    WindoesApp.dom.startButton.classList.remove('pressed');
    if (WindoesApp.menu.closeProgramsSubmenu) WindoesApp.menu.closeProgramsSubmenu();
    WindoesApp.helpers.body_loading(true);
    WindoesApp.sound.playClickSound();
}

function closeApp() {
    WindoesApp.WindowManager.close('app');
}

appFrame.addEventListener('load', () => {
    appStatusText.textContent = 'Done';
    WindoesApp.helpers.body_loading(false);
});

// ══════════════════════════════════════════════
// Winamp Window
// ══════════════════════════════════════════════
const winampConfig = WindoesApp.WindowManager.register('winamp', {
    template: {
        id: 'winampWindow',
        ariaLabel: 'Winamp',
        title: 'Winamp',
        titleIcon: 'titlelogo-winamp',
        titlebarId: 'winampTitlebar',
        minimizeBtnId: 'winampMinBtn',
        closeBtnId: 'winampCloseBtn',
        style: 'left: 200px; top: 50px; width: 289px; height: 330px; min-width: unset; min-height: unset;',
        view: '<iframe id="winampFrame" title="Winamp" referrerpolicy="no-referrer" allow="autoplay"></iframe>',
    },
    taskButton: { id: 'winampTaskBtn', icon: 'task-icon-winamp', label: 'Winamp' },
    iframeId: 'winampFrame',
    iframeSrc: './applications/winamp-player/index.html',
    hasChrome: false,
});

function openWinamp() {
    WindoesApp.WindowManager.open('winamp');
    if (WindoesApp.dom.startMenu) WindoesApp.dom.startMenu.classList.remove('open');
    WindoesApp.dom.startButton.classList.remove('pressed');
    if (WindoesApp.menu.closeProgramsSubmenu) WindoesApp.menu.closeProgramsSubmenu();
    WindoesApp.sound.playClickSound();
}

function closeWinamp() {
    WindoesApp.WindowManager.close('winamp');
}

// ══════════════════════════════════════════════
// Minesweeper Window
// ══════════════════════════════════════════════
const minesweeperConfig = WindoesApp.WindowManager.register('minesweeper', {
    template: {
        id: 'minesweeperWindow',
        ariaLabel: 'Minesweeper',
        title: 'Minesweeper',
        titleIcon: 'titlelogo-minesweeper',
        titlebarId: 'minesweeperTitlebar',
        minimizeBtnId: 'minesweeperMinBtn',
        closeBtnId: 'minesweeperCloseBtn',
        style: 'left: 250px; top: 80px; width: 260px; height: 280px; min-width: unset; min-height: unset;',
        view: '<iframe id="minesweeperFrame" title="Minesweeper" referrerpolicy="no-referrer"></iframe>',
    },
    taskButton: { id: 'minesweeperTaskBtn', icon: 'task-icon-minesweeper', label: 'Minesweeper' },
    iframeId: 'minesweeperFrame',
    iframeSrc: './applications/minesweeper/index.html',
    hasChrome: false,
});

function openMinesweeper() {
    WindoesApp.WindowManager.open('minesweeper');
    if (WindoesApp.dom.startMenu) WindoesApp.dom.startMenu.classList.remove('open');
    WindoesApp.dom.startButton.classList.remove('pressed');
    if (WindoesApp.menu.closeProgramsSubmenu) WindoesApp.menu.closeProgramsSubmenu();
    WindoesApp.sound.playClickSound();
}

function closeMinesweeper() {
    WindoesApp.WindowManager.close('minesweeper');
}

// ══════════════════════════════════════════════
// Solitaire Window
// ══════════════════════════════════════════════
const solitaireConfig = WindoesApp.WindowManager.register('solitaire', {
    template: {
        id: 'solitaireWindow',
        ariaLabel: 'Solitaire',
        title: 'Solitaire',
        titleIcon: 'titlelogo-solitaire',
        titlebarId: 'solitaireTitlebar',
        minimizeBtnId: 'solitaireMinBtn',
        closeBtnId: 'solitaireCloseBtn',
        style: 'left: 180px; top: 40px; width: 700px; height: 540px; min-width: unset; min-height: unset;',
        view: '<iframe id="solitaireFrame" title="Solitaire" referrerpolicy="no-referrer"></iframe>',
    },
    taskButton: { id: 'solitaireTaskBtn', icon: 'task-icon-solitaire', label: 'Solitaire' },
    iframeId: 'solitaireFrame',
    iframeSrc: './applications/solitaire/index.html',
    hasChrome: false,
});

function openSolitaire() {
    WindoesApp.WindowManager.open('solitaire');
    if (WindoesApp.dom.startMenu) WindoesApp.dom.startMenu.classList.remove('open');
    WindoesApp.dom.startButton.classList.remove('pressed');
    if (WindoesApp.menu.closeProgramsSubmenu) WindoesApp.menu.closeProgramsSubmenu();
    WindoesApp.sound.playClickSound();
}

function closeSolitaire() {
    WindoesApp.WindowManager.close('solitaire');
}

// Register on shared namespace
WindoesApp.open.app = openApp;
WindoesApp.open.winamp = openWinamp;
WindoesApp.open.minesweeper = openMinesweeper;
WindoesApp.open.solitaire = openSolitaire;

// Listen for app resize messages
window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'minesweeper-resize') {
        const minesweeperWindow = minesweeperConfig.el;
        const titlebarHeight = minesweeperConfig.el.querySelector('.titlebar').offsetHeight;
        const viewBorder = 4; // 2px inset border on .view
        minesweeperWindow.style.width = (e.data.width + viewBorder) + 'px';
        minesweeperWindow.style.height = (e.data.height + titlebarHeight + viewBorder) + 'px';
    }
    if (e.data && e.data.type === 'solitaire-resize') {
        const solitaireWindow = solitaireConfig.el;
        const titlebarHeight = solitaireConfig.el.querySelector('.titlebar').offsetHeight;
        const viewBorder = 4;
        solitaireWindow.style.width = (e.data.width + viewBorder) + 'px';
        solitaireWindow.style.height = (e.data.height + titlebarHeight + viewBorder) + 'px';
    }
});
