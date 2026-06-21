// ══════════════════════════════════════════════
// App Window (experiment apps)
// ══════════════════════════════════════════════
import WindoesApp from './app-state.js';
import { makeDraggable } from './dragging.js';
import { closeStartMenuBoilerplate, openWindowBoilerplate } from './launch-helpers.js';
import {
  APP_TASK_LABEL_MAX_LEN,
  APP_TASK_LABEL_TRUNCATE_LEN,
  VIEW_BORDER_PX,
} from './constants.js';
import { VirtualFS } from './virtual-fs.js';
import { once } from './once.mjs';

// App-window title, status, and task-button label render reactively from the
// canonical `app` slice instead of imperative `textContent` writes.
function AppTitleText() {
  return <>{WindoesApp.state.use((s) => s.app.title)}</>;
}

function AppStatusText() {
  return <>{WindoesApp.state.use((s) => s.app.status)}</>;
}

function AppTaskLabel() {
  return <>{WindoesApp.state.use((s) => s.app.taskLabel)}</>;
}

// Paint's window title and task-button label track the opened file name. The
// titlebar re-renders on focus/blur, so the title must come from state rather
// than imperative DOM writes (which a re-render would discard).
function PaintTitleText() {
  return <>{WindoesApp.state.use((s) => s.paint.title)}</>;
}

function PaintTaskLabel() {
  return <>{WindoesApp.state.use((s) => s.paint.taskLabel)}</>;
}

const appConfig = WindoesApp.WindowManager.register('app', {
  template: {
    id: 'appWindow',
    className: 'app-window',
    ariaLabel: 'Application window',
    title: <AppTitleText />,
    titleIcon: 'titlelogo-app',
    titleSpanId: 'appWindowTitle',
    titlebarId: 'appTitlebar',
    minimizeBtnId: 'appMinimizeBtn',
    maximizeBtn: true,
    closeBtnId: 'appCloseBtn',
    style: 'left: clamp(110px, 15vw, 190px); top: 28px;',
    menubar: ['File', 'View', 'Help'],
    view: (
      <iframe
        id="appFrame"
        title="Application content"
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin"
        allow="autoplay"
      ></iframe>
    ),
    statusBar: (
      <span className="status-left" id="appStatusText">
        <AppStatusText />
      </span>
    ),
    useSharedWindowComponent: true,
  },
  taskButton: {
    id: 'appTaskButton',
    icon: 'task-icon-app',
    label: <AppTaskLabel />,
    labelId: 'appTaskLabel',
  },
  iframeId: 'appFrame',
  iframeSrc: null, // set dynamically per openApp call
  hasChrome: true,
  setup: setupAppWindowListeners,
});

const appFrame = appConfig.el.querySelector('#appFrame');

function setupAppWindowListeners() {
  const releaseMessageListener = retainAppMessageListener();
  appFrame.addEventListener('load', onAppFrameLoad);

  return () => {
    appFrame.removeEventListener('load', onAppFrameLoad);
    releaseMessageListener();
  };
}

function openApp(title, url) {
  const shortTitle =
    title.length > APP_TASK_LABEL_MAX_LEN
      ? title.substring(0, APP_TASK_LABEL_TRUNCATE_LEN) + '...'
      : title;
  WindoesApp.state.dispatch({
    type: 'APP_SET_PAGE',
    title,
    taskLabel: shortTitle,
    status: 'Opening...',
  });
  // Set dynamic iframe src before opening
  WindoesApp.WindowManager.get('app').iframeSrc = url;
  appFrame.src = url;
  openWindowBoilerplate('app');
  WindoesApp.ui.setBodyLoading?.(true);
}

function onAppFrameLoad() {
  WindoesApp.state.dispatch({ type: 'APP_SET_STATUS', status: 'Done' });
  WindoesApp.ui.setBodyLoading?.(false);
}

