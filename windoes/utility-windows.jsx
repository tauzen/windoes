// ══════════════════════════════════════════════
// My Computer Window — VirtualFS-backed explorer
// ══════════════════════════════════════════════
import WindoesApp from './app-state.js';
import { basename } from './virtual-fs.js';
import { initFS, navigateTo, resetNavigationState, saveTextFile } from './fs-explorer.jsx';
import { MyComputerStatusLeft, MyComputerTitleText, MyComputerView } from './my-computer-view.jsx';
import MyComputerToolbar from './my-computer-toolbar.jsx';
import { closeStartMenuBoilerplate } from './launch-helpers.js';

WindoesApp.WindowManager.register('myComputer', {
  template: {
    id: 'myComputerWindow',
    ariaLabel: 'My Computer',
    title: <MyComputerTitleText />,
    titleIcon: 'titlelogo-mycomputer',
    titleSpanId: 'explorerTitleSpan',
    titlebarId: 'myComputerTitlebar',
    minimizeBtnId: 'myComputerMinBtn',
    maximizeBtn: true,
    closeBtnId: 'myComputerCloseBtn',
    style:
      'left: clamp(80px, 10vw, 140px); top: 20px; width: min(600px, calc(100vw - 100px)); height: min(420px, calc(100vh - 60px));',
    menubar: ['File', 'Edit', 'View', 'Favorites', 'Tools', 'Help'],
    toolbar: <MyComputerToolbar />,
    view: <MyComputerView />,
    viewStyle: { overflowY: 'auto' },
    statusBar: (
      <>
        <MyComputerStatusLeft />
        <span className="status-right">My Computer</span>
      </>
    ),
    useSharedWindowComponent: true,
  },
  taskButton: { id: 'myComputerTaskBtn', icon: 'task-icon-mycomputer', label: 'My Computer' },
  iframe: null,
  iframeSrc: null,
  hasChrome: true,
});

let fsReady = false;

async function ensureFS() {
  if (fsReady) return;
  await initFS();
  fsReady = true;
}

function openMyComputer() {
  WindoesApp.WindowManager.open('myComputer');
  closeStartMenuBoilerplate();

  ensureFS().then(() => {
    resetNavigationState();
    navigateTo(null);
  });
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
    style:
      'left: clamp(120px, 14vw, 200px); top: 30px; width: min(640px, calc(100vw - 100px)); height: min(440px, calc(100vh - 60px));',
    menubar: [{ id: 'notepadFileMenu', label: 'File' }, 'Edit', 'Search', 'Help'],
    view: <textarea className="notepad-textarea" id="notepadText" spellCheck={false}></textarea>,
    useSharedWindowComponent: true,
  },
  taskButton: { id: 'notepadTaskBtn', icon: 'task-icon-notepad', label: 'Notepad' },
  iframe: null,
  iframeSrc: null,
  hasChrome: true,
  onOpen: () => notepadConfig.el.querySelector('#notepadText').focus(),
});

function requestNotepadSavePath(suggestedPath) {
  if (
    WindoesApp.notepadDialogs &&
    typeof WindoesApp.notepadDialogs.requestSavePath === 'function'
  ) {
    return WindoesApp.notepadDialogs.requestSavePath(suggestedPath);
  }
  return Promise.resolve(null);
}

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

function processNotepadInteraction(command) {
  if (!command || !command.type) return;

  if (command.type === 'new') {
    newNotepadDocument();
    return;
  }
  if (command.type === 'save') {
    saveNotepadDocument(false);
    return;
  }
  if (command.type === 'save-as') {
    saveNotepadDocument(true);
    return;
  }
  if (command.type === 'exit') {
    closeNotepad();
  }
}

const unsubscribeNotepadInteraction =
  WindoesApp.events.notepadInteraction.subscribe(processNotepadInteraction);

function openNotepad(options = {}) {
  const { filePath = '', content = '', preserveCurrentDocument = false } = options;

  WindoesApp.WindowManager.open('notepad');

  const textarea = notepadConfig.el.querySelector('#notepadText');
  const titleEl = notepadConfig.el.querySelector('#notepadTitle');

  if (textarea && !preserveCurrentDocument) {
    textarea.value = content;

    if (filePath) {
      textarea.dataset.filePath = filePath;
      if (titleEl) titleEl.textContent = `${basename(filePath)} - Notepad`;
    } else {
      delete textarea.dataset.filePath;
      if (titleEl) titleEl.textContent = 'Untitled - Notepad';
    }
  }

  closeStartMenuBoilerplate();
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
    style:
      'left: clamp(100px, 12vw, 180px); top: 24px; width: min(550px, calc(100vw - 100px)); height: min(380px, calc(100vh - 60px));',
    menubar: ['File', 'Edit', 'View', 'Help'],
    view: (
      <div
        className="folder-view"
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          color: '#808080',
          fontSize: '11px',
        }}
      >
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '14px', marginBottom: '8px' }}>Recycle Bin is empty.</div>
        </div>
      </div>
    ),
    viewStyle: { overflowY: 'auto' },
    statusBar: <span className="status-left">0 object(s)</span>,
    useSharedWindowComponent: true,
  },
  taskButton: { id: 'recycleBinTaskBtn', icon: 'task-icon-recyclebin', label: 'Recycle Bin' },
  iframe: null,
  iframeSrc: null,
  hasChrome: true,
});

function openRecycleBin() {
  WindoesApp.WindowManager.open('recycleBin');
  closeStartMenuBoilerplate();
}

// Register on shared namespace
WindoesApp.open.myComputer = openMyComputer;
WindoesApp.open.notepad = openNotepad;
WindoesApp.open.recycleBin = openRecycleBin;

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unsubscribeNotepadInteraction();
  });
}
