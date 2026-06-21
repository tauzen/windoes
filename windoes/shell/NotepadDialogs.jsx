import { useEffect, useRef } from 'react';
import WindoesApp from '../app-state.js';
import { useOutsideClick } from './outside-click.js';

export default function NotepadDialogs() {
  const fileDropdownRef = useRef(null);
  const notepadState = WindoesApp.state.use((s) => s.notepad || {});

  const isFileMenuOpen = !!notepadState.fileMenuOpen;
  const menuPosition = {
    left: notepadState.fileMenuLeft || 0,
    top: notepadState.fileMenuTop || 0,
  };

  function dispatchNotepadAction(actionType) {
    WindoesApp.events.notepadInteraction.emit({
      type: actionType,
    });
    WindoesApp.state.dispatch({ type: 'NOTEPAD_FILE_MENU_CLOSE' });
  }

  useEffect(() => {
    function onDocumentClick(e) {
      const fileMenuEl = e.target.closest('#notepadFileMenu');
      if (fileMenuEl) {
        e.stopPropagation();
        if (isFileMenuOpen) {
          WindoesApp.state.dispatch({ type: 'NOTEPAD_FILE_MENU_CLOSE' });
        } else {
          const rect = fileMenuEl.getBoundingClientRect();
          WindoesApp.state.dispatch({
            type: 'NOTEPAD_FILE_MENU_OPEN',
            left: rect.left,
            top: rect.bottom,
          });
        }
        return;
      }

      const item = e.target.closest('#notepadFileDropdown .context-menu-item');
      if (item && isFileMenuOpen) {
        const action = item.dataset.action || item.getAttribute('data-action');
        dispatchNotepadAction(action);
        return;
      }
    }

    function onDocumentKeyDown(e) {
      const withinNotepadWindow = !!(
        document.activeElement &&
        document.activeElement.closest &&
        document.activeElement.closest('#notepadWindow')
      );
      if (!withinNotepadWindow) return;

      const lower = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && lower === 's') {
        e.preventDefault();
        dispatchNotepadAction('save-as');
        return;
      }
      if ((e.ctrlKey || e.metaKey) && lower === 's') {
        e.preventDefault();
        dispatchNotepadAction('save');
        return;
      }
      if ((e.ctrlKey || e.metaKey) && lower === 'o') {
        e.preventDefault();
        dispatchNotepadAction('open');
        return;
      }
      if ((e.ctrlKey || e.metaKey) && lower === 'n') {
        e.preventDefault();
        dispatchNotepadAction('new');
        return;
      }
      if (e.key === 'Escape') {
        WindoesApp.state.dispatch({ type: 'NOTEPAD_FILE_MENU_CLOSE' });
      }
    }

    document.addEventListener('click', onDocumentClick);
    document.addEventListener('keydown', onDocumentKeyDown);

    return () => {
      document.removeEventListener('click', onDocumentClick);
      document.removeEventListener('keydown', onDocumentKeyDown);
    };
  }, [isFileMenuOpen]);

  useOutsideClick({
    enabled: isFileMenuOpen,
    getElements: () => [fileDropdownRef.current, document.getElementById('notepadFileMenu')],
    onOutsideClick: () => {
      WindoesApp.state.dispatch({ type: 'NOTEPAD_FILE_MENU_CLOSE' });
    },
  });

  return (
    <div
      ref={fileDropdownRef}
      className={`context-menu notepad-file-menu${isFileMenuOpen ? ' open' : ''}`}
      id="notepadFileDropdown"
      role="menu"
      style={{ left: `${menuPosition.left}px`, top: `${menuPosition.top}px` }}
    >
      <button type="button" role="menuitem" className="context-menu-item" data-action="new">
        New
      </button>
      <button type="button" role="menuitem" className="context-menu-item" data-action="open">
        Open...
      </button>
      <button type="button" role="menuitem" className="context-menu-item" data-action="save">
        Save
      </button>
      <button type="button" role="menuitem" className="context-menu-item" data-action="save-as">
        Save As...
      </button>
      <div className="context-menu-sep"></div>
      <button type="button" role="menuitem" className="context-menu-item" data-action="exit">
        Exit
      </button>
    </div>
  );
}
