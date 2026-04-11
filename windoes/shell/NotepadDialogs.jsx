import { useEffect, useRef } from 'react';
import WindoesApp from '../app-state.js';

export default function NotepadDialogs() {
    const saveDialogRef = useRef(null);
    const savePathInputRef = useRef(null);
    const resolverRef = useRef(null);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const saveDialog = saveDialogRef.current;
        const savePathInput = savePathInputRef.current;
        const saveConfirmBtn = document.getElementById('notepadSaveConfirmBtn');
        const saveCancelBtn = document.getElementById('notepadSaveCancelBtn');
        const saveCloseBtn = document.getElementById('notepadSaveCloseBtn');
        const dropdown = dropdownRef.current;
        if (!saveDialog || !savePathInput || !saveConfirmBtn || !saveCancelBtn || !saveCloseBtn || !dropdown) return;

        function closeSaveDialog(resultPath = null) {
            saveDialog.classList.remove('active');
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

            savePathInput.value = suggestedPath || '/C:/My Documents/Untitled.txt';
            saveDialog.classList.add('active');
            savePathInput.focus();
            savePathInput.select();

            return new Promise((resolve) => {
                resolverRef.current = resolve;
            });
        }

        function closeMenu() {
            dropdown.classList.remove('open');
        }

        function openMenu(fileMenuEl) {
            const rect = fileMenuEl.getBoundingClientRect();
            dropdown.style.left = rect.left + 'px';
            dropdown.style.top = rect.bottom + 'px';
            dropdown.classList.add('open');
        }

        function runNotepadAction(action) {
            const actions = WindoesApp.notepadMenuActions || {};
            const handler = actions[action];
            if (typeof handler === 'function') handler();
        }

        function onDocumentClick(e) {
            const fileMenuEl = e.target.closest('#notepadFileMenu');
            if (fileMenuEl) {
                e.stopPropagation();
                if (dropdown.classList.contains('open')) {
                    closeMenu();
                } else {
                    openMenu(fileMenuEl);
                }
                return;
            }

            const item = e.target.closest('#notepadFileDropdown .context-menu-item');
            if (item && dropdown.contains(item)) {
                const action = item.dataset.action;
                closeMenu();
                runNotepadAction(action);
                return;
            }

            if (dropdown.classList.contains('open') && !dropdown.contains(e.target)) {
                closeMenu();
            }
        }

        function onDocumentKeyDown(e) {
            const withinNotepadWindow = !!(document.activeElement && document.activeElement.closest && document.activeElement.closest('#notepadWindow'));
            if (!withinNotepadWindow) return;

            const lower = e.key.toLowerCase();
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && lower === 's') {
                e.preventDefault();
                runNotepadAction('save-as');
                return;
            }
            if ((e.ctrlKey || e.metaKey) && lower === 's') {
                e.preventDefault();
                runNotepadAction('save');
                return;
            }
            if ((e.ctrlKey || e.metaKey) && lower === 'n') {
                e.preventDefault();
                runNotepadAction('new');
                return;
            }
            if (e.key === 'Escape') {
                closeMenu();
            }
        }

        function onSavePathKeyDown(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                closeSaveDialog((savePathInput.value || '').trim());
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                closeSaveDialog(null);
            }
        }

        if (!WindoesApp.notepadDialogs) WindoesApp.notepadDialogs = {};
        WindoesApp.notepadDialogs.requestSavePath = requestSavePath;

        saveConfirmBtn.addEventListener('click', () => closeSaveDialog((savePathInput.value || '').trim()));
        saveCancelBtn.addEventListener('click', () => closeSaveDialog(null));
        saveCloseBtn.addEventListener('click', () => closeSaveDialog(null));
        savePathInput.addEventListener('keydown', onSavePathKeyDown);
        document.addEventListener('click', onDocumentClick);
        document.addEventListener('keydown', onDocumentKeyDown);

        return () => {
            delete WindoesApp.notepadDialogs.requestSavePath;
            savePathInput.removeEventListener('keydown', onSavePathKeyDown);
            document.removeEventListener('click', onDocumentClick);
            document.removeEventListener('keydown', onDocumentKeyDown);
        };
    }, []);

    return (
        <>
            <div ref={saveDialogRef} className="dialog-overlay notepad-save-dialog" id="notepadSaveDialog">
                <div className="dialog-box" style={{ minWidth: '420px' }}>
                    <div className="dialog-titlebar">
                        <span>Save As</span>
                        <button className="ctrl-btn" id="notepadSaveCloseBtn" aria-label="Close">×</button>
                    </div>
                    <div className="dialog-body">
                        <div className="dialog-icon dialog-icon-info"></div>
                        <div className="notepad-save-fields">
                            <div className="dialog-text">Choose where to save this text document.</div>
                            <div className="notepad-save-row">
                                <label htmlFor="notepadSavePathInput">File name:</label>
                                <input ref={savePathInputRef} type="text" id="notepadSavePathInput" aria-label="Save path" />
                            </div>
                        </div>
                    </div>
                    <div className="dialog-buttons">
                        <button className="dialog-btn" id="notepadSaveConfirmBtn">Save</button>
                        <button className="dialog-btn" id="notepadSaveCancelBtn">Cancel</button>
                    </div>
                </div>
            </div>

            <div ref={dropdownRef} className="context-menu notepad-file-menu" id="notepadFileDropdown">
                <div className="context-menu-item" data-action="new">New</div>
                <div className="context-menu-item" data-action="save">Save</div>
                <div className="context-menu-item" data-action="save-as">Save As...</div>
                <div className="context-menu-sep"></div>
                <div className="context-menu-item" data-action="exit">Exit</div>
            </div>
        </>
    );
}
