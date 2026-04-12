import { useEffect, useRef } from 'react';
import WindoesApp from '../app-state.js';

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
        WindoesApp.state.dispatch({
            type: 'EXPLORER_CONTEXT_ACTION_DISPATCH',
            commandType: actionType,
            selectedPath,
        });
    }

    useEffect(() => {
        if (!isOpen) return;

        function onDocumentClick(e) {
            const menu = menuRef.current;
            if (!menu || !menu.contains(e.target)) {
                closeMenu();
            }
        }

        document.addEventListener('click', onDocumentClick);
        return () => document.removeEventListener('click', onDocumentClick);
    }, [isOpen]);

    return (
        <div
            ref={menuRef}
            className={`context-menu explorer-ctx${isOpen ? ' open' : ''}`}
            id="explorerContextMenu"
            style={{ left: `${position.x}px`, top: `${position.y}px` }}
        >
            <div className="context-menu-item" data-action="new-folder" onClick={() => runAction('new-folder')}>New Folder</div>
            <div className="context-menu-sep"></div>
            <div
                className={`context-menu-item${hasSelection ? '' : ' disabled'}`}
                data-action="rename"
                onClick={() => {
                    if (hasSelection) runAction('rename');
                }}
            >
                Rename
            </div>
            <div
                className={`context-menu-item${hasSelection ? '' : ' disabled'}`}
                data-action="delete"
                onClick={() => {
                    if (hasSelection) runAction('delete');
                }}
            >
                Delete
            </div>
        </div>
    );
}
