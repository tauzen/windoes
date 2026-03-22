// ══════════════════════════════════════════════
// My Computer Window
// ══════════════════════════════════════════════
const myComputerConfig = WindowManager.register('myComputer', {
    template: {
        id: 'myComputerWindow',
        ariaLabel: 'My Computer',
        title: 'My Computer',
        titleIcon: 'titlelogo-mycomputer',
        titlebarId: 'myComputerTitlebar',
        minimizeBtnId: 'myComputerMinBtn',
        maximizeBtn: true,
        closeBtnId: 'myComputerCloseBtn',
        style: 'left: clamp(80px, 10vw, 140px); top: 20px; width: min(600px, calc(100vw - 100px)); height: min(420px, calc(100vh - 60px));',
        menubar: ['File', 'Edit', 'View', 'Favorites', 'Tools', 'Help'],
        view: `<div class="folder-view">
                    <div class="folder-item" id="driveA">
                        <div class="folder-item-icon drive-icon-floppy"></div>
                        <div>3&frac12; Floppy (A:)</div>
                    </div>
                    <div class="folder-item" id="driveC">
                        <div class="folder-item-icon drive-icon-hdd"></div>
                        <div>Local Disk (C:)</div>
                    </div>
                    <div class="folder-item" id="driveD">
                        <div class="folder-item-icon drive-icon-cdrom"></div>
                        <div>CD-ROM (D:)</div>
                    </div>
                    <div class="folder-item">
                        <div class="folder-item-icon folder-icon-cp"></div>
                        <div>Control Panel</div>
                    </div>
                    <div class="folder-item">
                        <div class="folder-item-icon folder-icon-folder"></div>
                        <div>My Documents</div>
                    </div>
                    <div class="folder-item">
                        <div class="folder-item-icon folder-icon-folder"></div>
                        <div>Shared Documents</div>
                    </div>
                </div>`,
        viewStyle: 'overflow-y:auto;',
        statusBar: '<span class="status-left">6 object(s)</span><span class="status-right">My Computer</span>',
    },
    taskButton: { id: 'myComputerTaskBtn', icon: 'task-icon-mycomputer', label: 'My Computer' },
    iframe: null,
    iframeSrc: null,
    hasChrome: true,
});

function openMyComputer() {
    WindowManager.open('myComputer');
    if (startMenu) startMenu.classList.remove('open');
    startButton.classList.remove('pressed');
    playClickSound();
}

function closeMyComputer() {
    WindowManager.close('myComputer');
}

// Drive click actions
myComputerConfig.el.querySelector('#driveA').addEventListener('dblclick', () => {
    showErrorDialog({ title: 'A:\\', text: 'A:\\ is not accessible.\n\nThe device is not ready.', icon: 'error' });
});
myComputerConfig.el.querySelector('#driveC').addEventListener('dblclick', () => {
    showErrorDialog({ title: 'Local Disk (C:)', text: 'Access to C:\\ is restricted by system policy.\n\nContact your system administrator.', icon: 'warning' });
});
myComputerConfig.el.querySelector('#driveD').addEventListener('dblclick', () => {
    showErrorDialog({ title: 'D:\\', text: 'D:\\ is not accessible.\n\nPlease insert a disc into drive D:.', icon: 'error' });
});

// ══════════════════════════════════════════════
// Notepad
// ══════════════════════════════════════════════
const notepadConfig = WindowManager.register('notepad', {
    template: {
        id: 'notepadWindow',
        className: 'notepad-window',
        ariaLabel: 'Notepad',
        title: 'Untitled - Notepad',
        titleIcon: 'titlelogo-notepad',
        titleSpanId: 'notepadTitle',
        titlebarId: 'notepadTitlebar',
        minimizeBtnId: 'notepadMinBtn',
        maximizeBtn: true,
        closeBtnId: 'notepadCloseBtn',
        style: 'left: clamp(120px, 14vw, 200px); top: 30px; width: min(640px, calc(100vw - 100px)); height: min(440px, calc(100vh - 60px));',
        menubar: [{ id: 'notepadFileMenu', label: 'File' }, 'Edit', 'Search', 'Help'],
        view: '<textarea class="notepad-textarea" id="notepadText" spellcheck="false"></textarea>',
    },
    taskButton: { id: 'notepadTaskBtn', icon: 'task-icon-notepad', label: 'Notepad' },
    iframe: null,
    iframeSrc: null,
    hasChrome: true,
    onOpen: () => notepadConfig.el.querySelector('#notepadText').focus(),
});

function openNotepad() {
    WindowManager.open('notepad');
    if (startMenu) startMenu.classList.remove('open');
    startButton.classList.remove('pressed');
    if (typeof closeProgramsSubmenu === 'function') closeProgramsSubmenu();
    playClickSound();
}

function closeNotepad() {
    WindowManager.close('notepad');
}

// ══════════════════════════════════════════════
// Recycle Bin
// ══════════════════════════════════════════════
WindowManager.register('recycleBin', {
    template: {
        id: 'recycleBinWindow',
        ariaLabel: 'Recycle Bin',
        title: 'Recycle Bin',
        titleIcon: 'titlelogo-recyclebin',
        titlebarId: 'recycleBinTitlebar',
        minimizeBtnId: 'recycleBinMinBtn',
        maximizeBtn: true,
        closeBtnId: 'recycleBinCloseBtn',
        style: 'left: clamp(100px, 12vw, 180px); top: 24px; width: min(550px, calc(100vw - 100px)); height: min(380px, calc(100vh - 60px));',
        menubar: ['File', 'Edit', 'View', 'Help'],
        view: `<div class="folder-view" style="align-items:center;justify-content:center;color:#808080;font-size:11px;">
                    <div style="text-align:center;padding:40px;">
                        <div style="font-size:14px;margin-bottom:8px;">Recycle Bin is empty.</div>
                    </div>
                </div>`,
        viewStyle: 'overflow-y:auto;',
        statusBar: '<span class="status-left">0 object(s)</span>',
    },
    taskButton: { id: 'recycleBinTaskBtn', icon: 'task-icon-recyclebin', label: 'Recycle Bin' },
    iframe: null,
    iframeSrc: null,
    hasChrome: true,
});

function openRecycleBin() {
    WindowManager.open('recycleBin');
    if (startMenu) startMenu.classList.remove('open');
    startButton.classList.remove('pressed');
    playClickSound();
}

function closeRecycleBin() {
    WindowManager.close('recycleBin');
}
