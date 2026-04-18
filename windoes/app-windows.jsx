// ══════════════════════════════════════════════
// App Window (experiment apps)
// ══════════════════════════════════════════════
import WindoesApp from './app-state.js';
import { makeDraggable } from './dragging.js';
import { closeStartMenuBoilerplate } from './launch-helpers.js';
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
  WindoesApp.WindowManager.open('app');
  WindoesApp.ui.setBodyLoading?.(true);
  closeStartMenuBoilerplate();
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
  WindoesApp.WindowManager.open('winamp');
  closeStartMenuBoilerplate();
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
  WindoesApp.WindowManager.open('minesweeper');
  closeStartMenuBoilerplate();
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
  },
  taskButton: { id: 'solitaireTaskBtn', icon: 'task-icon-solitaire', label: 'Solitaire' },
  iframeId: 'solitaireFrame',
  iframeSrc: './applications/solitaire/index.html',
  hasChrome: false,
});

function openSolitaire() {
  WindoesApp.WindowManager.open('solitaire');
  closeStartMenuBoilerplate();
}

const winampFrame = winampConfig.el.querySelector('#winampFrame');
const minesweeperFrame = minesweeperConfig.el.querySelector('#minesweeperFrame');
const solitaireFrame = solitaireConfig.el.querySelector('#solitaireFrame');

function isAllowedMessageSource(source) {
  if (!source) return false;
  return [appFrame, winampFrame, minesweeperFrame, solitaireFrame].some(
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
    const minesweeperWindow = minesweeperConfig.el;
    const titlebarHeight = minesweeperConfig.el.querySelector('.titlebar').offsetHeight;
    minesweeperWindow.style.width = e.data.width + VIEW_BORDER_PX + 'px';
    minesweeperWindow.style.height = e.data.height + titlebarHeight + VIEW_BORDER_PX + 'px';
  }
  if (e.data.type === 'solitaire-resize') {
    const solitaireWindow = solitaireConfig.el;
    const titlebarHeight = solitaireConfig.el.querySelector('.titlebar').offsetHeight;
    solitaireWindow.style.width = e.data.width + VIEW_BORDER_PX + 'px';
    solitaireWindow.style.height = e.data.height + titlebarHeight + VIEW_BORDER_PX + 'px';
  }
}

// Register on shared namespace
WindoesApp.open.app = openApp;
WindoesApp.open.winamp = openWinamp;
WindoesApp.open.minesweeper = openMinesweeper;
WindoesApp.open.solitaire = openSolitaire;

// Listen for app messages (resize, close)
window.addEventListener('message', onAppMessage);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    window.removeEventListener('message', onAppMessage);
    appWindowCleanups.forEach((cleanup) => cleanup());
    appWindowCleanups.length = 0;
  });
}
