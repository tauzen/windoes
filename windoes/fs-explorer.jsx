// ══════════════════════════════════════════════
// Filesystem Explorer state/model (React-owned view)
// ══════════════════════════════════════════════
import WindoesApp from './app-state.js';
import { VirtualFS, basename } from './virtual-fs.js';
import { createExplorerNavigation } from './explorer-navigation.mjs';

const fs = new VirtualFS();
const navigation = createExplorerNavigation();

const DEFAULT_DIRS = ['/C:', '/C:/My Documents'];

const MY_COMPUTER_ITEMS = [
  {
    id: 'floppy-a',
    label: '3½ Floppy (A:)',
    icon: 'drive-icon-floppy',
    action: 'error',
    errorTitle: 'A:\\',
    errorText: 'A:\\ is not accessible.\n\nThe device is not ready.',
    errorIcon: 'error',
  },
  {
    id: 'disk-c',
    label: 'Local Disk (C:)',
    icon: 'drive-icon-hdd',
    action: 'navigate',
    path: '/C:',
  },
  {
    id: 'cdrom-d',
    label: 'CD-ROM (D:)',
    icon: 'drive-icon-cdrom',
    action: 'error',
    errorTitle: 'D:\\',
    errorText: 'D:\\ is not accessible.\n\nPlease insert a disc into drive D:.',
    errorIcon: 'error',
  },
  {
    id: 'control-panel',
    label: 'Control Panel',
    icon: 'folder-icon-cp',
    action: 'error',
    errorTitle: 'Control Panel',
    errorText: 'Control Panel is not available in this version of Windoes.',
    errorIcon: 'info',
  },
];

let fsInitialized = false;

let navigationViewStateCache = {
  address: 'My Computer',
  canGoBack: false,
};

let explorerViewState = {
  currentPath: null,
  title: 'My Computer',
  statusText: '0 object(s)',
  items: [],
};

const explorerViewListeners = new Set();

function emitExplorerView(nextState) {
  explorerViewState = nextState;
  explorerViewListeners.forEach((listener) => listener());
}

function subscribeExplorerView(listener) {
  explorerViewListeners.add(listener);
  return () => {
    explorerViewListeners.delete(listener);
  };
}

function getExplorerViewState() {
  return explorerViewState;
}

