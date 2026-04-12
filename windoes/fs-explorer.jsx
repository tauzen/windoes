// ══════════════════════════════════════════════
// Filesystem Explorer — bridges VirtualFS with
// My Computer window for browsing, creating and
// removing folders.
// ══════════════════════════════════════════════
import WindoesApp from './app-state.js';
import { VirtualFS, basename } from './virtual-fs.js';
import { renderInto } from './react-view.js';

const fs = new VirtualFS();

// ── Windows 98 default folder tree ──────────────────────────────────────────

const DEFAULT_DIRS = [
    '/C:',
    '/C:/My Documents',
];

// Special top-level items shown in "My Computer" root view
const MY_COMPUTER_ITEMS = [
    { label: '3\u00BD Floppy (A:)',  icon: 'drive-icon-floppy',  action: 'error', errorTitle: 'A:\\', errorText: 'A:\\ is not accessible.\n\nThe device is not ready.', errorIcon: 'error' },
    { label: 'Local Disk (C:)',      icon: 'drive-icon-hdd',     action: 'navigate', path: '/C:' },
    { label: 'CD-ROM (D:)',          icon: 'drive-icon-cdrom',   action: 'error', errorTitle: 'D:\\', errorText: 'D:\\ is not accessible.\n\nPlease insert a disc into drive D:.', errorIcon: 'error' },
    { label: 'Control Panel',        icon: 'folder-icon-cp',     action: 'error', errorTitle: 'Control Panel', errorText: 'Control Panel is not available in this version of Windoes.', errorIcon: 'info' },
];

// ── State ───────────────────────────────────────────────────────────────────

let currentPath = null;   // null = My Computer root
let historyStack = [];
let historyIndex = -1;
let lastExplorerActionSeq = 0;

// ── Cached DOM refs (set after window registers) ────────────────────────────
let viewEl = null;
let addressEl = null;
let statusEl = null;
let titleSpanEl = null;
let backBtnEl = null;
let upBtnEl = null;

function setDomRefs(cfg) {
    viewEl      = cfg.el.querySelector('.explorer-folder-view');
    addressEl   = cfg.el.querySelector('#explorerAddress');
    statusEl    = cfg.el.querySelector('.explorer-status-left');
    titleSpanEl = cfg.el.querySelector('#explorerTitleSpan');
    backBtnEl   = cfg.el.querySelector('#explorerBackBtn');
    upBtnEl     = cfg.el.querySelector('#explorerUpBtn');
}

function handleExplorerStateActions() {
    const explorerState = WindoesApp.state.get().explorer || {};
    const seq = explorerState.actionSeq || 0;
    if (seq <= lastExplorerActionSeq) return;
    lastExplorerActionSeq = seq;

    const command = explorerState.actionCommand || {};
    const selectedPath = command.selectedPath || null;

    if (command.type === 'new-folder') {
        createNewFolder();
        return;
    }
    if (command.type === 'rename') {
        startInlineRename(selectedPath);
        return;
    }
    if (command.type === 'delete') {
        deleteSelected(selectedPath);
    }
}

WindoesApp.state.subscribe(handleExplorerStateActions);

// ── Initialise VirtualFS ────────────────────────────────────────────────────

let fsInitialized = false;

async function initFS() {
    if (fsInitialized) return;

    await fs.init();
    for (const dir of DEFAULT_DIRS) {
        if (!(await fs.exists(dir))) {
            await fs.mkdir(dir);
        }
    }
    if (!(await fs.exists('/C:/My Documents/Hello.txt'))) {
        await fs.writeFile('/C:/My Documents/Hello.txt', 'Hello from Windoes XD!');
    }

    fsInitialized = true;
}

// ── Navigation ──────────────────────────────────────────────────────────────

