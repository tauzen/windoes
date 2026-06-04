// ══════════════════════════════════════════════
// IE Window
// ══════════════════════════════════════════════
import WindoesApp from './app-state.js';
import { openWindowBoilerplate } from './launch-helpers.js';
import { normalizeBrowserUrl } from './browser-url.mjs';
import {
  IE_LOADING_INDICATOR_MS,
  IE_TASK_LABEL_MAX_LEN,
  IE_TASK_LABEL_TRUNCATE_LEN,
} from './constants.js';

// Title, status, and task-button label render reactively from the canonical
// `browser` slice instead of imperative `textContent` writes.
function IeTitleText() {
  return <>{WindoesApp.state.use((s) => s.browser.title)}</>;
}

function IeStatusText() {
  return <>{WindoesApp.state.use((s) => s.browser.status)}</>;
}

function IeTaskLabel() {
  return <>{WindoesApp.state.use((s) => s.browser.taskLabel)}</>;
}

// Register IE shell window with JSX-rendered chrome
const ieConfig = WindoesApp.WindowManager.register('ie', {
  template: {
    id: 'ieWindow',
    ariaLabel: 'Internet Explorer window',
    title: <IeTitleText />,
    titleLogoClass: 'title-logo',
    titleSpanId: 'windowTitle',
    titlebarId: 'titlebar',
    minimizeBtnId: 'minimizeBtn',
    maximizeBtnId: 'maximizeIeBtn',
    closeBtnId: 'closeWindowBtn',
    menubar: ['File', 'Edit', 'View', 'Favorites', 'Tools', 'Help'],
    toolbar: (
      <>
        <div className="toolbar">
          <div className="toolbar-grip"></div>
          <button className="tb-btn" id="backBtn">
            <span className="tb-icon tb-icon-back"></span>Back
          </button>
          <button className="tb-btn" id="forwardBtn">
            <span className="tb-icon tb-icon-forward"></span>Forward
          </button>
          <button className="tb-btn" id="stopBtn">
            <span className="tb-icon tb-icon-stop"></span>Stop
          </button>
          <button className="tb-btn" id="refreshBtn">
            <span className="tb-icon tb-icon-refresh"></span>Refresh
          </button>
          <button className="tb-btn" id="homeBtn">
            <span className="tb-icon tb-icon-home"></span>Home
          </button>
          <div className="tb-sep"></div>
          <button className="tb-btn" id="searchBtn">
            <span className="tb-icon tb-icon-search"></span>Search
          </button>
          <button className="tb-btn" id="favoritesBtn">
            <span className="tb-icon tb-icon-favorites"></span>Favorites
          </button>
          <button className="tb-btn" id="historyBtn">
            <span className="tb-icon tb-icon-history"></span>History
          </button>
        </div>
        <div className="address-row">
          <div className="toolbar-grip"></div>
          <label htmlFor="addressInput">Address</label>
          <div className="address-input-wrap">
            <span className="address-icon" aria-hidden="true"></span>
            <input id="addressInput" defaultValue="about:blank" aria-label="Address bar" />
          </div>
          <button className="go-btn" id="goBtn">
            Go
          </button>
        </div>
      </>
    ),
    view: (
      <iframe
        id="browserFrame"
        title="Internet Explorer content"
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin"
      ></iframe>
    ),
    statusBar: (
      <>
        <span className="status-left" id="statusText">
          <IeStatusText />
        </span>
        <span className="status-right">
          <span className="status-icon"></span>Internet
        </span>
      </>
    ),
    useSharedWindowComponent: true,
  },
  taskButton: { id: 'taskButton', icon: 'task-icon-ie', label: <IeTaskLabel /> },
  iframe: null, // IE manages its own iframe/navigation
  iframeSrc: null,
  hasChrome: true,
  setup: setupIEWindowListeners,
});

// Get references to elements within the generated window
const frame = ieConfig.el.querySelector('#browserFrame');
const addressInput = ieConfig.el.querySelector('#addressInput');

const homePage = 'https://example.com';
let bodyLoadingTimeoutId = null;

// Browser history lives in the canonical store (`state.browser`), not in
// module-level variables. These helpers keep the call sites terse.
function getHistory() {
  return WindoesApp.state.get().browser;
}

function formatBrowserTitle(url) {
  return url + ' - Microsoft Internet Explorer';
}

function navigate(url, pushHistory = true) {
  const finalUrl = normalizeBrowserUrl(url, homePage);
  body_loading(true);

  if (finalUrl === 'about:blank') {
    frame.src = '';
    frame.removeAttribute('src');
  } else {
    frame.src = finalUrl;
  }

  addressInput.value = finalUrl;
  const title = formatBrowserTitle(finalUrl);
  const shortTitle =
    title.length > IE_TASK_LABEL_MAX_LEN
      ? title.substring(0, IE_TASK_LABEL_TRUNCATE_LEN) + '...'
      : title;

  WindoesApp.state.dispatch({
    type: 'BROWSER_SET_PAGE',
    title,
    taskLabel: shortTitle,
    status: 'Opening page...',
  });

  if (pushHistory) {
    WindoesApp.state.dispatch({ type: 'BROWSER_NAVIGATE', url: finalUrl });
  }
}

