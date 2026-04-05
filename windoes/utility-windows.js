// ══════════════════════════════════════════════
// My Computer Window — VirtualFS-backed explorer
// ══════════════════════════════════════════════
import WindoesApp from './app-state.js';
import { basename } from './virtual-fs.js';
import { initFS, navigateTo, goBack, goUp, render, setDomRefs, saveTextFile } from './fs-explorer.js';

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

const notepadSaveDialog = document.createElement('div');
notepadSaveDialog.className = 'dialog-overlay notepad-save-dialog';
notepadSaveDialog.id = 'notepadSaveDialog';
notepadSaveDialog.innerHTML = `<div class="dialog-box" style="min-width:420px;">
    <div class="dialog-titlebar">
        <span>Save As</span>
        <button class="ctrl-btn" id="notepadSaveCloseBtn" aria-label="Close">&times;</button>
    </div>
    <div class="dialog-body">
        <div class="dialog-icon dialog-icon-info"></div>
        <div class="notepad-save-fields">
            <div class="dialog-text">Choose where to save this text document.</div>
            <div class="notepad-save-row">
                <label for="notepadSavePathInput">File name:</label>
                <input type="text" id="notepadSavePathInput" aria-label="Save path" />
            </div>
        </div>
    </div>
    <div class="dialog-buttons">
        <button class="dialog-btn" id="notepadSaveConfirmBtn">Save</button>
        <button class="dialog-btn" id="notepadSaveCancelBtn">Cancel</button>
    </div>
</div>`;
document.body.appendChild(notepadSaveDialog);

const notepadSavePathInput = notepadSaveDialog.querySelector('#notepadSavePathInput');
const notepadSaveConfirmBtn = notepadSaveDialog.querySelector('#notepadSaveConfirmBtn');
const notepadSaveCancelBtn = notepadSaveDialog.querySelector('#notepadSaveCancelBtn');
const notepadSaveCloseBtn = notepadSaveDialog.querySelector('#notepadSaveCloseBtn');
let notepadSaveResolver = null;

function closeNotepadSaveDialog(resultPath = null) {
    notepadSaveDialog.classList.remove('active');
    if (notepadSaveResolver) {
        const resolve = notepadSaveResolver;
        notepadSaveResolver = null;
        resolve(resultPath);
    }
}

function requestNotepadSavePath(suggestedPath) {
    if (notepadSaveResolver) {
        closeNotepadSaveDialog(null);
    }

    notepadSavePathInput.value = suggestedPath || '/C:/My Documents/Untitled.txt';
    notepadSaveDialog.classList.add('active');
    notepadSavePathInput.focus();
    notepadSavePathInput.select();

    return new Promise((resolve) => {
        notepadSaveResolver = resolve;
    });
}

notepadSaveConfirmBtn.addEventListener('click', () => {
    closeNotepadSaveDialog((notepadSavePathInput.value || '').trim());
});
notepadSaveCancelBtn.addEventListener('click', () => closeNotepadSaveDialog(null));
notepadSaveCloseBtn.addEventListener('click', () => closeNotepadSaveDialog(null));
notepadSavePathInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        closeNotepadSaveDialog((notepadSavePathInput.value || '').trim());
        return;
    }
    if (e.key === 'Escape') {
        e.preventDefault();
        closeNotepadSaveDialog(null);
    }
});

async function saveNotepadDocument(forceSaveAs = false) {
    try {
        await ensureFS();

        const textarea = notepadConfig.el.querySelector('#notepadText');
        if (!textarea) return;

        let filePath = textarea.dataset.filePath || '';
        if (!filePath || forceSaveAs) {
            const suggested = filePath || '/C:/My Documents/Untitled.txt';
            const selectedPath = await requestNotepadSavePath(suggested);
            if (!selectedPath) return; // user cancelled
            filePath = selectedPath.trim();
            if (!filePath) return;
        }

        await saveTextFile(filePath, textarea.value || '');
        textarea.dataset.filePath = filePath;

        const titleEl = notepadConfig.el.querySelector('#notepadTitle');
        if (titleEl) titleEl.textContent = `${basename(filePath)} - Notepad`;

        WindoesApp.sound.playClickSound();
    } catch (e) {
        WindoesApp.bsod.showErrorDialog({
            title: 'Save Error',
            text: `Cannot save file: ${e.message}`,
            icon: 'error',
        });
    }
}

function newNotepadDocument() {
    const textarea = notepadConfig.el.querySelector('#notepadText');
    if (!textarea) return;

    textarea.value = '';
    delete textarea.dataset.filePath;

    const titleEl = notepadConfig.el.querySelector('#notepadTitle');
    if (titleEl) titleEl.textContent = 'Untitled - Notepad';

    textarea.focus();
    WindoesApp.sound.playClickSound();
}

function setupNotepadFileMenu() {
    const notepadWindowEl = notepadConfig.el;
    const fileMenu = notepadWindowEl.querySelector('#notepadFileMenu');
    if (!fileMenu) return;

    const dropdown = document.createElement('div');
    dropdown.id = 'notepadFileDropdown';
    dropdown.className = 'context-menu notepad-file-menu';
    dropdown.innerHTML = `
        <div class="context-menu-item" data-action="new">New</div>
        <div class="context-menu-item" data-action="save">Save</div>
        <div class="context-menu-item" data-action="save-as">Save As...</div>
        <div class="context-menu-sep"></div>
        <div class="context-menu-item" data-action="exit">Exit</div>
    `;
    document.body.appendChild(dropdown);

    function closeMenu() {
        dropdown.classList.remove('open');
    }

    function openMenu() {
        const rect = fileMenu.getBoundingClientRect();
        dropdown.style.left = rect.left + 'px';
        dropdown.style.top = rect.bottom + 'px';
        dropdown.classList.add('open');
    }

    fileMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        if (dropdown.classList.contains('open')) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    dropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.context-menu-item');
        if (!item) return;

        const action = item.dataset.action;
        closeMenu();

        if (action === 'new') {
            newNotepadDocument();
        } else if (action === 'save') {
            saveNotepadDocument(false);
        } else if (action === 'save-as') {
            saveNotepadDocument(true);
        } else if (action === 'exit') {
            closeNotepad();
        }
    });

    document.addEventListener('click', (e) => {
        if (!dropdown.classList.contains('open')) return;
        if (dropdown.contains(e.target) || fileMenu.contains(e.target)) return;
        closeMenu();
    });

    notepadWindowEl.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
            e.preventDefault();
            saveNotepadDocument(true);
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            saveNotepadDocument(false);
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
            e.preventDefault();
            newNotepadDocument();
            return;
        }
        if (e.key === 'Escape') {
            closeMenu();
        }
    });
}

setupNotepadFileMenu();

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
