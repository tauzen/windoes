// ══════════════════════════════════════════════
// My Computer Window
// ══════════════════════════════════════════════
const myComputerConfig = WindoesApp.WindowManager.register('myComputer', {
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
    WindoesApp.WindowManager.open('myComputer');
    if (WindoesApp.dom.startMenu) WindoesApp.dom.startMenu.classList.remove('open');
    WindoesApp.dom.startButton.classList.remove('pressed');
    WindoesApp.sound.playClickSound();
}

function closeMyComputer() {
    WindoesApp.WindowManager.close('myComputer');
}

// Drive click actions
myComputerConfig.el.querySelector('#driveA').addEventListener('dblclick', () => {
    WindoesApp.bsod.showErrorDialog({ title: 'A:\\', text: 'A:\\ is not accessible.\n\nThe device is not ready.', icon: 'error' });
});
myComputerConfig.el.querySelector('#driveC').addEventListener('dblclick', () => {
    WindoesApp.bsod.showErrorDialog({ title: 'Local Disk (C:)', text: 'Access to C:\\ is restricted by system policy.\n\nContact your system administrator.', icon: 'warning' });
});
myComputerConfig.el.querySelector('#driveD').addEventListener('dblclick', () => {
    WindoesApp.bsod.showErrorDialog({ title: 'D:\\', text: 'D:\\ is not accessible.\n\nPlease insert a disc into drive D:.', icon: 'error' });
});

// ══════════════════════════════════════════════
// Notepad
// ══════════════════════════════════════════════
const notepadConfig = WindoesApp.WindowManager.register('notepad', {
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
    WindoesApp.WindowManager.open('notepad');
    if (WindoesApp.dom.startMenu) WindoesApp.dom.startMenu.classList.remove('open');
    WindoesApp.dom.startButton.classList.remove('pressed');
    if (WindoesApp.menu.closeProgramsSubmenu) WindoesApp.menu.closeProgramsSubmenu();
    WindoesApp.sound.playClickSound();
}

function closeNotepad() {
    WindoesApp.WindowManager.close('notepad');
}

// ══════════════════════════════════════════════
// Recycle Bin
// ══════════════════════════════════════════════
WindoesApp.WindowManager.register('recycleBin', {
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
    WindoesApp.WindowManager.open('recycleBin');
    if (WindoesApp.dom.startMenu) WindoesApp.dom.startMenu.classList.remove('open');
    WindoesApp.dom.startButton.classList.remove('pressed');
    WindoesApp.sound.playClickSound();
}

function closeRecycleBin() {
    WindoesApp.WindowManager.close('recycleBin');
}

// Register on shared namespace
WindoesApp.open.myComputer = openMyComputer;
WindoesApp.open.notepad = openNotepad;
WindoesApp.open.recycleBin = openRecycleBin;
