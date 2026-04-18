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

const desktopIconDefs = [
  { id: 'iconMyComputer', className: 'icon-my-computer', label: 'My Computer' },
  { id: 'internetExplorerIcon', className: 'icon-ie', label: 'Internet Explorer' },
  { id: 'iconRecycleBin', className: 'icon-recycle', label: 'Recycle Bin' },
  { id: 'iconAsciiRunner', className: 'icon-ascii-runner', label: 'ASCII Runner' },
  { id: 'iconWinamp', className: 'icon-winamp', label: 'Winamp' },
  { id: 'iconMinesweeper', className: 'icon-minesweeper', label: 'Minesweeper' },
  { id: 'iconSolitaire', className: 'icon-solitaire', label: 'Solitaire' },
];

const dedicatedHandlers = {
  iconMyComputer: WindoesApp.open.myComputer,
  internetExplorerIcon: WindoesApp.open.internetExplorer,
  iconRecycleBin: WindoesApp.open.recycleBin,
  iconWinamp: WindoesApp.open.winamp,
  iconMinesweeper: WindoesApp.open.minesweeper,
  iconSolitaire: WindoesApp.open.solitaire,
};

const experimentApps = WindoesApp.config.experimentApps || [
  { id: 'iconAsciiRunner', title: 'ASCII Runner', url: './applications/ascii-runner/index.html' },
];
const experimentAppsById = new Map(experimentApps.map((app) => [app.id, app]));

function getDesktopIconsContainer() {
  return document.getElementById('desktopIcons');
}

function clearDesktopSelection() {
  const desktopIcons = getDesktopIconsContainer();
  if (!desktopIcons) return;
  desktopIcons.querySelectorAll('.icon.selected').forEach((icon) => {
    icon.classList.remove('selected');
  });
}

function renderDesktopIcons() {
  const desktopIcons = getDesktopIconsContainer();
  if (!desktopIcons) return;

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
}

function wireDesktopInteractions() {
  const desktopIcons = getDesktopIconsContainer();

  const onDesktopIconClick = (event) => {
    const icon = event.target.closest('.icon');
    if (!icon || !desktopIcons?.contains(icon)) return;

    clearDesktopSelection();
    icon.classList.add('selected');
  };
  addManagedListener(desktopIcons, 'click', onDesktopIconClick);

  const onDesktopIconActivate = (event) => {
    const icon = event.target.closest('.icon');
    if (!icon || !desktopIcons?.contains(icon)) return;

    const dedicatedHandler = dedicatedHandlers[icon.id];
    if (dedicatedHandler) {
      dedicatedHandler();
      return;
    }

    const appDef = experimentAppsById.get(icon.id);
    if (appDef) {
      WindoesApp.open.app(appDef.title, appDef.url);
    }
  };
  addManagedListener(desktopIcons, appEventType, onDesktopIconActivate);

  const quickLaunchIe = document.getElementById('qlIE');
  addManagedListener(quickLaunchIe, 'click', WindoesApp.open.internetExplorer);

  const desktopSurface = document.querySelector('.desktop');
  const onDesktopClick = (e) => {
    if (e.target === e.currentTarget || e.target.classList.contains('desktop-icons')) {
      clearDesktopSelection();
    }
  };
  addManagedListener(desktopSurface, 'click', onDesktopClick);
}

function setupDesktop() {
  renderDesktopIcons();
  wireDesktopInteractions();
}

setupDesktop();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    listenerCleanups.forEach((cleanup) => cleanup());
    listenerCleanups.length = 0;
  });
}
