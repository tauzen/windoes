// ══════════════════════════════════════════════
// App Window (experiment apps)
// ══════════════════════════════════════════════
const appWindow = document.getElementById('appWindow');
const appFrame = document.getElementById('appFrame');
const appWindowTitle = document.getElementById('appWindowTitle');
const appStatusText = document.getElementById('appStatusText');
const appMinimizeBtn = document.getElementById('appMinimizeBtn');
const appCloseBtn = document.getElementById('appCloseBtn');
const appTaskButton = document.getElementById('appTaskButton');
const appTaskLabel = document.getElementById('appTaskLabel');

// App window: iframe src is dynamic, managed manually in openApp
WindowManager.register('app', {
    el: appWindow,
    taskBtn: appTaskButton,
    iframe: appFrame,
    iframeSrc: null,  // set dynamically per openApp call
    hasChrome: true,
});

function openApp(title, url) {
    appWindowTitle.textContent = title;
    appStatusText.textContent = 'Opening...';
    appTaskLabel.textContent = title.length > 22 ? title.substring(0, 20) + '...' : title;
    // Set dynamic iframe src before opening
    WindowManager.get('app').iframeSrc = url;
    appFrame.src = url;
    WindowManager.open('app');
    startMenu.classList.remove('open');
    startButton.classList.remove('pressed');
    closeProgramsSubmenu();
    body_loading(true);
    playClickSound();
}

function closeApp() {
    WindowManager.close('app');
}

appFrame.addEventListener('load', () => {
    appStatusText.textContent = 'Done';
    body_loading(false);
});

appMinimizeBtn.addEventListener('click', () => WindowManager.minimize('app'));
appCloseBtn.addEventListener('click', closeApp);
appTaskButton.addEventListener('click', () => WindowManager.toggleFromTaskbar('app'));

// ══════════════════════════════════════════════
// Winamp Window
// ══════════════════════════════════════════════
const winampWindow = document.getElementById('winampWindow');
const winampFrame = document.getElementById('winampFrame');
const winampTaskBtn = document.getElementById('winampTaskBtn');

WindowManager.register('winamp', {
    el: winampWindow,
    taskBtn: winampTaskBtn,
    iframe: winampFrame,
    iframeSrc: './applications/winamp-player/index.html',
    hasChrome: false,
});

function openWinamp() {
    WindowManager.open('winamp');
    startMenu.classList.remove('open');
    startButton.classList.remove('pressed');
    closeProgramsSubmenu();
    playClickSound();
}

function closeWinamp() {
    WindowManager.close('winamp');
}

document.getElementById('winampMinBtn').addEventListener('click', () => WindowManager.minimize('winamp'));
document.getElementById('winampCloseBtn').addEventListener('click', closeWinamp);
winampTaskBtn.addEventListener('click', () => WindowManager.toggleFromTaskbar('winamp'));
makeDraggable(document.getElementById('winampTitlebar'), winampWindow);

// ══════════════════════════════════════════════
// Minesweeper Window
// ══════════════════════════════════════════════
const minesweeperWindow = document.getElementById('minesweeperWindow');
const minesweeperFrame = document.getElementById('minesweeperFrame');
const minesweeperTaskBtn = document.getElementById('minesweeperTaskBtn');

WindowManager.register('minesweeper', {
    el: minesweeperWindow,
    taskBtn: minesweeperTaskBtn,
    iframe: minesweeperFrame,
    iframeSrc: './applications/minesweeper/index.html',
    hasChrome: false,
});

function openMinesweeper() {
    WindowManager.open('minesweeper');
    startMenu.classList.remove('open');
    startButton.classList.remove('pressed');
    closeProgramsSubmenu();
    playClickSound();
}

function closeMinesweeper() {
    WindowManager.close('minesweeper');
}

document.getElementById('minesweeperMinBtn').addEventListener('click', () => WindowManager.minimize('minesweeper'));
document.getElementById('minesweeperCloseBtn').addEventListener('click', closeMinesweeper);
minesweeperTaskBtn.addEventListener('click', () => WindowManager.toggleFromTaskbar('minesweeper'));
makeDraggable(document.getElementById('minesweeperTitlebar'), minesweeperWindow);

// Listen for minesweeper resize messages
window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'minesweeper-resize') {
        const titlebarHeight = document.getElementById('minesweeperTitlebar').offsetHeight;
        const viewBorder = 4; // 2px inset border on .view
        minesweeperWindow.style.width = (e.data.width + viewBorder) + 'px';
        minesweeperWindow.style.height = (e.data.height + titlebarHeight + viewBorder) + 'px';
    }
});
