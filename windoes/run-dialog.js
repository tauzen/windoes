// ══════════════════════════════════════════════
// Run Dialog (generated from JS)
// ══════════════════════════════════════════════

// Create Run Dialog DOM
const runDialog = document.createElement('div');
runDialog.className = 'dialog-overlay run-dialog';
runDialog.id = 'runDialog';
runDialog.innerHTML = `<div class="dialog-box" style="min-width:380px;">
    <div class="dialog-titlebar">
        <span>Run</span>
        <button class="ctrl-btn" id="runCloseBtn" aria-label="Close">&times;</button>
    </div>
    <div class="dialog-body">
        <div class="run-icon-area">
            <div class="dialog-icon" style="background:#C0C0C0;border:2px solid #808080;border-radius:2px;">
                <div style="position:absolute;top:4px;left:4px;right:4px;height:10px;background:#000080;"></div>
                <div style="position:absolute;bottom:4px;left:4px;width:12px;height:8px;background:#fff;border:1px solid #808080;"></div>
            </div>
            <div class="dialog-text">Type the name of a program, folder, document, or Internet resource, and Windows will open it for you.</div>
        </div>
        <div class="run-row">
            <label>Open:</label>
            <input type="text" id="runInput" />
        </div>
    </div>
    <div class="dialog-buttons">
        <button class="dialog-btn" id="runOkBtn">OK</button>
        <button class="dialog-btn" id="runCancelBtn">Cancel</button>
        <button class="dialog-btn">Browse...</button>
    </div>
</div>`;
document.body.appendChild(runDialog);

const runInput = document.getElementById('runInput');

document.getElementById('menuRun').addEventListener('click', () => {
    WindoesApp.dom.startMenu.classList.remove('open');
    WindoesApp.dom.startButton.classList.remove('pressed');
    runDialog.classList.add('active');
    runInput.value = '';
    runInput.focus();
    WindoesApp.sound.playClickSound();
});

document.getElementById('runCancelBtn').addEventListener('click', () => {
    runDialog.classList.remove('active');
});
document.getElementById('runCloseBtn').addEventListener('click', () => {
    runDialog.classList.remove('active');
});

const runActionHandlers = {
    openNotepad:            WindoesApp.open.notepad,
    openMyComputer:         WindoesApp.open.myComputer,
    openInternetExplorer:   WindoesApp.open.internetExplorer,
    openWinamp:             WindoesApp.open.winamp,
    openMinesweeper:        WindoesApp.open.minesweeper,
    openSkifree:            WindoesApp.open.skifree,
    openSolitaire:          WindoesApp.open.solitaire,
};

document.getElementById('runOkBtn').addEventListener('click', () => {
    const rawCommand = runInput.value.trim();
    const cmd = rawCommand.toLowerCase();
    runDialog.classList.remove('active');

    if (!cmd) return;

    const actionName = (WindoesApp.config.runActions || {})[cmd];
    if (actionName && runActionHandlers[actionName]) {
        runActionHandlers[actionName]();
    } else if (cmd === 'calc' || cmd === 'calc.exe') {
        WindoesApp.bsod.showErrorDialog({ title: 'Calculator', text: 'Windows cannot find \'calc.exe\'. Make sure you typed the name correctly, and then try again.', icon: 'error' });
    } else if (cmd.startsWith('http://') || cmd.startsWith('https://') || cmd.startsWith('www.')) {
        WindoesApp.open.internetExplorer();
        WindoesApp.ie.navigate(cmd);
    } else {
        WindoesApp.bsod.showErrorDialog({ title: 'Run', text: 'Windows cannot find \'' + rawCommand + '\'. Make sure you typed the name correctly, and then try again. To search for a file, click the Start button, and then click Search.', icon: 'error' });
    }
});
runInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('runOkBtn').click();
    if (e.key === 'Escape') runDialog.classList.remove('active');
});