// ══════════════════════════════════════════════
// Winamp Window
// ══════════════════════════════════════════════
const winampConfig = WindoesApp.WindowManager.register('winamp', {
  template: {
    id: 'winampWindow',
    ariaLabel: 'Winamp',
    title: 'Winamp',
    style:
      'left: 200px; top: 50px; width: 275px; height: 369px; min-width: unset; min-height: unset;',
    view: (
      <>
        <div>
          <div className="headless-drag-handle"></div>
          <button className="headless-close-btn" aria-label="Close">
            ×
          </button>
        </div>
        <iframe
          id="winampFrame"
          title="Winamp"
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin"
          allow="autoplay"
        ></iframe>
      </>
    ),
    useSharedWindowComponent: true,
  },
  taskButton: { id: 'winampTaskBtn', icon: 'task-icon-winamp', label: 'Winamp' },
  iframeId: 'winampFrame',
  iframeSrc: './applications/winamp-player/index.html',
  headless: true,
  draggable: false,
  setup(config) {
    const releaseMessageListener = retainAppMessageListener();
    const handle = config.el.querySelector('.headless-drag-handle');
    const closeBtn = config.el.querySelector('.headless-close-btn');
    const disposeDrag = makeDraggable(handle, config.el);

    const onCloseClick = () => WindoesApp.WindowManager.close('winamp');
    closeBtn.addEventListener('click', onCloseClick);

    return () => {
      closeBtn.removeEventListener('click', onCloseClick);
      if (typeof disposeDrag === 'function') disposeDrag();
      releaseMessageListener();
    };
  },
});

function openWinamp() {
  openWindowBoilerplate('winamp');
}

// ══════════════════════════════════════════════
// Minesweeper Window
// ══════════════════════════════════════════════
const minesweeperConfig = WindoesApp.WindowManager.register('minesweeper', {
  template: {
    id: 'minesweeperWindow',
    ariaLabel: 'Minesweeper',
    title: 'Minesweeper',
    titleIcon: 'titlelogo-minesweeper',
    titlebarId: 'minesweeperTitlebar',
    minimizeBtnId: 'minesweeperMinBtn',
    closeBtnId: 'minesweeperCloseBtn',
    style:
      'left: 250px; top: 80px; width: 260px; height: 280px; min-width: unset; min-height: unset;',
    view: (
      <iframe
        id="minesweeperFrame"
        title="Minesweeper"
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin"
      ></iframe>
    ),
    useSharedWindowComponent: true,
    resizable: false,
  },
  taskButton: { id: 'minesweeperTaskBtn', icon: 'task-icon-minesweeper', label: 'Minesweeper' },
  iframeId: 'minesweeperFrame',
  iframeSrc: './applications/minesweeper/index.html',
  hasChrome: false,
  setup: retainAppMessageListener,
});

function openMinesweeper() {
  openWindowBoilerplate('minesweeper');
}

// ══════════════════════════════════════════════
// Solitaire Window
// ══════════════════════════════════════════════
const solitaireConfig = WindoesApp.WindowManager.register('solitaire', {
  template: {
    id: 'solitaireWindow',
    ariaLabel: 'Solitaire',
    title: 'Solitaire',
    titleIcon: 'titlelogo-solitaire',
    titlebarId: 'solitaireTitlebar',
    minimizeBtnId: 'solitaireMinBtn',
    closeBtnId: 'solitaireCloseBtn',
    style:
      'left: 180px; top: 40px; width: 700px; height: 540px; min-width: unset; min-height: unset;',
    view: (
      <iframe
        id="solitaireFrame"
        title="Solitaire"
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin"
      ></iframe>
    ),
    useSharedWindowComponent: true,
    resizable: false,
  },
  taskButton: { id: 'solitaireTaskBtn', icon: 'task-icon-solitaire', label: 'Solitaire' },
  iframeId: 'solitaireFrame',
  iframeSrc: './applications/solitaire/index.html',
  hasChrome: false,
  setup: retainAppMessageListener,
});

function openSolitaire() {
  openWindowBoilerplate('solitaire');
}

