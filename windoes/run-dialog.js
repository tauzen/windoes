// ══════════════════════════════════════════════
// Run Dialog
// ══════════════════════════════════════════════
const runDialog = document.getElementById('runDialog');
const runInput = document.getElementById('runInput');

document.getElementById('menuRun').addEventListener('click', () => {
    startMenu.classList.remove('open');
    startButton.classList.remove('pressed');
    runDialog.classList.add('active');
    runInput.value = '';
    runInput.focus();
    playClickSound();
});

document.getElementById('runCancelBtn').addEventListener('click', () => {
    runDialog.classList.remove('active');
});
document.getElementById('runCloseBtn').addEventListener('click', () => {
    runDialog.classList.remove('active');
});

const runActionHandlers = {
    openNotepad,
    openMyComputer,
    openInternetExplorer,
    openWinamp,
    openMinesweeper
};

document.getElementById('runOkBtn').addEventListener('click', () => {
    const rawCommand = runInput.value.trim();
    const cmd = rawCommand.toLowerCase();
    runDialog.classList.remove('active');

    if (!cmd) return;

    const actionName = (simulatorConfig.runActions || {})[cmd];
    if (actionName && runActionHandlers[actionName]) {
        runActionHandlers[actionName]();
    } else if (cmd === 'calc' || cmd === 'calc.exe') {
        showErrorDialog({ title: 'Calculator', text: 'Windows cannot find \'calc.exe\'. Make sure you typed the name correctly, and then try again.', icon: 'error' });
    } else if (cmd.startsWith('http://') || cmd.startsWith('https://') || cmd.startsWith('www.')) {
        openInternetExplorer();
        navigate(cmd);
    } else {
        showErrorDialog({ title: 'Run', text: 'Windows cannot find \'' + rawCommand + '\'. Make sure you typed the name correctly, and then try again. To search for a file, click the Start button, and then click Search.', icon: 'error' });
    }
});
runInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('runOkBtn').click();
    if (e.key === 'Escape') runDialog.classList.remove('active');
});
