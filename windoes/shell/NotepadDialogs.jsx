import { useEffect, useRef, useState } from 'react';
import WindoesApp from '../app-state.js';

export default function NotepadDialogs() {
    const savePathInputRef = useRef(null);
    const resolverRef = useRef(null);
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [savePath, setSavePath] = useState('/C:/My Documents/Untitled.txt');
    const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 });

    function closeSaveDialog(resultPath = null) {
        setIsSaveDialogOpen(false);
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

        setSavePath(suggestedPath || '/C:/My Documents/Untitled.txt');
        setIsSaveDialogOpen(true);

        requestAnimationFrame(() => {
            const input = savePathInputRef.current;
            if (!input) return;
            input.focus();
            input.select();
        });

        return new Promise((resolve) => {
            resolverRef.current = resolve;
        });
    }

    function runNotepadAction(action) {
        const actions = WindoesApp.notepadMenuActions || {};
        const handler = actions[action];
        if (typeof handler === 'function') handler();
    }

    useEffect(() => {
        if (!WindoesApp.notepadDialogs) WindoesApp.notepadDialogs = {};
        WindoesApp.notepadDialogs.requestSavePath = requestSavePath;

        return () => {
            delete WindoesApp.notepadDialogs.requestSavePath;
        };
    }, []);

    useEffect(() => {
        function onDocumentClick(e) {
            const fileMenuEl = e.target.closest('#notepadFileMenu');
            if (fileMenuEl) {
                e.stopPropagation();
                if (isFileMenuOpen) {
                    setIsFileMenuOpen(false);
                } else {
                    const rect = fileMenuEl.getBoundingClientRect();
                    setMenuPosition({ left: rect.left, top: rect.bottom });
                    setIsFileMenuOpen(true);
                }
                return;
            }

            const item = e.target.closest('#notepadFileDropdown .context-menu-item');
            if (item && isFileMenuOpen) {
                const action = item.dataset.action;
                setIsFileMenuOpen(false);
                runNotepadAction(action);
                return;
            }

            if (isFileMenuOpen && !e.target.closest('#notepadFileDropdown')) {
                setIsFileMenuOpen(false);
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
                setIsFileMenuOpen(false);
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
            <div className={`dialog-overlay notepad-save-dialog${isSaveDialogOpen ? ' active' : ''}`} id="notepadSaveDialog">
                <div className="dialog-box" style={{ minWidth: '420px' }}>
                    <div className="dialog-titlebar">
                        <span>Save As</span>
                        <button className="ctrl-btn" id="notepadSaveCloseBtn" aria-label="Close" onClick={() => closeSaveDialog(null)}>×</button>
                    </div>
                    <div className="dialog-body">
                        <div className="dialog-icon dialog-icon-info"></div>
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
                                    onChange={(e) => setSavePath(e.target.value)}
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
                        <button className="dialog-btn" id="notepadSaveConfirmBtn" onClick={() => closeSaveDialog((savePath || '').trim())}>Save</button>
                        <button className="dialog-btn" id="notepadSaveCancelBtn" onClick={() => closeSaveDialog(null)}>Cancel</button>
                    </div>
                </div>
            </div>

            <div
                className={`context-menu notepad-file-menu${isFileMenuOpen ? ' open' : ''}`}
                id="notepadFileDropdown"
                style={{ left: `${menuPosition.left}px`, top: `${menuPosition.top}px` }}
            >
                <div className="context-menu-item" data-action="new">New</div>
                <div className="context-menu-item" data-action="save">Save</div>
                <div className="context-menu-item" data-action="save-as">Save As...</div>
                <div className="context-menu-sep"></div>
                <div className="context-menu-item" data-action="exit">Exit</div>
            </div>
        </>
    );
}
