import { useRef } from 'react';
import WindoesApp from '../app-state.js';
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
        className={`context-menu-item${hasSelection ? '' : ' disabled'}`}
        data-action="rename"
        disabled={!hasSelection}
        onClick={() => {
          if (hasSelection) runAction('rename');
        }}
      >
        Rename
      </button>
      <button
        type="button"
        role="menuitem"
        className={`context-menu-item${hasSelection ? '' : ' disabled'}`}
        data-action="delete"
        disabled={!hasSelection}
        onClick={() => {
          if (hasSelection) runAction('delete');
        }}
      >
        Delete
      </button>
    </div>
  );
}
