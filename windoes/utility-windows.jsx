// ══════════════════════════════════════════════
// My Computer Window — VirtualFS-backed explorer
// ══════════════════════════════════════════════
import WindoesApp from './app-state.js';
import { basename } from './virtual-fs.js';
import {
  initFS,
  navigateTo,
  openFile,
  resetNavigationState,
  saveTextFile,
} from './fs-explorer.jsx';
import { MyComputerStatusLeft, MyComputerTitleText, MyComputerView } from './my-computer-view.jsx';
import MyComputerToolbar from './my-computer-toolbar.jsx';
import { openWindowBoilerplate } from './launch-helpers.js';
import { DEFAULT_NOTEPAD_SAVE_PATH } from './constants.js';
import { describeFsError } from './fs-errors.mjs';

// Notepad title derives from the canonical store (`notepad.currentFilePath`)
// rather than a DOM `textContent` mutation, so the titlebar stays in sync with
// state automatically.
function notepadTitleFor(filePath) {
  return filePath ? `${basename(filePath)} - Notepad` : 'Untitled - Notepad';
}

function NotepadTitleText() {
  const currentFilePath = WindoesApp.state.use((s) => s.notepad.currentFilePath);
  return <>{notepadTitleFor(currentFilePath)}</>;
}

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

function openMyComputer() {
  openWindowBoilerplate('myComputer');

  initFS()
    .then(() => {
      resetNavigationState();
      navigateTo(null);
    })
    .catch((error) => {
      WindoesApp.bsod.showErrorDialog(
        describeFsError(error, { title: 'My Computer', action: 'open My Computer' })
      );
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
    title: <NotepadTitleText />,
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
  if (WindoesApp.fileChooser && typeof WindoesApp.fileChooser.open === 'function') {
    return WindoesApp.fileChooser.open({
      mode: 'save',
      title: 'Save As',
      confirmLabel: 'Save',
      startPath: suggestedPath || DEFAULT_NOTEPAD_SAVE_PATH,
      extensions: ['.txt'],
      defaultExtension: '.txt',
      allowCreateFolder: true,
    });
  }
  return Promise.resolve(null);
}

async function openNotepadDocument() {
  if (!WindoesApp.fileChooser || typeof WindoesApp.fileChooser.open !== 'function') return;

  try {
    await initFS();

    const currentPath = WindoesApp.state.get().notepad.currentFilePath || '';
    const selectedPath = await WindoesApp.fileChooser.open({
      mode: 'open',
      title: 'Open',
      confirmLabel: 'Open',
      startPath: currentPath || DEFAULT_NOTEPAD_SAVE_PATH,
      extensions: ['.txt'],
    });
    if (!selectedPath) return; // user cancelled

    // `openFile` reads the chosen file and routes it to the right app (Notepad
    // for text, Paint for images), reusing the explorer's open behavior.
    await openFile(selectedPath);
    WindoesApp.sound.playClickSound();
  } catch (e) {
    WindoesApp.bsod.showErrorDialog(
      describeFsError(e, { title: 'Open Error', action: 'open the file' })
    );
  }
}

async function saveNotepadDocument(forceSaveAs = false) {
  try {
    await initFS();

    const textarea = notepadConfig.el.querySelector('#notepadText');
    if (!textarea) return;

    let filePath = WindoesApp.state.get().notepad.currentFilePath || '';
    if (!filePath || forceSaveAs) {
      const suggested = filePath || DEFAULT_NOTEPAD_SAVE_PATH;
      const selectedPath = await requestNotepadSavePath(suggested);
      if (!selectedPath) return; // user cancelled
      filePath = selectedPath.trim();
      if (!filePath) return;
    }

    await saveTextFile(filePath, textarea.value || '');
    WindoesApp.state.dispatch({ type: 'NOTEPAD_SET_FILE_PATH', path: filePath });

    WindoesApp.sound.playClickSound();
  } catch (e) {
    WindoesApp.bsod.showErrorDialog(
      describeFsError(e, { title: 'Save Error', action: 'save the file' })
    );
  }
}

function newNotepadDocument() {
  const textarea = notepadConfig.el.querySelector('#notepadText');
  if (!textarea) return;

  textarea.value = '';
  WindoesApp.state.dispatch({ type: 'NOTEPAD_SET_FILE_PATH', path: '' });

  textarea.focus();
  WindoesApp.sound.playClickSound();
}

function processNotepadInteraction(command) {
  if (!command || !command.type) return;

  if (command.type === 'new') {
    newNotepadDocument();
    return;
  }
  if (command.type === 'open') {
    openNotepadDocument();
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

  openWindowBoilerplate('notepad');

  const textarea = notepadConfig.el.querySelector('#notepadText');

  if (textarea && !preserveCurrentDocument) {
    textarea.value = content;
    WindoesApp.state.dispatch({ type: 'NOTEPAD_SET_FILE_PATH', path: filePath || '' });
  }
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
  openWindowBoilerplate('recycleBin');
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