function body_loading(on) {
  if (bodyLoadingTimeoutId) {
    window.clearTimeout(bodyLoadingTimeoutId);
    bodyLoadingTimeoutId = null;
  }

  if (on) {
    document.body.classList.add('loading');
    bodyLoadingTimeoutId = window.setTimeout(() => {
      document.body.classList.remove('loading');
      bodyLoadingTimeoutId = null;
    }, IE_LOADING_INDICATOR_MS);
  } else {
    document.body.classList.remove('loading');
  }
}

function openInternetExplorer() {
  openWindowBoilerplate('ie');

  if (!frame.src || frame.src === 'about:blank' || frame.src === '') {
    if (getHistory().historyStack.length === 0) {
      navigate('about:blank');
    }
  }
}

function onGoClick() {
  navigate(addressInput.value);
}

function onAddressKeyDown(e) {
  if (e.key === 'Enter') navigate(addressInput.value);
}

function onHomeClick() {
  navigate(homePage);
}

function onRefreshClick() {
  WindoesApp.state.dispatch({ type: 'BROWSER_SET_STATUS', status: 'Refreshing...' });
  if (addressInput.value && addressInput.value !== 'about:blank') {
    frame.src = addressInput.value;
  }
}

function onStopClick() {
  try {
    frame.contentWindow?.stop?.();
  } catch {
    // Ignore cross-origin stop errors.
  }
  WindoesApp.state.dispatch({ type: 'BROWSER_SET_STATUS', status: 'Stopped' });
}

function onSearchClick() {
  navigate('https://www.google.com');
}

function onFavoritesClick() {
  WindoesApp.bsod.showErrorDialog({
    title: 'Favorites',
    text: 'Favorites\n\n• https://example.com\n• https://archive.org\n• https://wikipedia.org',
    icon: 'info',
  });
}

function onHistoryClick() {
  const { historyStack, historyIndex } = getHistory();
  if (historyStack.length === 0) {
    WindoesApp.bsod.showErrorDialog({
      title: 'History',
      text: 'History is empty.',
      icon: 'info',
    });
  } else {
    WindoesApp.bsod.showErrorDialog({
      title: 'History',
      text:
        'History\n\n' +
        historyStack.map((u, i) => (i === historyIndex ? '▶ ' : '  ') + u).join('\n'),
      icon: 'info',
    });
  }
}

function onBackClick() {
  const { historyStack, historyIndex } = getHistory();
  if (historyIndex > 0) {
    const targetUrl = historyStack[historyIndex - 1];
    WindoesApp.state.dispatch({ type: 'BROWSER_BACK' });
    navigate(targetUrl, false);
  }
}

function onForwardClick() {
  const { historyStack, historyIndex } = getHistory();
  if (historyIndex < historyStack.length - 1) {
    const targetUrl = historyStack[historyIndex + 1];
    WindoesApp.state.dispatch({ type: 'BROWSER_FORWARD' });
    navigate(targetUrl, false);
  }
}

function onFrameLoad() {
  WindoesApp.state.dispatch({ type: 'BROWSER_SET_STATUS', status: 'Done' });
  body_loading(false);
}

const goBtn = ieConfig.el.querySelector('#goBtn');
const homeBtn = ieConfig.el.querySelector('#homeBtn');
const refreshBtn = ieConfig.el.querySelector('#refreshBtn');
const stopBtn = ieConfig.el.querySelector('#stopBtn');
const searchBtn = ieConfig.el.querySelector('#searchBtn');
const favoritesBtn = ieConfig.el.querySelector('#favoritesBtn');
const historyBtn = ieConfig.el.querySelector('#historyBtn');
const backBtn = ieConfig.el.querySelector('#backBtn');
const forwardBtn = ieConfig.el.querySelector('#forwardBtn');

function setupIEWindowListeners() {
  goBtn.addEventListener('click', onGoClick);
  addressInput.addEventListener('keydown', onAddressKeyDown);
  homeBtn.addEventListener('click', onHomeClick);
  refreshBtn.addEventListener('click', onRefreshClick);
  stopBtn.addEventListener('click', onStopClick);
  searchBtn.addEventListener('click', onSearchClick);
  favoritesBtn.addEventListener('click', onFavoritesClick);
  historyBtn.addEventListener('click', onHistoryClick);
  backBtn.addEventListener('click', onBackClick);
  forwardBtn.addEventListener('click', onForwardClick);
  frame.addEventListener('load', onFrameLoad);

  return cleanupIEWindowListeners;
}

function cleanupIEWindowListeners() {
  goBtn.removeEventListener('click', onGoClick);
  addressInput.removeEventListener('keydown', onAddressKeyDown);
  homeBtn.removeEventListener('click', onHomeClick);
  refreshBtn.removeEventListener('click', onRefreshClick);
  stopBtn.removeEventListener('click', onStopClick);
  searchBtn.removeEventListener('click', onSearchClick);
  favoritesBtn.removeEventListener('click', onFavoritesClick);
  historyBtn.removeEventListener('click', onHistoryClick);
  backBtn.removeEventListener('click', onBackClick);
  forwardBtn.removeEventListener('click', onForwardClick);
  frame.removeEventListener('load', onFrameLoad);
  body_loading(false);
}

// Register on shared namespace
WindoesApp.open.internetExplorer = openInternetExplorer;
WindoesApp.browser.navigate = navigate;
WindoesApp.ui.setBodyLoading = body_loading;
