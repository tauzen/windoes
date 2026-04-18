// ══════════════════════════════════════════════
// Desktop Icons — generated from config, open on double-click (or tap)
// ══════════════════════════════════════════════
import WindoesApp from './app-state.js';
import { renderInto } from './react-view.js';

const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const appEventType = isTouchDevice ? 'click' : 'dblclick';
const listenerCleanups = [];

function addManagedListener(element, eventName, handler, options) {
  if (!element) return;
  element.addEventListener(eventName, handler, options);
  listenerCleanups.push(() => {
    element.removeEventListener(eventName, handler, options);
  });
}

// Build desktop icons
const desktopIconDefs = [
  { id: 'iconMyComputer', className: 'icon-my-computer', label: 'My Computer' },
  { id: 'internetExplorerIcon', className: 'icon-ie', label: 'Internet Explorer' },
  { id: 'iconRecycleBin', className: 'icon-recycle', label: 'Recycle Bin' },
  { id: 'iconAsciiRunner', className: 'icon-ascii-runner', label: 'ASCII Runner' },
  { id: 'iconWinamp', className: 'icon-winamp', label: 'Winamp' },
  { id: 'iconMinesweeper', className: 'icon-minesweeper', label: 'Minesweeper' },
  { id: 'iconSolitaire', className: 'icon-solitaire', label: 'Solitaire' },
];

const desktopIcons = document.getElementById('desktopIcons');
renderInto(
  desktopIcons,
  <>
    {desktopIconDefs.map((def) => (
      <div key={def.id} className={'icon ' + def.className} id={def.id}>
        <div className="icon-graphic"></div>
        <span className="icon-label">{def.label}</span>
      </div>
    ))}
  </>
);

// Dedicated icon handlers (these must use their own window, not openApp)
const dedicatedHandlers = {
  iconMyComputer: WindoesApp.open.myComputer,
  internetExplorerIcon: WindoesApp.open.internetExplorer,
  iconRecycleBin: WindoesApp.open.recycleBin,
  iconWinamp: WindoesApp.open.winamp,
  iconMinesweeper: WindoesApp.open.minesweeper,
  iconSolitaire: WindoesApp.open.solitaire,
};

// Wire up dedicated icon handlers
Object.entries(dedicatedHandlers).forEach(([id, handler]) => {
  const el = document.getElementById(id);
  if (!el) return;
  addManagedListener(el, appEventType, handler);
});

const quickLaunchIe = document.getElementById('qlIE');
addManagedListener(quickLaunchIe, 'click', WindoesApp.open.internetExplorer);

// Experiment app icons — only wire openApp for non-dedicated icons
const experimentApps = WindoesApp.config.experimentApps || [
  { id: 'iconAsciiRunner', title: 'ASCII Runner', url: './applications/ascii-runner/index.html' },
];

experimentApps.forEach(({ id, title, url }) => {
  // Skip icons that have dedicated handlers (prevents duplicate windows)
  if (dedicatedHandlers[id]) return;
  const el = document.getElementById(id);
  if (el) {
    addManagedListener(el, appEventType, () => WindoesApp.open.app(title, url));
  }
});

// Desktop icon selection
const desktopIconsEls = [...document.querySelectorAll('.icon')];
desktopIconsEls.forEach((icon) => {
  const onIconClick = () => {
    desktopIconsEls.forEach((i) => i.classList.remove('selected'));
    icon.classList.add('selected');
  };
  addManagedListener(icon, 'click', onIconClick);
});

// Click desktop to deselect
const desktopSurface = document.querySelector('.desktop');
const onDesktopClick = (e) => {
  if (e.target === e.currentTarget || e.target.classList.contains('desktop-icons')) {
    desktopIconsEls.forEach((i) => i.classList.remove('selected'));
  }
};
addManagedListener(desktopSurface, 'click', onDesktopClick);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    listenerCleanups.forEach((cleanup) => cleanup());
    listenerCleanups.length = 0;
  });
}
