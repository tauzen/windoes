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
  { id: 'iconMinecraft', className: 'icon-minecraft', label: 'Minecraft' },
  { id: 'iconPaint', className: 'icon-paint', label: 'Paint' },
  { id: 'iconVirtualBoks', className: 'icon-virtualboks', label: 'VirtualBoks' },
];

const dedicatedHandlers = {
  iconMyComputer: () => WindoesApp.open.myComputer?.(),
  internetExplorerIcon: () => WindoesApp.open.internetExplorer?.(),
  iconRecycleBin: () => WindoesApp.open.recycleBin?.(),
  iconWinamp: () => WindoesApp.open.winamp?.(),
  iconMinesweeper: () => WindoesApp.open.minesweeper?.(),
  iconSolitaire: () => WindoesApp.open.solitaire?.(),
  iconMinecraft: () => WindoesApp.open.minecraft?.(),
  iconPaint: () => WindoesApp.open.paint?.(),
  iconVirtualBoks: () => WindoesApp.open.virtualboks?.(),
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

    const storageKey = 'windoes.desktopIconPositions';
    let positions = {};
    try {
      positions = JSON.parse(localStorage.getItem(storageKey) || '{}') || {};
    } catch {
      // Unavailable or invalid storage must not prevent desktop use.
    }
    let drag = null;
    let suppressClick = false;

    function placeIcon(icon, occupied = []) {
      const bounds = iconsEl.getBoundingClientRect();
      const current = icon.getBoundingClientRect();
      const previousX = Number(icon.dataset.translateX || 0);
      const previousY = Number(icon.dataset.translateY || 0);
      const baseX = current.left - bounds.left - previousX;
      const baseY = current.top - bounds.top - previousY;
      const saved = positions[icon.id];
      const wantedX = Number.isFinite(saved?.x) ? saved.x : baseX;
      const wantedY = Number.isFinite(saved?.y) ? saved.y : baseY;
      let x = Math.max(0, Math.min(wantedX, bounds.width - current.width));
      let y = Math.max(0, Math.min(wantedY, bounds.height - current.height));
      const overlaps = (left, top) =>
        occupied.some(
          (rect) =>
            left < rect.x + current.width &&
            left + current.width > rect.x &&
            top < rect.y + current.height &&
            top + current.height > rect.y
        );
      if (current.width && current.height && overlaps(x, y)) {
        let found = false;
        for (let left = 0; left + current.width <= bounds.width && !found; left += current.width) {
          for (let top = 0; top + current.height <= bounds.height; top += current.height) {
            if (!overlaps(left, top)) {
              x = left;
              y = top;
              found = true;
              break;
            }
          }
        }
      }
      const dx = x - baseX;
      const dy = y - baseY;
      icon.dataset.translateX = dx;
      icon.dataset.translateY = dy;
      icon.style.transform = `translate(${dx}px, ${dy}px)`;
      occupied.push({ x, y });
    }

    function placeIcons() {
      const occupied = [];
      iconsEl.querySelectorAll('.icon').forEach((icon) => placeIcon(icon, occupied));
    }

    function onPointerDown(event) {
      const icon = event.target.closest('.icon');
      if (!icon || !iconsEl.contains(icon) || !event.isPrimary || event.button !== 0) return;
      suppressClick = false;
      const bounds = iconsEl.getBoundingClientRect();
      const rect = icon.getBoundingClientRect();
      drag = {
        icon,
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        x: rect.left - bounds.left,
        y: rect.top - bounds.top,
        moved: false,
      };
      icon.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event) {
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (!drag.moved && Math.hypot(dx, dy) < 5) return;
      drag.moved = true;
      positions[drag.icon.id] = { x: drag.x + dx, y: drag.y + dy };
      placeIcon(drag.icon);
    }

    function onPointerEnd(event) {
      if (!drag || drag.id !== event.pointerId) return;
      if (drag.moved) {
        const bounds = iconsEl.getBoundingClientRect();
        const rect = drag.icon.getBoundingClientRect();
        positions[drag.icon.id] = { x: rect.left - bounds.left, y: rect.top - bounds.top };
        try {
          localStorage.setItem(storageKey, JSON.stringify(positions));
        } catch {
          // Moving icons still works when storage is unavailable.
        }
        suppressClick = true;
        placeIcons();
      }
      drag = null;
    }

    function preventDragClick(event) {
      if (!suppressClick) return;
      suppressClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    const resizeObserver = new ResizeObserver(placeIcons);
    resizeObserver.observe(iconsEl);
    iconsEl.addEventListener('pointerdown', onPointerDown);
    iconsEl.addEventListener('pointermove', onPointerMove);
    iconsEl.addEventListener('pointerup', onPointerEnd);
    iconsEl.addEventListener('pointercancel', onPointerEnd);
    iconsEl.addEventListener('click', preventDragClick, true);
    placeIcons();

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
      resizeObserver.disconnect();
      iconsEl.removeEventListener('pointerdown', onPointerDown);
      iconsEl.removeEventListener('pointermove', onPointerMove);
      iconsEl.removeEventListener('pointerup', onPointerEnd);
      iconsEl.removeEventListener('pointercancel', onPointerEnd);
      iconsEl.removeEventListener('click', preventDragClick, true);
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
