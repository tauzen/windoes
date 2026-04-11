import { useEffect, useRef, useState } from 'react';
import WindoesApp from '../app-state.js';

export default function ExplorerContextMenu() {
    const menuRef = useRef(null);
    const callbacksRef = useRef({});
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [hasSelection, setHasSelection] = useState(false);

    function closeMenu() {
        setIsOpen(false);
        if (callbacksRef.current.onClose) callbacksRef.current.onClose();
    }

    function openMenu(options) {
        callbacksRef.current = {
            onNewFolder: options.onNewFolder,
            onRename: options.onRename,
            onDelete: options.onDelete,
            onClose: options.onClose,
        };

        setHasSelection(!!options.hasSelection);
        setPosition({ x: options.x, y: options.y });
        setIsOpen(true);
    }

    useEffect(() => {
        WindoesApp.explorerContextMenu = { open: openMenu, close: closeMenu };
        return () => {
            delete WindoesApp.explorerContextMenu;
        };
    }, []);

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

    function runAction(action) {
        closeMenu();
        if (action === 'new-folder' && callbacksRef.current.onNewFolder) callbacksRef.current.onNewFolder();
        if (action === 'rename' && callbacksRef.current.onRename) callbacksRef.current.onRename();
        if (action === 'delete' && callbacksRef.current.onDelete) callbacksRef.current.onDelete();
    }

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
