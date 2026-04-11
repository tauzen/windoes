import { useEffect, useRef } from 'react';
import WindoesApp from '../app-state.js';

export default function ExplorerContextMenu() {
    const menuRef = useRef(null);
    const callbacksRef = useRef({});

    useEffect(() => {
        const menu = menuRef.current;
        if (!menu) return;

        function close() {
            menu.classList.remove('open');
            if (callbacksRef.current.onClose) callbacksRef.current.onClose();
        }

        function open(options) {
            callbacksRef.current = {
                onNewFolder: options.onNewFolder,
                onRename: options.onRename,
                onDelete: options.onDelete,
                onClose: options.onClose,
            };

            const deleteItem = menu.querySelector('[data-action="delete"]');
            const renameItem = menu.querySelector('[data-action="rename"]');
            if (options.hasSelection) {
                deleteItem.classList.remove('disabled');
                renameItem.classList.remove('disabled');
            } else {
                deleteItem.classList.add('disabled');
                renameItem.classList.add('disabled');
            }

            menu.style.left = options.x + 'px';
            menu.style.top = options.y + 'px';
            menu.classList.add('open');
        }

        function onMenuClick(e) {
            const item = e.target.closest('.context-menu-item');
            if (!item || item.classList.contains('disabled')) return;
            const action = item.dataset.action;
            close();
            if (action === 'new-folder' && callbacksRef.current.onNewFolder) callbacksRef.current.onNewFolder();
            if (action === 'rename' && callbacksRef.current.onRename) callbacksRef.current.onRename();
            if (action === 'delete' && callbacksRef.current.onDelete) callbacksRef.current.onDelete();
        }

        function onDocumentClick(e) {
            if (!menu.contains(e.target)) {
                close();
            }
        }

        WindoesApp.explorerContextMenu = { open, close };
        menu.addEventListener('click', onMenuClick);
        document.addEventListener('click', onDocumentClick);

        return () => {
            delete WindoesApp.explorerContextMenu;
            menu.removeEventListener('click', onMenuClick);
            document.removeEventListener('click', onDocumentClick);
        };
    }, []);

    return (
        <div ref={menuRef} className="context-menu explorer-ctx" id="explorerContextMenu">
            <div className="context-menu-item" data-action="new-folder">New Folder</div>
            <div className="context-menu-sep"></div>
            <div className="context-menu-item" data-action="rename">Rename</div>
            <div className="context-menu-item" data-action="delete">Delete</div>
        </div>
    );
}
