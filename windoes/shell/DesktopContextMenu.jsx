import { useEffect, useState } from 'react';
import WindoesApp from '../app-state.js';

export default function DesktopContextMenu() {
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [clockTooltip, setClockTooltip] = useState({ open: false, text: '', x: 0, y: 0 });

  function closeContextMenu() {
    setIsContextMenuOpen(false);
  }

  function openContextMenu(e) {
    if (e.target.closest('.window') || e.target.closest('.icon')) return;
    e.preventDefault();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setIsContextMenuOpen(true);
  }

  function onMenuAction(action) {
    setIsContextMenuOpen(false);
    if (action === 'refresh') {
      WindoesApp.ui.setBodyLoading?.(true);
    } else if (action === 'properties') {
      WindoesApp.bsod.showErrorDialog({
        title: 'Display Properties',
        text: 'Windoes XD\nMillennium Edition\n\nVersion 4.90.3000\n\nCopyright © Microsoft Corp. 1981-2000\n\nRegistered to: User\nProduct ID: 55274-OEM-0011903-00102',
        icon: 'info',
      });
    } else if (action === 'new') {
      WindoesApp.open.notepad();
    } else if (action === 'arrange') {
      WindoesApp.sound.playClickSound();
    }
  }

  function onShowDesktopClick() {
    WindoesApp.WindowManager.minimizeAll();
  }

  function onClockEnter(e) {
    const now = new Date();
    setClockTooltip({
      open: true,
      text: now.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      x: e.clientX - 80,
      y: e.clientY - 24,
    });
  }

  function onClockLeave() {
    setClockTooltip((current) => ({ ...current, open: false }));
  }

  function onTrayVolumeClick() {
    WindoesApp.bsod.showErrorDialog({
      title: 'Volume Control',
      text: 'There are no active mixer devices available. To install mixer devices, go to Control Panel, click Printers and Other Hardware, and then click Add Hardware.\n\nThis program will now close.',
      icon: 'error',
    });
  }

  useEffect(() => {
    WindoesApp.desktopContext = {
      openContextMenu,
      closeContextMenu,
      onShowDesktopClick,
      onClockEnter,
      onClockLeave,
      onTrayVolumeClick,
    };

    return () => {
      delete WindoesApp.desktopContext;
    };
  }, []);

  useEffect(() => {
    function onDocumentClick(e) {
      if (!e.target.closest('#contextMenu')) {
        setIsContextMenuOpen(false);
      }
    }

    document.addEventListener('click', onDocumentClick);
    return () => document.removeEventListener('click', onDocumentClick);
  }, []);

  return (
    <>
      <div
        className={`context-menu${isContextMenuOpen ? ' open' : ''}`}
        id="contextMenu"
        role="menu"
        style={{ left: `${menuPosition.x}px`, top: `${menuPosition.y}px` }}
      >
        <button
          type="button"
          role="menuitem"
          className="context-menu-item"
          data-action="arrange"
          onClick={() => onMenuAction('arrange')}
        >
          Arrange Icons
        </button>
        <button type="button" role="menuitem" className="context-menu-item" data-action="lineup">
          Line Up Icons
        </button>
        <div className="context-menu-sep"></div>
        <button
          type="button"
          role="menuitem"
          className="context-menu-item"
          data-action="refresh"
          onClick={() => onMenuAction('refresh')}
        >
          Refresh
        </button>
        <div className="context-menu-sep"></div>
        <button
          type="button"
          role="menuitem"
          className="context-menu-item disabled"
          data-action="paste"
          disabled
        >
          Paste
        </button>
        <button
          type="button"
          role="menuitem"
          className="context-menu-item disabled"
          data-action="paste-shortcut"
          disabled
        >
          Paste Shortcut
        </button>
        <div className="context-menu-sep"></div>
        <button
          type="button"
          role="menuitem"
          className="context-menu-item"
          data-action="new"
          onClick={() => onMenuAction('new')}
        >
          New ▶
        </button>
        <div className="context-menu-sep"></div>
        <button
          type="button"
          role="menuitem"
          className="context-menu-item"
          data-action="properties"
          onClick={() => onMenuAction('properties')}
        >
          Properties
        </button>
      </div>
      <div
        className="clock-tooltip"
        id="clockTooltip"
        style={{
          display: clockTooltip.open ? 'block' : 'none',
          left: `${clockTooltip.x}px`,
          top: `${clockTooltip.y}px`,
        }}
      >
        {clockTooltip.text}
      </div>
    </>
  );
}
