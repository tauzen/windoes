// ══════════════════════════════════════════════
// App Window (experiment apps)
// ══════════════════════════════════════════════
// Every app frame is sandboxed without `allow-same-origin`, so the app runs in
// an opaque origin: it cannot read the shell's DOM or storage, or call into
// `WindoesApp`. It reaches the shell only through the messages that
// `onAppMessage` validates (sender frame identity, origin "null").
import WindoesApp from './app-state.js';
import { makeDraggable } from './dragging.js';
import { closeStartMenuBoilerplate, openWindowBoilerplate } from './launch-helpers.js';
import {
  APP_TASK_LABEL_MAX_LEN,
  APP_TASK_LABEL_TRUNCATE_LEN,
  VIEW_BORDER_PX,
} from './constants.js';
import { VirtualFS, normalizePath } from './virtual-fs.js';
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
        sandbox="allow-scripts"
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
          sandbox="allow-scripts"
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
        sandbox="allow-scripts"
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
        sandbox="allow-scripts"
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
// Minecraft Window
// ══════════════════════════════════════════════
// The Minecraft iframe sizes itself to whatever the window provides (its
// canvas resyncs every frame), so the window stays resizable and maximizable.
WindoesApp.WindowManager.register('minecraft', {
  template: {
    id: 'minecraftWindow',
    ariaLabel: 'Minecraft',
    title: 'Minecraft',
    titleIcon: 'titlelogo-minecraft',
    titlebarId: 'minecraftTitlebar',
    minimizeBtnId: 'minecraftMinBtn',
    maximizeBtn: true,
    closeBtnId: 'minecraftCloseBtn',
    style:
      'left: 120px; top: 24px; width: 740px; height: 574px; min-width: unset; min-height: unset;',
    view: (
      <iframe
        id="minecraftFrame"
        title="Minecraft"
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-pointer-lock"
      ></iframe>
    ),
    useSharedWindowComponent: true,
  },
  taskButton: { id: 'minecraftTaskBtn', icon: 'task-icon-minecraft', label: 'Minecraft' },
  iframeId: 'minecraftFrame',
  iframeSrc: './applications/minecraft/index.html',
  hasChrome: false,
});

function openMinecraft() {
  openWindowBoilerplate('minecraft');
}

// ══════════════════════════════════════════════
// VirtualBoks Window
// ══════════════════════════════════════════════
// The guest console is whatever size the guest picks, so the window stays
// resizable and maximizable and VirtualBoks scrolls its own console pane.
// `allow-downloads` is what lets the Screenshot button hand over a PNG, and
// `allow-forms` lets the New/Settings dialog submit (its handler stays in the
// frame; the opaque origin keeps the submission away from the shell).
const virtualboksConfig = WindoesApp.WindowManager.register('virtualboks', {
  template: {
    id: 'virtualboksWindow',
    ariaLabel: 'VirtualBoks',
    title: 'VirtualBoks',
    titleIcon: 'titlelogo-virtualboks',
    titlebarId: 'virtualboksTitlebar',
    minimizeBtnId: 'virtualboksMinBtn',
    maximizeBtn: true,
    closeBtnId: 'virtualboksCloseBtn',
    style:
      'left: 140px; top: 32px; width: 720px; height: 520px; min-width: unset; min-height: unset;',
    view: (
      <iframe
        id="virtualboksFrame"
        title="VirtualBoks"
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-downloads allow-forms"
      ></iframe>
    ),
    useSharedWindowComponent: true,
  },
  taskButton: {
    id: 'virtualboksTaskBtn',
    icon: 'task-icon-virtualboks',
    label: 'VirtualBoks',
  },
  iframeId: 'virtualboksFrame',
  iframeSrc: './applications/virtualboks/index.html',
  hasChrome: false,
  setup: retainAppMessageListener,
});