// ══════════════════════════════════════════════
// Paint Window
// ══════════════════════════════════════════════
const paintConfig = WindoesApp.WindowManager.register('paint', {
  template: {
    id: 'paintWindow',
    ariaLabel: 'Paint',
    title: <PaintTitleText />,
    titleIcon: 'titlelogo-paint',
    titleSpanId: 'paintWindowTitle',
    titlebarId: 'paintTitlebar',
    minimizeBtnId: 'paintMinBtn',
    closeBtnId: 'paintCloseBtn',
    style:
      'left: 160px; top: 40px; width: 620px; height: 480px; min-width: unset; min-height: unset;',
    view: (
      <iframe
        id="paintFrame"
        title="Paint"
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin allow-downloads allow-modals"
      ></iframe>
    ),
    useSharedWindowComponent: true,
  },
  taskButton: {
    id: 'paintTaskBtn',
    icon: 'task-icon-paint',
    label: <PaintTaskLabel />,
    labelId: 'paintTaskLabel',
  },
  iframeId: 'paintFrame',
  iframeSrc: './applications/paint/index.html',
  hasChrome: false,
  setup: retainAppMessageListener,
});

function buildPaintSrc(filePath = '') {
  const base = './applications/paint/index.html';
  if (!filePath) return base;

  const params = new URLSearchParams({ filePath });
  return `${base}?${params.toString()}`;
}

function openPaint(options = {}) {
  const { filePath = '' } = options;
  const config = WindoesApp.WindowManager.get('paint');
  const nextSrc = buildPaintSrc(filePath);
  config.iframeSrc = nextSrc;

  const isAlreadyOpen = !!WindoesApp.state.get().windows?.byId?.paint?.open;
  if (isAlreadyOpen && config.iframe) {
    config.iframe.src = nextSrc;
    WindoesApp.WindowManager.bringToFront('paint');
    closeStartMenuBoilerplate();
    return;
  }

  openWindowBoilerplate('paint');
}

function resizeWindowFromIframe(config, width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return;
  }

  const titlebarHeight = config.el.querySelector('.titlebar')?.offsetHeight || 0;
  config.el.style.width = width + VIEW_BORDER_PX + 'px';
  config.el.style.height = height + titlebarHeight + VIEW_BORDER_PX + 'px';
}

const winampFrame = winampConfig.el.querySelector('#winampFrame');
const minesweeperFrame = minesweeperConfig.el.querySelector('#minesweeperFrame');
const solitaireFrame = solitaireConfig.el.querySelector('#solitaireFrame');
const paintFrame = paintConfig.el.querySelector('#paintFrame');
const paintFs = new VirtualFS();

async function ensureDir(path) {
  if (!(await paintFs.exists(path))) {
    await paintFs.mkdir(path);
  }
}

const ensurePaintFs = once(async () => {
  await paintFs.init();
  await ensureDir('/C:');
  await ensureDir('/C:/My Documents');
});

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Unable to read blob.'));
    reader.readAsDataURL(blob);
  });
}

function isAllowedMessageSource(source) {
  if (!source) return false;
  return [appFrame, winampFrame, minesweeperFrame, solitaireFrame, paintFrame].some(
    (iframe) => iframe?.contentWindow === source
  );
}

function isTrustedMessageEvent(e) {
  if (!isAllowedMessageSource(e.source)) return false;
  return e.origin === window.location.origin;
}

