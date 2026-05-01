// ══════════════════════════════════════════════
// App Window (experiment apps)
// ══════════════════════════════════════════════
import WindoesApp from './app-state.js';
import { makeDraggable } from './dragging.js';
import { openWindowBoilerplate } from './launch-helpers.js';
import { VIEW_BORDER_PX } from './constants.js';

const appConfig = WindoesApp.WindowManager.register('app', {
  template: {
    id: 'appWindow',
    className: 'app-window',
    ariaLabel: 'Application window',
    title: 'Application',
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
        Done
      </span>
    ),
    useSharedWindowComponent: true,
  },
  taskButton: {
    id: 'appTaskButton',
    icon: 'task-icon-app',
    label: 'Application',
    labelId: 'appTaskLabel',
  },
  iframeId: 'appFrame',
  iframeSrc: null, // set dynamically per openApp call
  hasChrome: true,
});

const appFrame = appConfig.el.querySelector('#appFrame');
const appWindowTitle = appConfig.el.querySelector('#appWindowTitle');
const appStatusText = appConfig.el.querySelector('#appStatusText');
const appTaskLabel = appConfig.taskBtn.querySelector('#appTaskLabel');
const appWindowCleanups = [];

function openApp(title, url) {
  appWindowTitle.textContent = title;
  appStatusText.textContent = 'Opening...';
  appTaskLabel.textContent = title.length > 22 ? title.substring(0, 20) + '...' : title;
  // Set dynamic iframe src before opening
  WindoesApp.WindowManager.get('app').iframeSrc = url;
  appFrame.src = url;
  openWindowBoilerplate('app');
  WindoesApp.ui.setBodyLoading?.(true);
}

function onAppFrameLoad() {
  appStatusText.textContent = 'Done';
  WindoesApp.ui.setBodyLoading?.(false);
}

appFrame.addEventListener('load', onAppFrameLoad);
appWindowCleanups.push(() => {
  appFrame.removeEventListener('load', onAppFrameLoad);
});

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
    const handle = config.el.querySelector('.headless-drag-handle');
    const closeBtn = config.el.querySelector('.headless-close-btn');
    const disposeDrag = makeDraggable(handle, config.el);

    const onCloseClick = () => WindoesApp.WindowManager.close('winamp');
    closeBtn.addEventListener('click', onCloseClick);

    return () => {
      closeBtn.removeEventListener('click', onCloseClick);
      if (typeof disposeDrag === 'function') disposeDrag();
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
  },
  taskButton: { id: 'minesweeperTaskBtn', icon: 'task-icon-minesweeper', label: 'Minesweeper' },
  iframeId: 'minesweeperFrame',
  iframeSrc: './applications/minesweeper/index.html',
  hasChrome: false,
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
  },
  taskButton: { id: 'solitaireTaskBtn', icon: 'task-icon-solitaire', label: 'Solitaire' },
  iframeId: 'solitaireFrame',
  iframeSrc: './applications/solitaire/index.html',
  hasChrome: false,
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
    title: 'untitled - Paint',
    titleIcon: 'titlelogo-paint',
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
        sandbox="allow-scripts allow-same-origin allow-downloads"
      ></iframe>
    ),
    useSharedWindowComponent: true,
  },
  taskButton: { id: 'paintTaskBtn', icon: 'task-icon-paint', label: 'untitled - Paint' },
  iframeId: 'paintFrame',
  iframeSrc: './applications/paint/index.html',
  hasChrome: false,
});

function openPaint() {
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
}

// Register on shared namespace
WindoesApp.open.app = openApp;
WindoesApp.open.winamp = openWinamp;
WindoesApp.open.minesweeper = openMinesweeper;
WindoesApp.open.solitaire = openSolitaire;
WindoesApp.open.paint = openPaint;

// Listen for app messages (resize, close)
window.addEventListener('message', onAppMessage);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    window.removeEventListener('message', onAppMessage);
    appWindowCleanups.forEach((cleanup) => cleanup());
    appWindowCleanups.length = 0;
  });
}
