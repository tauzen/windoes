// ══════════════════════════════════════════════
// Run Dialog (generated from JS)
// ══════════════════════════════════════════════
import WindoesApp from './app-state.js';

const runDialog = document.getElementById('runDialog');

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
        WindoesApp.bsod.showErrorDialog({ title: 'Calculator', text: 'Windoes cannot find \'calc.exe\'. Make sure you typed the name correctly, and then try again.', icon: 'error' });
    } else if (cmd.startsWith('http://') || cmd.startsWith('https://') || cmd.startsWith('www.')) {
        WindoesApp.open.internetExplorer();
        WindoesApp.ie.navigate(cmd);
    } else {
        WindoesApp.bsod.showErrorDialog({ title: 'Run', text: 'Windoes cannot find \'' + rawCommand + '\'. Make sure you typed the name correctly, and then try again. To search for a file, click the Start button, and then click Search.', icon: 'error' });
    }
});
runInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('runOkBtn').click();
    if (e.key === 'Escape') runDialog.classList.remove('active');
});
