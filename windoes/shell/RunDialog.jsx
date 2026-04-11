import { useEffect, useRef } from 'react';
import WindoesApp from '../app-state.js';

export default function RunDialog() {
    const runDialogRef = useRef(null);
    const runInputRef = useRef(null);

    useEffect(() => {
        const runDialog = runDialogRef.current;
        const runInput = runInputRef.current;
        const runOkBtn = document.getElementById('runOkBtn');
        const runCancelBtn = document.getElementById('runCancelBtn');
        const runCloseBtn = document.getElementById('runCloseBtn');
        const menuRun = document.getElementById('menuRun');
        if (!runDialog || !runInput || !runOkBtn || !runCancelBtn || !runCloseBtn || !menuRun) return;

        const runActionHandlers = {
            openNotepad: () => WindoesApp.open.notepad(),
            openMyComputer: () => WindoesApp.open.myComputer(),
            openInternetExplorer: () => WindoesApp.open.internetExplorer(),
            openWinamp: () => WindoesApp.open.winamp(),
            openMinesweeper: () => WindoesApp.open.minesweeper(),
            openSolitaire: () => WindoesApp.open.solitaire(),
        };

        function closeDialog() {
            runDialog.classList.remove('active');
        }

        function onMenuRunClick() {
            if (WindoesApp.dom.startMenu) WindoesApp.dom.startMenu.classList.remove('open');
            if (WindoesApp.dom.startButton) WindoesApp.dom.startButton.classList.remove('pressed');
            runDialog.classList.add('active');
            runInput.value = '';
            runInput.focus();
            WindoesApp.sound.playClickSound();
        }

        function onRunOk() {
            const rawCommand = runInput.value.trim();
            const cmd = rawCommand.toLowerCase();
            closeDialog();

            if (!cmd) return;

            const actionName = (WindoesApp.config.runActions || {})[cmd];
            if (actionName && runActionHandlers[actionName]) {
                runActionHandlers[actionName]();
            } else if (cmd === 'calc' || cmd === 'calc.exe') {
                WindoesApp.bsod.showErrorDialog({ title: 'Calculator', text: 'Windoes cannot find \'calc.exe\'. Make sure you typed the name correctly, and then try again.', icon: 'error' });
            } else if (cmd.startsWith('http://') || cmd.startsWith('https://') || cmd.startsWith('www.')) {
                WindoesApp.open.internetExplorer();
                WindoesApp.ie.navigate(cmd);
            } else {
                WindoesApp.bsod.showErrorDialog({ title: 'Run', text: `Windoes cannot find '${rawCommand}'. Make sure you typed the name correctly, and then try again. To search for a file, click the Start button, and then click Search.`, icon: 'error' });
            }
        }

        function onRunInputKeyDown(e) {
            if (e.key === 'Enter') onRunOk();
            if (e.key === 'Escape') closeDialog();
        }

        menuRun.addEventListener('click', onMenuRunClick);
        runCancelBtn.addEventListener('click', closeDialog);
        runCloseBtn.addEventListener('click', closeDialog);
        runOkBtn.addEventListener('click', onRunOk);
        runInput.addEventListener('keydown', onRunInputKeyDown);

        return () => {
            menuRun.removeEventListener('click', onMenuRunClick);
            runCancelBtn.removeEventListener('click', closeDialog);
            runCloseBtn.removeEventListener('click', closeDialog);
            runOkBtn.removeEventListener('click', onRunOk);
            runInput.removeEventListener('keydown', onRunInputKeyDown);
        };
    }, []);

    return (
        <div ref={runDialogRef} className="dialog-overlay run-dialog" id="runDialog">
            <div className="dialog-box" style={{ minWidth: '380px' }}>
                <div className="dialog-titlebar">
                    <span>Run</span>
                    <button className="ctrl-btn" id="runCloseBtn" aria-label="Close">×</button>
                </div>
                <div className="dialog-body">
                    <div className="run-icon-area">
                        <div className="dialog-icon" style={{ background: '#C0C0C0', border: '2px solid #808080', borderRadius: '2px' }}>
                            <div style={{ position: 'absolute', top: '4px', left: '4px', right: '4px', height: '10px', background: '#000080' }}></div>
                            <div style={{ position: 'absolute', bottom: '4px', left: '4px', width: '12px', height: '8px', background: '#fff', border: '1px solid #808080' }}></div>
                        </div>
                        <div className="dialog-text">Type the name of a program, folder, document, or Internet resource, and Windoes will open it for you.</div>
                    </div>
                    <div className="run-row">
                        <label>Open:</label>
                        <input ref={runInputRef} type="text" id="runInput" />
                    </div>
                </div>
                <div className="dialog-buttons">
                    <button className="dialog-btn" id="runOkBtn">OK</button>
                    <button className="dialog-btn" id="runCancelBtn">Cancel</button>
                    <button className="dialog-btn">Browse...</button>
                </div>
            </div>
        </div>
    );
}
