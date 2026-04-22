import { useEffect, useRef } from 'react';
import WindoesApp from '../app-state.js';
import { useDialogFocus } from './dialog-focus.js';

export default function NotepadDialogs() {
  const savePathInputRef = useRef(null);
  const saveDialogRef = useRef(null);
  const resolverRef = useRef(null);
  const notepadState = WindoesApp.state.use((s) => s.notepad || {});

  const isSaveDialogOpen = !!notepadState.saveDialogOpen;
  const savePath = notepadState.saveDialogPath || '/C:/My Documents/Untitled.txt';
  const isFileMenuOpen = !!notepadState.fileMenuOpen;
  const menuPosition = {
    left: notepadState.fileMenuLeft || 0,
    top: notepadState.fileMenuTop || 0,
  };

  function closeSaveDialog(resultPath = null) {
    WindoesApp.state.dispatch({ type: 'NOTEPAD_SAVE_DIALOG_CLOSE' });
    if (resolverRef.current) {
      const resolve = resolverRef.current;
      resolverRef.current = null;
      resolve(resultPath);
    }
  }

  function requestSavePath(suggestedPath) {
    if (resolverRef.current) {
      closeSaveDialog(null);
    }

    WindoesApp.state.dispatch({
      type: 'NOTEPAD_SAVE_DIALOG_OPEN',
      path: suggestedPath || '/C:/My Documents/Untitled.txt',
    });

    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }

  function dispatchNotepadAction(actionType) {
    WindoesApp.events.notepadInteraction.emit({
      type: actionType,
    });
    WindoesApp.state.dispatch({ type: 'NOTEPAD_FILE_MENU_CLOSE' });
  }

  useEffect(() => {
    if (!WindoesApp.notepadDialogs) WindoesApp.notepadDialogs = {};
    WindoesApp.notepadDialogs.requestSavePath = requestSavePath;

    return () => {
      delete WindoesApp.notepadDialogs.requestSavePath;
    };
  }, []);

  useDialogFocus({
    isOpen: isSaveDialogOpen,
    dialogRef: saveDialogRef,
    initialFocusRef: savePathInputRef,
    onInitialFocus: (el) => {
      if (typeof el.select === 'function') {
        el.select();
      }
    },
  });

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

      if (isFileMenuOpen && !e.target.closest('#notepadFileDropdown')) {
        WindoesApp.state.dispatch({ type: 'NOTEPAD_FILE_MENU_CLOSE' });
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

  return (
    <>
      <div
        className={`dialog-overlay notepad-save-dialog${isSaveDialogOpen ? ' active' : ''}`}
        id="notepadSaveDialog"
      >
        <div ref={saveDialogRef} className="dialog-box" style={{ minWidth: '420px' }}>
          <div className="dialog-titlebar">
            <span>Save As</span>
            <button
              className="ctrl-btn"
              id="notepadSaveCloseBtn"
              aria-label="Close"
              onClick={() => closeSaveDialog(null)}
            >
              ×
            </button>
          </div>
          <div className="dialog-body">
            <div className="dialog-icon dialog-icon-info" aria-hidden={true}></div>
            <div className="notepad-save-fields">
              <div className="dialog-text">Choose where to save this text document.</div>
              <div className="notepad-save-row">
                <label htmlFor="notepadSavePathInput">File name:</label>
                <input
                  ref={savePathInputRef}
                  type="text"
                  id="notepadSavePathInput"
                  aria-label="Save path"
                  value={savePath}
                  onChange={(e) => {
                    WindoesApp.state.dispatch({
                      type: 'NOTEPAD_SAVE_DIALOG_SET_PATH',
                      path: e.target.value,
                    });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      closeSaveDialog((savePath || '').trim());
                      return;
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      closeSaveDialog(null);
                    }
                  }}
                />
              </div>
            </div>
          </div>
          <div className="dialog-buttons">
            <button
              className="dialog-btn"
              id="notepadSaveConfirmBtn"
              onClick={() => closeSaveDialog((savePath || '').trim())}
            >
              Save
            </button>
            <button
              className="dialog-btn"
              id="notepadSaveCancelBtn"
              onClick={() => closeSaveDialog(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <div
        className={`context-menu notepad-file-menu${isFileMenuOpen ? ' open' : ''}`}
        id="notepadFileDropdown"
        role="menu"
        style={{ left: `${menuPosition.left}px`, top: `${menuPosition.top}px` }}
      >
        <button type="button" role="menuitem" className="context-menu-item" data-action="new">
          New
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
    </>
  );
}
