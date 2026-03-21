// ══════════════════════════════════════════════
// Desktop Icons - open on double-click (or tap)
// ══════════════════════════════════════════════
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const appEventType = isTouchDevice ? 'click' : 'dblclick';

if (isTouchDevice) {
    internetExplorerIcon.addEventListener('click', openInternetExplorer);
} else {
    internetExplorerIcon.addEventListener('dblclick', openInternetExplorer);
}

document.getElementById('iconMyComputer').addEventListener(appEventType, openMyComputer);
document.getElementById('iconRecycleBin').addEventListener(appEventType, openRecycleBin);
document.getElementById('qlIE').addEventListener('click', openInternetExplorer);

// Experiment app icons
const experimentApps = simulatorConfig.experimentApps || [
    { id: 'iconAsciiRunner', title: 'ASCII Runner', url: './applications/ascii-runner/index.html' },
];

experimentApps.forEach(({ id, title, url }) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(appEventType, () => openApp(title, url));
});

// Dedicated icon handlers for Winamp and Minesweeper.
// These icons have their own windows and must never go through openApp(),
// so register them after the experimentApps loop and guard against duplicates.
const dedicatedIcons = { iconWinamp: openWinamp, iconMinesweeper: openMinesweeper };
Object.entries(dedicatedIcons).forEach(([id, handler]) => {
    const el = document.getElementById(id);
    if (!el) return;
    // Remove any openApp listener that the experimentApps loop may have added
    // (defensive: in case config accidentally includes these ids)
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
    clone.addEventListener(appEventType, handler);
});

// Minimize / close IE
minimizeBtn.addEventListener('click', () => WindowManager.minimize('ie'));
taskButton.addEventListener('click', () => WindowManager.toggleFromTaskbar('ie'));
closeWindowBtn.addEventListener('click', closeInternetExplorer);

// Desktop icon selection
document.querySelectorAll('.icon').forEach(icon => {
    icon.addEventListener('click', (e) => {
        document.querySelectorAll('.icon').forEach(i => i.classList.remove('selected'));
        icon.classList.add('selected');
    });
});

// Click desktop to deselect
document.querySelector('.desktop').addEventListener('click', (e) => {
    if (e.target === e.currentTarget || e.target.classList.contains('desktop-icons')) {
        document.querySelectorAll('.icon').forEach(i => i.classList.remove('selected'));
    }
});