function displayPath(path) {
    if (path === null) return 'My Computer';
    // Convert /C:/Windows → C:\\Windows
    return path.replace(/^\//, '').replace(/\//g, '\\');
}

function navigateTo(path, addToHistory = true) {
    if (addToHistory) {
        // Trim forward history when navigating from middle
        if (historyIndex < historyStack.length - 1) {
            historyStack = historyStack.slice(0, historyIndex + 1);
        }
        historyStack.push(path);
        historyIndex = historyStack.length - 1;
    }
    currentPath = path;
    render();
}

function goBack() {
    if (historyIndex > 0) {
        historyIndex--;
        currentPath = historyStack[historyIndex];
        render();
    }
}

function goUp() {
    if (currentPath === null) return;
    // /C: → My Computer root (null)
    const slashCount = (currentPath.match(/\//g) || []).length;
    if (slashCount <= 1) {
        navigateTo(null);
    } else {
        const parent = currentPath.slice(0, currentPath.lastIndexOf('/'));
        navigateTo(parent || '/');
    }
}

// ── Rendering ───────────────────────────────────────────────────────────────

async function render() {
    if (!viewEl) return;

    addressEl.value = displayPath(currentPath);
    titleSpanEl.textContent = currentPath === null ? 'My Computer' : basename(currentPath);

    if (backBtnEl) backBtnEl.disabled = historyIndex <= 0;

    if (currentPath === null) {
        renderMyComputerRoot();
        return;
    }

    try {
        const entries = await fs.readdir(currentPath);
        const items = [];

        for (const name of entries) {
            const childPath = currentPath + '/' + name;
            const stat = await fs.stat(childPath);
            items.push({ name, path: childPath, type: stat.type });
        }

        renderInto(
            viewEl,
            items.length === 0 ? (
                <div className="explorer-empty">This folder is empty.</div>
            ) : (
                <>
                    {items.map((item) => {
                        const iconClass = item.type === 'directory' ? 'folder-icon-folder' : 'folder-icon-file';
                        return (
                            <div key={item.path} className="folder-item" data-path={item.path} data-type={item.type}>
                                <div className={`folder-item-icon ${iconClass}`}></div>
                                <div>{item.name}</div>
                            </div>
                        );
                    })}
                </>
            )
        );
        statusEl.textContent = `${items.length} object(s)`;

        // Wire double-click handlers
        viewEl.querySelectorAll('.folder-item').forEach(el => {
            el.addEventListener('dblclick', () => {
                const type = el.dataset.type;
                const path = el.dataset.path;
                if (type === 'directory') {
                    navigateTo(path);
                } else {
                    // Open file in notepad
                    openFileInNotepad(path);
                }
            });
        });

        wireContextMenu();
    } catch (e) {
        renderInto(viewEl, <div className="explorer-empty">Error reading directory.</div>);
        statusEl.textContent = '0 object(s)';
    }
}

function renderMyComputerRoot() {
    renderInto(
        viewEl,
        <>
            {MY_COMPUTER_ITEMS.map((item, index) => (
                <div key={`${item.label}-${index}`} className="folder-item" data-mc-idx={index}>
                    <div className={`folder-item-icon ${item.icon}`}></div>
                    <div>{item.label}</div>
                </div>
            ))}
        </>
    );
    statusEl.textContent = `${MY_COMPUTER_ITEMS.length} object(s)`;

    viewEl.querySelectorAll('.folder-item').forEach(el => {
        el.addEventListener('dblclick', () => {
            const idx = parseInt(el.dataset.mcIdx, 10);
            const item = MY_COMPUTER_ITEMS[idx];
            if (item.action === 'navigate') {
                navigateTo(item.path);
            } else if (item.action === 'error') {
                WindoesApp.bsod.showErrorDialog({ title: item.errorTitle, text: item.errorText, icon: item.errorIcon });
            }
        });
    });

    wireContextMenu();
}

// ── Context Menu (right-click in folder view) ───────────────────────────────

function wireContextMenu() {
    if (!viewEl) return;

    if (currentPath === null) {
        viewEl.oncontextmenu = null;
        WindoesApp.state.dispatch({ type: 'EXPLORER_CONTEXT_CLOSE' });
        return;
    }

    viewEl.oncontextmenu = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const itemEl = e.target.closest('.folder-item');
        const selectedItemPath = itemEl ? itemEl.dataset.path : null;

        WindoesApp.state.dispatch({
            type: 'EXPLORER_CONTEXT_OPEN',
            x: e.clientX,
            y: e.clientY,
            selectedPath: selectedItemPath,
        });
    };
}

// ── Folder Operations ───────────────────────────────────────────────────────

async function createNewFolder() {
    if (currentPath === null) return;

    // Find unique name
    let name = 'New Folder';
    let counter = 1;
    while (await fs.exists(currentPath + '/' + name)) {
        counter++;
        name = `New Folder (${counter})`;
    }

    const createdPath = currentPath + '/' + name;

    try {
        await fs.mkdir(createdPath);
        WindoesApp.sound.playClickSound();

        // Immediately start inline rename on the newly created folder
        const selectedItemPath = createdPath;
        await render();
        startInlineRename(selectedItemPath);
    } catch (e) {
        WindoesApp.bsod.showErrorDialog({ title: 'Error', text: `Cannot create folder: ${e.message}`, icon: 'error' });
    }
}

async function deleteSelected(selectedItemPath) {
    if (!selectedItemPath) return;

    const name = basename(selectedItemPath);

    try {
        const stat = await fs.stat(selectedItemPath);
        if (stat.type === 'directory') {
            await fs.rm(selectedItemPath, { recursive: true });
        } else {
            await fs.rm(selectedItemPath);
        }
        WindoesApp.sound.playClickSound();
        await render();
    } catch (e) {
        WindoesApp.bsod.showErrorDialog({ title: 'Error Deleting File', text: `Cannot delete '${name}': ${e.message}`, icon: 'error' });
    }
    selectedItemPath = null;
}

// ── Inline Rename ──────────────────────────────────────────────────────────

function startInlineRename(selectedItemPath) {
    if (!selectedItemPath) return;

    const itemEl = viewEl.querySelector(`.folder-item[data-path="${CSS.escape(selectedItemPath)}"]`);
    if (!itemEl) return;

    const pathToRename = selectedItemPath;
    const oldName = basename(pathToRename);

    // Replace the name label with an input
    const labelEl = itemEl.querySelector('div:last-child');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'folder-rename-input';
    input.value = oldName;
    labelEl.replaceWith(input);

    input.focus();
    // Select name without extension for files
    const dotIndex = oldName.lastIndexOf('.');
    if (dotIndex > 0 && itemEl.dataset.type === 'file') {
        input.setSelectionRange(0, dotIndex);
    } else {
        input.select();
    }

    let committed = false;

    async function commitRename() {
        if (committed) return;
        committed = true;

        const newName = input.value.trim();
        if (!newName || newName === oldName) {
            await render();
            return;
        }

        const parentDir = pathToRename.slice(0, pathToRename.lastIndexOf('/'));
        const newPath = parentDir + '/' + newName;

        try {
            await fs.rename(pathToRename, newPath);
            WindoesApp.sound.playClickSound();
        } catch (e) {
            WindoesApp.bsod.showErrorDialog({
                title: 'Error Renaming',
                text: `Cannot rename '${oldName}': ${e.message}`,
                icon: 'error'
            });
        }
        await render();
    }

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            commitRename();
        } else if (e.key === 'Escape') {
            committed = true;
            render();
        }
    });

    input.addEventListener('blur', () => {
        commitRename();
    });

    // Prevent double-click on input from navigating
    input.addEventListener('dblclick', (e) => e.stopPropagation());
}

// ── File opener ─────────────────────────────────────────────────────────────

async function openFileInNotepad(path) {
    try {
        const content = await fs.readFile(path);
        WindoesApp.open.notepad();
        // Give notepad a tick to open, then set content
        setTimeout(() => {
            const textarea = document.getElementById('notepadText');
            if (textarea) {
                textarea.value = content;
                textarea.dataset.filePath = path;
            }
            const titleEl = document.getElementById('notepadTitle');
            if (titleEl) titleEl.textContent = `${basename(path)} - Notepad`;
        }, 50);
    } catch (e) {
        WindoesApp.bsod.showErrorDialog({ title: 'Error', text: `Cannot open file: ${e.message}`, icon: 'error' });
    }
}

async function saveTextFile(path, content) {
    await initFS();
    await fs.writeFile(path, content);
}

// ── Public API ──────────────────────────────────────────────────────────────

export { initFS, navigateTo, goBack, goUp, render, setDomRefs, currentPath, saveTextFile };
