// ══════════════════════════════════════════════
// Desktop Icons — generated from config, open on double-click (or tap)
// ══════════════════════════════════════════════
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const appEventType = isTouchDevice ? 'click' : 'dblclick';

// Build desktop icons
const desktopIconDefs = [
    { id: 'iconMyComputer', className: 'icon-my-computer', label: 'My Computer' },
    { id: 'internetExplorerIcon', className: 'icon-ie', label: 'Internet Explorer' },
    { id: 'iconRecycleBin', className: 'icon-recycle', label: 'Recycle Bin' },
    { id: 'iconAsciiRunner', className: 'icon-ascii-runner', label: 'ASCII Runner' },
    { id: 'iconWinamp', className: 'icon-winamp', label: 'Winamp' },
    { id: 'iconMinesweeper', className: 'icon-minesweeper', label: 'Minesweeper' },
    { id: 'iconSkifree', className: 'icon-skifree', label: 'SkiFree' },
    { id: 'iconSolitaire', className: 'icon-solitaire', label: 'Solitaire' },
];

const desktopIcons = document.getElementById('desktopIcons');
desktopIconDefs.forEach(def => {
    const el = document.createElement('div');
    el.className = 'icon ' + def.className;
    el.id = def.id;
    el.innerHTML = '<div class="icon-graphic"></div><span class="icon-label">' + def.label + '</span>';
    desktopIcons.appendChild(el);
});

// Dedicated icon handlers (these must use their own window, not openApp)
const dedicatedHandlers = {
    iconMyComputer: WindoesApp.open.myComputer,
    internetExplorerIcon: WindoesApp.open.internetExplorer,
    iconRecycleBin: WindoesApp.open.recycleBin,
    iconWinamp: WindoesApp.open.winamp,
    iconMinesweeper: WindoesApp.open.minesweeper,
    iconSkifree: WindoesApp.open.skifree,
    iconSolitaire: WindoesApp.open.solitaire,
};

// Wire up dedicated icon handlers
Object.entries(dedicatedHandlers).forEach(([id, handler]) => {
    const el = document.getElementById(id);
    if (!el) return;
    // IE uses click on touch devices, dblclick on desktop (same as appEventType)
    el.addEventListener(appEventType, handler);
});

// Quick launch IE
document.getElementById('qlIE').addEventListener('click', WindoesApp.open.internetExplorer);

// Experiment app icons — only wire openApp for non-dedicated icons
const experimentApps = WindoesApp.config.experimentApps || [
    { id: 'iconAsciiRunner', title: 'ASCII Runner', url: './applications/ascii-runner/index.html' },
];

experimentApps.forEach(({ id, title, url }) => {
    // Skip icons that have dedicated handlers (prevents duplicate windows)
    if (dedicatedHandlers[id]) return;
    const el = document.getElementById(id);
    if (el) el.addEventListener(appEventType, () => WindoesApp.open.app(title, url));
});

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
