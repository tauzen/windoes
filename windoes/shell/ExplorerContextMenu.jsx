import { useEffect, useRef, useState } from 'react';
import WindoesApp from '../app-state.js';
import { isHtmlFilePath } from '../browser-url.mjs';
import { useOutsideClick } from './outside-click.js';

export default function ExplorerContextMenu() {
  const menuRef = useRef(null);
  const explorerState = WindoesApp.state.use((s) => s.explorer || {});
  const isOpen = !!explorerState.contextMenuOpen;
  const position = {
    x: explorerState.contextMenuX || 0,
    y: explorerState.contextMenuY || 0,
  };
  const selectedPath = explorerState.selectedPath || null;
  const hasSelection = !!selectedPath;
  // System (protected) entries cannot be renamed or deleted.
  const isSystem = !!explorerState.selectedIsSystem;
  const canModify = hasSelection && !isSystem;
  // HTML documents get Open (in Internet Explorer) plus an Open With submenu.
  const isHtmlFile = explorerState.selectedType === 'file' && isHtmlFilePath(selectedPath);

  // "Open With" expands on hover (desktop) or tap (touch).
  const [openWithExpanded, setOpenWithExpanded] = useState(false);
  useEffect(() => {
    if (!isOpen) setOpenWithExpanded(false);
  }, [isOpen]);

  function closeMenu() {
    WindoesApp.state.dispatch({ type: 'EXPLORER_CONTEXT_CLOSE' });
  }

  function runAction(actionType) {
    WindoesApp.events.explorerInteraction.emit({
      type: actionType,
      selectedPath,
    });
    closeMenu();
  }

  useOutsideClick({
    enabled: isOpen,
    getElements: () => [menuRef.current],
    onOutsideClick: closeMenu,
  });

  return (
    <div
      ref={menuRef}
      className={`context-menu explorer-ctx${isOpen ? ' open' : ''}`}
      id="explorerContextMenu"
      role="menu"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      {isHtmlFile && (
        <>
          <button
            type="button"
            role="menuitem"
            className="context-menu-item default-action"
            data-action="open"
            onClick={() => runAction('open')}
          >
            Open
          </button>
          <div
            className="context-menu-branch"
            onMouseEnter={() => setOpenWithExpanded(true)}
            onMouseLeave={() => setOpenWithExpanded(false)}
          >
            <button
              type="button"
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={openWithExpanded}
              className="context-menu-item context-menu-item-arrow"
              data-action="open-with"
              onClick={() => setOpenWithExpanded(true)}
            >
              Open With
            </button>
            <div
              className={`context-menu context-submenu${openWithExpanded ? ' open' : ''}`}
              id="explorerOpenWithSubmenu"
              role="menu"
            >
              <button
                type="button"
                role="menuitem"
                className="context-menu-item"
                data-action="open-with-notepad"
                onClick={() => runAction('open-with-notepad')}
              >
                Notepad
              </button>
            </div>
          </div>
          <div className="context-menu-sep"></div>
        </>
      )}
      <button
        type="button"
        role="menuitem"
        className="context-menu-item"
        data-action="new-folder"
        onClick={() => runAction('new-folder')}
      >
        New Folder
      </button>
      <div className="context-menu-sep"></div>
      <button
        type="button"
        role="menuitem"
        className={`context-menu-item${canModify ? '' : ' disabled'}`}
        data-action="rename"
        disabled={!canModify}
        onClick={() => {
          if (canModify) runAction('rename');
        }}
      >
        Rename
      </button>
      <button
        type="button"
        role="menuitem"
        className={`context-menu-item${canModify ? '' : ' disabled'}`}
        data-action="delete"
        disabled={!canModify}
        onClick={() => {
          if (canModify) runAction('delete');
        }}
      >
        Delete
      </button>
    </div>
  );
}