function onAppMessage(e) {
  if (!isTrustedMessageEvent(e) || !e.data) return;

  if (e.data.type === 'winamp-close') {
    WindoesApp.WindowManager.close('winamp');
  }
  if (e.data.type === 'winamp-resize' && e.data.width > 0 && e.data.height > 0) {
    const winampWindow = winampConfig.el;
    winampWindow.style.width = e.data.width + 'px';
    winampWindow.style.height = e.data.height + 'px';
  }
  if (e.data.type === 'minesweeper-resize') {
    resizeWindowFromIframe(minesweeperConfig, e.data.width, e.data.height);
  }
  if (e.data.type === 'solitaire-resize') {
    resizeWindowFromIframe(solitaireConfig, e.data.width, e.data.height);
  }
  if (e.data.type === 'paint-resize') {
    resizeWindowFromIframe(paintConfig, e.data.width, e.data.height);
  }
  if (e.data.type === 'paint-close') {
    WindoesApp.WindowManager.close('paint');
  }
  if (e.data.type === 'paint-title') {
    const title =
      typeof e.data.title === 'string' && e.data.title ? e.data.title : 'untitled - Paint';
    const taskLabel =
      title.length > APP_TASK_LABEL_MAX_LEN
        ? title.substring(0, APP_TASK_LABEL_TRUNCATE_LEN) + '...'
        : title;
    WindoesApp.state.dispatch({ type: 'PAINT_SET_TITLE', title, taskLabel });
  }
  if (e.data.type === 'paint-vfs-save') {
    const requestId = e.data.requestId;
    Promise.resolve()
      .then(async () => {
        await ensurePaintFs();
        const dataUrl = String(e.data.dataUrl || '');
        const path = String(e.data.path || '').trim();
        if (!path) throw new Error('A file path is required.');
        if (!dataUrl.startsWith('data:image/png;base64,')) {
          throw new Error('Paint only supports PNG data.');
        }
        const blob = await fetch(dataUrl).then((r) => r.blob());
        await paintFs.writeFile(path, blob);
        return { ok: true, path };
      })
      .catch((error) => ({ ok: false, error: error?.message || String(error) }))
      .then((result) => {
        e.source?.postMessage({ type: 'paint-vfs-save-result', requestId, ...result }, e.origin);
      });
  }
  if (e.data.type === 'paint-request-file-path') {
    const requestId = e.data.requestId;
    Promise.resolve()
      .then(async () => {
        const openChooser = WindoesApp.fileChooser && WindoesApp.fileChooser.open;
        if (typeof openChooser !== 'function') {
          throw new Error('File chooser is not available.');
        }
        const mode = e.data.mode === 'open' ? 'open' : 'save';
        const path = await openChooser({
          mode,
          title: e.data.title || (mode === 'open' ? 'Open' : 'Save As'),
          confirmLabel: e.data.confirmLabel || (mode === 'open' ? 'Open' : 'Save'),
          startPath: e.data.defaultPath || '/C:/My Documents/untitled.png',
          extensions: ['.png'],
          defaultExtension: '.png',
          allowCreateFolder: mode !== 'open',
        });
        return { ok: true, path: path || null };
      })
      .catch((error) => ({ ok: false, error: error?.message || String(error) }))
      .then((result) => {
        e.source?.postMessage(
          { type: 'paint-request-file-path-result', requestId, ...result },
          e.origin
        );
      });
  }
  if (e.data.type === 'paint-vfs-load') {
    const requestId = e.data.requestId;
    Promise.resolve()
      .then(async () => {
        await ensurePaintFs();
        const path = String(e.data.path || '').trim();
        if (!path) throw new Error('A file path is required.');
        const content = await paintFs.readFile(path);
        if (!(content instanceof Blob)) {
          throw new Error('Selected file is not an image blob.');
        }
        const dataUrl = await blobToDataUrl(content);
        return { ok: true, path, dataUrl };
      })
      .catch((error) => ({ ok: false, error: error?.message || String(error) }))
      .then((result) => {
        e.source?.postMessage({ type: 'paint-vfs-load-result', requestId, ...result }, e.origin);
      });
  }
}

let appMessageListenerRefs = 0;

function retainAppMessageListener() {
  if (appMessageListenerRefs === 0) {
    window.addEventListener('message', onAppMessage);
  }
  appMessageListenerRefs += 1;

  return () => {
    appMessageListenerRefs = Math.max(0, appMessageListenerRefs - 1);
    if (appMessageListenerRefs === 0) {
      window.removeEventListener('message', onAppMessage);
    }
  };
}

// Register on shared namespace
WindoesApp.open.app = openApp;
WindoesApp.open.winamp = openWinamp;
WindoesApp.open.minesweeper = openMinesweeper;
WindoesApp.open.solitaire = openSolitaire;
WindoesApp.open.paint = openPaint;

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    appMessageListenerRefs = 0;
    window.removeEventListener('message', onAppMessage);
  });
}
