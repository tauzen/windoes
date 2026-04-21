import { useEffect, useRef } from 'react';
import WindoesApp from '../app-state.js';

const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const appEventType = isTouchDevice ? 'click' : 'dblclick';

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
  iconMyComputer: () => WindoesApp.open.myComputer?.(),
  internetExplorerIcon: () => WindoesApp.open.internetExplorer?.(),
  iconRecycleBin: () => WindoesApp.open.recycleBin?.(),
  iconWinamp: () => WindoesApp.open.winamp?.(),
  iconMinesweeper: () => WindoesApp.open.minesweeper?.(),
  iconSolitaire: () => WindoesApp.open.solitaire?.(),
};

const experimentApps = WindoesApp.config.experimentApps || [
  { id: 'iconAsciiRunner', title: 'ASCII Runner', url: './applications/ascii-runner/index.html' },
];

export default function Desktop({ desktopRef }) {
  const bootDone = WindoesApp.state.use((s) => s.boot.done);
  const iconsRef = useRef(null);

  useEffect(() => {
    const iconsEl = iconsRef.current;
    const desktopEl = desktopRef?.current;
    if (!iconsEl || !desktopEl) return undefined;

    const experimentAppsById = new Map(experimentApps.map((app) => [app.id, app]));

    function clearDesktopSelection() {
      iconsEl.querySelectorAll('.icon.selected').forEach((icon) => {
        icon.classList.remove('selected');
      });
    }

    function onDesktopIconClick(event) {
      const icon = event.target.closest('.icon');
      if (!icon || !iconsEl.contains(icon)) return;
      clearDesktopSelection();
      icon.classList.add('selected');
    }

    function onDesktopIconActivate(event) {
      const icon = event.target.closest('.icon');
      if (!icon || !iconsEl.contains(icon)) return;

      const dedicatedHandler = dedicatedHandlers[icon.id];
      if (dedicatedHandler) {
        dedicatedHandler();
        return;
      }

      const appDef = experimentAppsById.get(icon.id);
      if (appDef) {
        WindoesApp.open.app(appDef.title, appDef.url);
      }
    }

    function onDesktopClick(event) {
      if (event.target === desktopEl || event.target.classList.contains('desktop-icons')) {
        clearDesktopSelection();
      }
    }

    iconsEl.addEventListener('click', onDesktopIconClick);
    iconsEl.addEventListener(appEventType, onDesktopIconActivate);
    desktopEl.addEventListener('click', onDesktopClick);

    return () => {
      iconsEl.removeEventListener('click', onDesktopIconClick);
      iconsEl.removeEventListener(appEventType, onDesktopIconActivate);
      desktopEl.removeEventListener('click', onDesktopClick);
    };
  }, [desktopRef]);

  return (
    <div
      ref={desktopRef}
      className="desktop"
      id="theDesktop"
      style={{ display: bootDone ? '' : 'none' }}
      onContextMenu={(e) => WindoesApp.desktopContext?.openContextMenu?.(e)}
      onClick={() => WindoesApp.desktopContext?.closeContextMenu?.()}
    >
      <div className="desktop-icons" id="desktopIcons" ref={iconsRef}>
        {desktopIconDefs.map((def) => (
          <div key={def.id} className={'icon ' + def.className} id={def.id}>
            <div className="icon-graphic" aria-hidden={true}></div>
            <span className="icon-label">{def.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
