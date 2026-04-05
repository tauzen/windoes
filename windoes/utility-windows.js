// ══════════════════════════════════════════════
// My Computer Window — VirtualFS-backed explorer
// ══════════════════════════════════════════════
import WindoesApp from './app-state.js';
import { initFS, navigateTo, goBack, goUp, render, setDomRefs } from './fs-explorer.js';

const myComputerConfig = WindoesApp.WindowManager.register('myComputer', {
    template: {
        id: 'myComputerWindow',
        ariaLabel: 'My Computer',
        title: 'My Computer',
        titleIcon: 'titlelogo-mycomputer',
        titleSpanId: 'explorerTitleSpan',
        titlebarId: 'myComputerTitlebar',
        minimizeBtnId: 'myComputerMinBtn',
        maximizeBtn: true,
        closeBtnId: 'myComputerCloseBtn',
        style: 'left: clamp(80px, 10vw, 140px); top: 20px; width: min(600px, calc(100vw - 100px)); height: min(420px, calc(100vh - 60px));',
        menubar: ['File', 'Edit', 'View', 'Favorites', 'Tools', 'Help'],
        toolbar: `<div class="toolbar explorer-toolbar">
                <div class="toolbar-grip"></div>
                <button class="tb-btn" id="explorerBackBtn" disabled><span class="tb-icon tb-icon-back"></span>Back</button>
                <button class="tb-btn" id="explorerUpBtn"><span class="tb-icon tb-icon-up"></span>Up</button>
            </div>
            <div class="address-row">
                <div class="toolbar-grip"></div>
                <label for="explorerAddress">Address</label>
                <div class="address-input-wrap">
                    <span class="address-icon address-icon-folder" aria-hidden="true"></span>
                    <input id="explorerAddress" value="My Computer" aria-label="Address bar" readonly />
                </div>
            </div>`,
        view: '<div class="folder-view explorer-folder-view"></div>',
        viewStyle: 'overflow-y:auto;',
        statusBar: '<span class="status-left explorer-status-left">0 object(s)</span><span class="status-right">My Computer</span>',
    },
    taskButton: { id: 'myComputerTaskBtn', icon: 'task-icon-mycomputer', label: 'My Computer' },
    iframe: null,
    iframeSrc: null,
    hasChrome: true,
});

// Wire explorer navigation buttons
myComputerConfig.el.querySelector('#explorerBackBtn').addEventListener('click', goBack);
myComputerConfig.el.querySelector('#explorerUpBtn').addEventListener('click', goUp);

// Give explorer module its DOM refs
setDomRefs(myComputerConfig);

let fsReady = false;

async function ensureFS() {
    if (fsReady) return;
    await initFS();
    fsReady = true;
}

function openMyComputer() {
    WindoesApp.WindowManager.open('myComputer');
    if (WindoesApp.dom.startMenu) WindoesApp.dom.startMenu.classList.remove('open');
    WindoesApp.dom.startButton.classList.remove('pressed');
    WindoesApp.sound.playClickSound();

    ensureFS().then(() => {
        navigateTo(null);
    });
}

function closeMyComputer() {
    WindoesApp.WindowManager.close('myComputer');
}

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
