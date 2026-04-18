// ══════════════════════════════════════════════
// Filesystem Explorer — bridges VirtualFS with
// My Computer window for browsing, creating and
// removing folders.
// ══════════════════════════════════════════════
import WindoesApp from './app-state.js';
import { VirtualFS, basename } from './virtual-fs.js';
import { createExplorerNavigation } from './explorer-navigation.mjs';
import { renderInto } from './react-view.js';

const fs = new VirtualFS();

// ── Windows 98 default folder tree ──────────────────────────────────────────

const DEFAULT_DIRS = ['/C:', '/C:/My Documents'];

// Special top-level items shown in "My Computer" root view
const MY_COMPUTER_ITEMS = [
  {
    label: '3\u00BD Floppy (A:)',
    icon: 'drive-icon-floppy',
    action: 'error',
    errorTitle: 'A:\\',
    errorText: 'A:\\ is not accessible.\n\nThe device is not ready.',
    errorIcon: 'error',
  },
  { label: 'Local Disk (C:)', icon: 'drive-icon-hdd', action: 'navigate', path: '/C:' },
  {
    label: 'CD-ROM (D:)',
    icon: 'drive-icon-cdrom',
    action: 'error',
    errorTitle: 'D:\\',
    errorText: 'D:\\ is not accessible.\n\nPlease insert a disc into drive D:.',
    errorIcon: 'error',
  },
  {
    label: 'Control Panel',
    icon: 'folder-icon-cp',
    action: 'error',
    errorTitle: 'Control Panel',
    errorText: 'Control Panel is not available in this version of Windoes.',
    errorIcon: 'info',
  },
];

// ── State ───────────────────────────────────────────────────────────────────

const navigation = createExplorerNavigation();
let lastExplorerActionSeq = 0;

// ── Explorer DOM resolver (no cached module-level element refs) ─────────────
let explorerWindowId = null;

function setDomRefs(cfg) {
  explorerWindowId = cfg?.template?.id || cfg?.el?.id || null;
}

function getDomRefs() {
  if (!explorerWindowId) return {};
  const rootEl = document.getElementById(explorerWindowId);
  if (!rootEl) return {};

  return {
    rootEl,
    viewEl: rootEl.querySelector('.explorer-folder-view'),
    addressEl: rootEl.querySelector('#explorerAddress'),
    statusEl: rootEl.querySelector('.explorer-status-left'),
    titleSpanEl: rootEl.querySelector('#explorerTitleSpan'),
    backBtnEl: rootEl.querySelector('#explorerBackBtn'),
  };
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

const unsubscribeExplorerActions = WindoesApp.state.subscribe(handleExplorerStateActions);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unsubscribeExplorerActions();
  });
}

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

function resetNavigationState() {
  navigation.reset();
}

function navigateTo(path, addToHistory = true) {
  navigation.navigateTo(path, addToHistory);
  render();
}

function goBack() {
  const { canGoBack } = navigation.getState();
  if (!canGoBack) return;

  navigation.goBack();
  render();
}

function goUp() {
  const { path: currentPath } = navigation.getState();
  if (currentPath === null) return;

  navigation.goUp();
  render();
}

// ── Rendering ───────────────────────────────────────────────────────────────

async function render() {
  const { path: currentPath, canGoBack } = navigation.getState();
  const { viewEl, addressEl, statusEl, titleSpanEl, backBtnEl } = getDomRefs();
  if (!viewEl || !addressEl || !statusEl || !titleSpanEl) return;

  addressEl.value = displayPath(currentPath);
  titleSpanEl.textContent = currentPath === null ? 'My Computer' : basename(currentPath);

  if (backBtnEl) backBtnEl.disabled = !canGoBack;

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
              <div
                key={item.path}
                className="folder-item"
                data-path={item.path}
                data-type={item.type}
              >
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
    viewEl.querySelectorAll('.folder-item').forEach((el) => {
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
  } catch (error) {
    console.error('Failed to render explorer directory', { currentPath, error });
    const message = error?.message || 'Unknown error';
    renderInto(viewEl, <div className="explorer-empty">Error reading directory.</div>);
    statusEl.textContent = `Error: ${message}`;
  }
}

function renderMyComputerRoot() {
  const { viewEl, statusEl } = getDomRefs();
  if (!viewEl || !statusEl) return;

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

  viewEl.querySelectorAll('.folder-item').forEach((el) => {
    el.addEventListener('dblclick', () => {
      const idx = parseInt(el.dataset.mcIdx, 10);
      const item = MY_COMPUTER_ITEMS[idx];
      if (item.action === 'navigate') {
        navigateTo(item.path);
      } else if (item.action === 'error') {
        WindoesApp.bsod.showErrorDialog({
          title: item.errorTitle,
          text: item.errorText,
          icon: item.errorIcon,
        });
      }
    });
  });

  wireContextMenu();
}

// ── Context Menu (right-click in folder view) ───────────────────────────────

function wireContextMenu() {
  const { path: currentPath } = navigation.getState();
  const { viewEl } = getDomRefs();
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
  const { path: currentPath } = navigation.getState();
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
    WindoesApp.bsod.showErrorDialog({
      title: 'Error',
      text: `Cannot create folder: ${e.message}`,
      icon: 'error',
    });
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
    WindoesApp.bsod.showErrorDialog({
      title: 'Error Deleting File',
      text: `Cannot delete '${name}': ${e.message}`,
      icon: 'error',
    });
  }
}

// ── Inline Rename ──────────────────────────────────────────────────────────

function startInlineRename(selectedItemPath) {
  if (!selectedItemPath) return;

  const { viewEl } = getDomRefs();
  if (!viewEl) return;

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
        icon: 'error',
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
    WindoesApp.open.notepad({ filePath: path, content });
  } catch (e) {
    WindoesApp.bsod.showErrorDialog({
      title: 'Error',
      text: `Cannot open file: ${e.message}`,
      icon: 'error',
    });
  }
}

async function saveTextFile(path, content) {
  await initFS();
  await fs.writeFile(path, content);
}

// ── Public API ──────────────────────────────────────────────────────────────

export { initFS, navigateTo, goBack, goUp, render, resetNavigationState, setDomRefs, saveTextFile };