function displayPath(path) {
  if (path === null) return 'My Computer';
  return path.replace(/^\//, '').replace(/\//g, '\\');
}

function getNavigationViewState() {
  const { path, canGoBack } = navigation.getState();
  const nextAddress = displayPath(path);

  if (
    navigationViewStateCache.address === nextAddress &&
    navigationViewStateCache.canGoBack === canGoBack
  ) {
    return navigationViewStateCache;
  }

  navigationViewStateCache = {
    address: nextAddress,
    canGoBack,
  };
  return navigationViewStateCache;
}

function subscribeNavigationView(listener) {
  return navigation.subscribe(listener);
}

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

function readRootItems() {
  return MY_COMPUTER_ITEMS.map((item) => ({
    key: item.id,
    label: item.label,
    icon: item.icon,
    type: 'root-item',
    action: item.action,
    path: item.path || null,
    errorTitle: item.errorTitle || null,
    errorText: item.errorText || null,
    errorIcon: item.errorIcon || 'info',
  }));
}

async function refreshExplorerView() {
  const { path: currentPath } = navigation.getState();

  if (currentPath === null) {
    emitExplorerView({
      currentPath: null,
      title: 'My Computer',
      statusText: `${MY_COMPUTER_ITEMS.length} object(s)`,
      items: readRootItems(),
    });
    return;
  }

  try {
    const entries = await fs.readdir(currentPath);
    const items = [];

    for (const entry of entries) {
      const childPath = currentPath + '/' + entry.name;
      items.push({
        key: childPath,
        label: entry.name,
        path: childPath,
        type: entry.type,
        icon: entry.type === 'directory' ? 'folder-icon-folder' : 'folder-icon-file',
      });
    }

    emitExplorerView({
      currentPath,
      title: basename(currentPath),
      statusText: `${items.length} object(s)`,
      items,
    });
  } catch (error) {
    console.error('Explorer render failed', error);
    emitExplorerView({
      currentPath,
      title: basename(currentPath),
      statusText: `Error: ${error?.message || 'Unknown error'}`,
      items: [],
    });
  }
}

function navigateTo(path, addToHistory = true) {
  navigation.navigateTo(path, addToHistory);
  refreshExplorerView();
}

function goBack() {
  if (!navigation.getState().canGoBack) return;
  navigation.goBack();
  refreshExplorerView();
}

function goUp() {
  if (navigation.getState().path === null) return;
  navigation.goUp();
  refreshExplorerView();
}

function resetNavigationState() {
  navigation.reset();
  refreshExplorerView();
}

function openExplorerContextMenu(event) {
  const { path: currentPath } = navigation.getState();
  if (currentPath === null) {
    WindoesApp.state.dispatch({ type: 'EXPLORER_CONTEXT_CLOSE' });
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const itemEl = event.target.closest('.folder-item');
  const selectedPath = itemEl ? itemEl.dataset.path : null;

  WindoesApp.state.dispatch({
    type: 'EXPLORER_CONTEXT_OPEN',
    x: event.clientX,
    y: event.clientY,
    selectedPath,
  });
}

function isPaintFile(path) {
  const name = basename(path || '').toLowerCase();
  return name.endsWith('.png');
}

async function openFile(path) {
  if (isPaintFile(path)) {
    WindoesApp.open.paint();
    return;
  }

  try {
    const content = await fs.readFile(path);
    WindoesApp.open.notepad({ filePath: path, content });
  } catch (error) {
    WindoesApp.bsod.showErrorDialog({
      title: 'Error',
      text: `Cannot open file: ${error.message}`,
      icon: 'error',
    });
  }
}

function activateExplorerItem(item) {
  if (!item) return;

  if (item.type === 'root-item') {
    if (item.action === 'navigate' && item.path) {
      navigateTo(item.path);
      return;
    }

    if (item.action === 'error') {
      WindoesApp.bsod.showErrorDialog({
        title: item.errorTitle,
        text: item.errorText,
        icon: item.errorIcon,
      });
    }
    return;
  }

  if (item.type === 'directory') {
    navigateTo(item.path);
    return;
  }

  openFile(item.path);
}

async function createNewFolder() {
  const { path: currentPath } = navigation.getState();
  if (currentPath === null) return;

  let name = 'New Folder';
  let counter = 1;
  while (await fs.exists(currentPath + '/' + name)) {
    counter += 1;
    name = `New Folder (${counter})`;
  }

  try {
    await fs.mkdir(currentPath + '/' + name);
    WindoesApp.sound.playClickSound();
    await refreshExplorerView();
  } catch (error) {
    WindoesApp.bsod.showErrorDialog({
      title: 'Error',
      text: `Cannot create folder: ${error.message}`,
      icon: 'error',
    });
  }
}

async function deleteSelected(selectedPath) {
  if (!selectedPath) return;
  const name = basename(selectedPath);

  try {
    const stat = await fs.stat(selectedPath);
    if (stat.type === 'directory') {
      await fs.rm(selectedPath, { recursive: true });
    } else {
      await fs.rm(selectedPath);
    }
    WindoesApp.sound.playClickSound();
    await refreshExplorerView();
  } catch (error) {
    WindoesApp.bsod.showErrorDialog({
      title: 'Error Deleting File',
      text: `Cannot delete '${name}': ${error.message}`,
      icon: 'error',
    });
  }
}

function renameSelected(selectedPath) {
  if (!selectedPath) return;

  WindoesApp.bsod.showErrorDialog({
    title: 'Rename',
    text: 'Inline rename will be reintroduced in the React explorer view.',
    icon: 'info',
  });
}

function handleExplorerInteraction(command = {}) {
  const selectedPath = command.selectedPath || null;

  if (command.type === 'new-folder') {
    createNewFolder();
    return;
  }
  if (command.type === 'rename') {
    renameSelected(selectedPath);
    return;
  }
  if (command.type === 'delete') {
    deleteSelected(selectedPath);
  }
}

const unsubscribeExplorerActions =
  WindoesApp.events.explorerInteraction.subscribe(handleExplorerInteraction);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unsubscribeExplorerActions();
  });
}

async function saveTextFile(path, content) {
  await initFS();
  await fs.writeFile(path, content);
}

export {
  activateExplorerItem,
  getExplorerViewState,
  getNavigationViewState,
  goBack,
  goUp,
  initFS,
  navigateTo,
  openExplorerContextMenu,
  resetNavigationState,
  saveTextFile,
  subscribeExplorerView,
  subscribeNavigationView,
};
