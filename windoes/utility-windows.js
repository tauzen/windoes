// ══════════════════════════════════════════════
// My Computer Window
// ══════════════════════════════════════════════
const myComputerWindow = document.getElementById('myComputerWindow');
const myComputerTaskBtn = document.getElementById('myComputerTaskBtn');

WindowManager.register('myComputer', {
    el: myComputerWindow,
    taskBtn: myComputerTaskBtn,
    iframe: null,
    iframeSrc: null,
    hasChrome: true,
});

function openMyComputer() {
    WindowManager.open('myComputer');
    startMenu.classList.remove('open');
    startButton.classList.remove('pressed');
    playClickSound();
}

function closeMyComputer() {
    WindowManager.close('myComputer');
}

document.getElementById('myComputerCloseBtn').addEventListener('click', closeMyComputer);
document.getElementById('myComputerMinBtn').addEventListener('click', () => WindowManager.minimize('myComputer'));
myComputerTaskBtn.addEventListener('click', () => WindowManager.toggleFromTaskbar('myComputer'));

// Drive click actions
document.getElementById('driveA').addEventListener('dblclick', () => {
    showErrorDialog({ title: 'A:\\', text: 'A:\\ is not accessible.\n\nThe device is not ready.', icon: 'error' });
});
document.getElementById('driveC').addEventListener('dblclick', () => {
    showErrorDialog({ title: 'Local Disk (C:)', text: 'Access to C:\\ is restricted by system policy.\n\nContact your system administrator.', icon: 'warning' });
});
document.getElementById('driveD').addEventListener('dblclick', () => {
    showErrorDialog({ title: 'D:\\', text: 'D:\\ is not accessible.\n\nPlease insert a disc into drive D:.', icon: 'error' });
});

// ══════════════════════════════════════════════
// Notepad
// ══════════════════════════════════════════════
const notepadWindow = document.getElementById('notepadWindow');
const notepadTaskBtn = document.getElementById('notepadTaskBtn');
const notepadText = document.getElementById('notepadText');

WindowManager.register('notepad', {
    el: notepadWindow,
    taskBtn: notepadTaskBtn,
    iframe: null,
    iframeSrc: null,
    hasChrome: true,
    onOpen: () => notepadText.focus(),
});

function openNotepad() {
    WindowManager.open('notepad');
    startMenu.classList.remove('open');
    startButton.classList.remove('pressed');
    closeProgramsSubmenu();
    playClickSound();
}

function closeNotepad() {
    WindowManager.close('notepad');
}

document.getElementById('notepadCloseBtn').addEventListener('click', closeNotepad);
document.getElementById('notepadMinBtn').addEventListener('click', () => WindowManager.minimize('notepad'));
notepadTaskBtn.addEventListener('click', () => WindowManager.toggleFromTaskbar('notepad'));

// ══════════════════════════════════════════════
// Recycle Bin
// ══════════════════════════════════════════════
const recycleBinWindow = document.getElementById('recycleBinWindow');
const recycleBinTaskBtn = document.getElementById('recycleBinTaskBtn');

WindowManager.register('recycleBin', {
    el: recycleBinWindow,
    taskBtn: recycleBinTaskBtn,
    iframe: null,
    iframeSrc: null,
    hasChrome: true,
});

function openRecycleBin() {
    WindowManager.open('recycleBin');
    startMenu.classList.remove('open');
    startButton.classList.remove('pressed');
    playClickSound();
}

function closeRecycleBin() {
    WindowManager.close('recycleBin');
}

document.getElementById('recycleBinCloseBtn').addEventListener('click', closeRecycleBin);
document.getElementById('recycleBinMinBtn').addEventListener('click', () => WindowManager.minimize('recycleBin'));
recycleBinTaskBtn.addEventListener('click', () => WindowManager.toggleFromTaskbar('recycleBin'));