function openVirtualBoks() {
  openWindowBoilerplate('virtualboks');
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
        sandbox="allow-scripts allow-downloads allow-modals"
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
  onClose: () => paintFileGrants.clear(),
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

  // A new Paint document starts a new session: it may reach only the file it
  // was opened with (picked in Explorer) until the user chooses another.
  paintFileGrants.clear();
  if (filePath) grantPaintFile(filePath, 'open');

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
const virtualboksFrame = virtualboksConfig.el.querySelector('#virtualboksFrame');
const paintFs = new VirtualFS();

// Paint may load or save only files the user picked for the current Paint
// session, so code in the Paint frame cannot reach the rest of the VFS.
// Normalized path -> true when the path may be loaded (picked to open), false
// when it may only be saved (picked as a Save As target). Any grant allows a
// save, so re-saving an opened file works.
const paintFileGrants = new Map();

function paintGrantKey(path) {
  const trimmed = String(path || '').trim();
  if (!trimmed) throw new Error('A file path is required.');
  return normalizePath(trimmed);
}

function grantPaintFile(path, mode) {
  const key = paintGrantKey(path);
  paintFileGrants.set(key, mode === 'open' || paintFileGrants.get(key) === true);
}

function requirePaintGrant(path, mode) {
  const key = paintGrantKey(path);
  const canLoad = paintFileGrants.get(key);
  if (canLoad === undefined || (mode === 'open' && !canLoad)) {
    throw new Error(
      mode === 'open'
        ? 'Paint can only open a file chosen in the Open dialog.'
        : 'Paint can only save to a file chosen in the Open or Save As dialog.'
    );
  }
  return key;
}

function isPaintFrameSource(source) {
  return !!source && paintFrame?.contentWindow === source;
}

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

// Frames whose messages the shell handles. Minecraft sends none.
const messagingFrames = [
  appFrame,
  winampFrame,
  minesweeperFrame,
  solitaireFrame,
  paintFrame,
  virtualboksFrame,
];

function frameOfSource(source) {
  if (!source) return null;
  return messagingFrames.find((iframe) => iframe?.contentWindow === source) || null;
}

// The sender is identified by its window (`e.source`), never by the payload.
// App frames have an opaque origin, so their messages carry origin "null";
// anything else did not come from a sandboxed app document.
function isTrustedMessageEvent(e) {
  return e.origin === 'null' && !!frameOfSource(e.source);
}

// Replies go to the sender window that `isTrustedMessageEvent` verified. Its
// origin is opaque and postMessage cannot target "null", so the target is '*'.
function replyToApp(e, message, transfer = []) {
  e.source?.postMessage(message, { targetOrigin: '*', transfer });
}

function errorResult(error) {
  return { ok: false, error: error?.message || String(error) };
}

// Apps that keep saved state cannot use storage in an opaque origin, so the
// shell keeps it for them. Each app owns one key in the shell's localStorage:
// the key it used before it was sandboxed, so existing saved state carries
// over. The app is the one the shell loaded into the sending frame; a request
// must name that app's key and reaches no other.
const APP_STORAGE_KEYS = {
  'ascii-runner': 'asciiRunnerHighScore',
  minesweeper: 'ms_best',
  virtualboks: 'virtualboks.machines.v1',
};

function storageKeyForFrame(iframe) {
  let url;
  try {
    url = new URL(iframe.src);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) return null;
  const app = /\/applications\/([^/]+)\/[^/]*$/.exec(url.pathname)?.[1];
  return app && Object.hasOwn(APP_STORAGE_KEYS, app) ? APP_STORAGE_KEYS[app] : null;
}

function handleAppStorage(e, iframe) {
  const { type, requestId, key, value } = e.data;
  let result;
  try {
    const ownKey = storageKeyForFrame(iframe);
    if (!ownKey || key !== ownKey) {
      throw new Error('This app has no saved state under that key.');
    }
    if (type === 'app-storage-load') {
      result = { ok: true, value: localStorage.getItem(ownKey) };
    } else {
      if (typeof value !== 'string') throw new Error('Saved state must be a string.');
      localStorage.setItem(ownKey, value);
      result = { ok: true };
    }
  } catch (error) {
    result = errorResult(error);
  }
  replyToApp(e, { type: `${type}-result`, requestId, ...result });
}

// The remote-track Worker accepts requests only from the shell's origin, so
// the shell signs and downloads a track for the Winamp frame and hands over
// the bytes. Only keys in the shell's own copy of the manifest are fetched,
// so the frame cannot use the shell to fetch arbitrary URLs.
const loadWinampManifest = once(async () => {
  const res = await fetch('./applications/winamp-player/tracks.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`tracks.json request failed: ${res.status}`);
  return res.json();
});

async function fetchWinampTrack(key) {
  const manifest = await loadWinampManifest();
  const endpoint = String(manifest?.signEndpoint || '').replace(/\/+$/, '');
  const listed =
    Array.isArray(manifest?.tracks) && manifest.tracks.some((track) => track?.key === key);
  if (!endpoint || !key || !listed) throw new Error('Unknown track.');

  const signRes = await fetch(`${endpoint}/sign?key=${encodeURIComponent(key)}`, {
    credentials: 'omit',
  });
  if (!signRes.ok) throw new Error(`sign request failed: ${signRes.status}`);
  const { url } = await signRes.json();
  const trackRes = await fetch(url, { credentials: 'omit' });
  if (!trackRes.ok) throw new Error(`track request failed: ${trackRes.status}`);
  return {
    buffer: await trackRes.arrayBuffer(),
    mimeType: trackRes.headers.get('Content-Type') || 'audio/mpeg',
  };
}

function handleWinampTrackFetch(e) {
  const requestId = e.data.requestId;
  const type = 'winamp-track-fetch-result';
  fetchWinampTrack(e.data.key).then(
    ({ buffer, mimeType }) =>
      replyToApp(e, { type, requestId, ok: true, buffer, mimeType }, [buffer]),
    (error) => replyToApp(e, { type, requestId, ...errorResult(error) })
  );
}

function onAppMessage(e) {
  if (!isTrustedMessageEvent(e) || !e.data) return;
  const iframe = frameOfSource(e.source);

  if (e.data.type === 'app-storage-load' || e.data.type === 'app-storage-save') {
    handleAppStorage(e, iframe);
  }
  if (e.data.type === 'winamp-track-fetch' && iframe === winampFrame) {
    handleWinampTrackFetch(e);
  }
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
  if (e.data.type === 'paint-vfs-save' && isPaintFrameSource(e.source)) {
    const requestId = e.data.requestId;
    Promise.resolve()
      .then(async () => {
        const path = requirePaintGrant(e.data.path, 'save');
        await ensurePaintFs();
        const dataUrl = String(e.data.dataUrl || '');
        if (!dataUrl.startsWith('data:image/png;base64,')) {
          throw new Error('Paint only supports PNG data.');
        }
        const blob = await fetch(dataUrl).then((r) => r.blob());
        await paintFs.writeFile(path, blob);
        return { ok: true, path };
      })
      .catch(errorResult)
      .then((result) => {
        replyToApp(e, { type: 'paint-vfs-save-result', requestId, ...result });
      });
  }
  if (e.data.type === 'paint-request-file-path' && isPaintFrameSource(e.source)) {
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
        if (path) grantPaintFile(path, mode);
        return { ok: true, path: path || null };
      })
      .catch(errorResult)
      .then((result) => {
        replyToApp(e, { type: 'paint-request-file-path-result', requestId, ...result });
      });
  }
  if (e.data.type === 'paint-vfs-load' && isPaintFrameSource(e.source)) {
    const requestId = e.data.requestId;
    Promise.resolve()
      .then(async () => {
        const path = requirePaintGrant(e.data.path, 'open');
        await ensurePaintFs();
        const content = await paintFs.readFile(path);
        if (!(content instanceof Blob)) {
          throw new Error('Selected file is not an image blob.');
        }
        const dataUrl = await blobToDataUrl(content);
        return { ok: true, path, dataUrl };
      })
      .catch(errorResult)
      .then((result) => {
        replyToApp(e, { type: 'paint-vfs-load-result', requestId, ...result });
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
WindoesApp.open.minecraft = openMinecraft;
WindoesApp.open.paint = openPaint;
WindoesApp.open.virtualboks = openVirtualBoks;

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    appMessageListenerRefs = 0;
    window.removeEventListener('message', onAppMessage);
  });
}
