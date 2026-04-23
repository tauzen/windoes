// ══════════════════════════════════════════════
// IE Window
// ══════════════════════════════════════════════
import WindoesApp from './app-state.js';
import { openWindowBoilerplate } from './launch-helpers.js';
import { normalizeBrowserUrl } from './browser-url.mjs';

// Register IE shell window with JSX-rendered chrome
const ieConfig = WindoesApp.WindowManager.register('ie', {
  template: {
    id: 'ieWindow',
    ariaLabel: 'Internet Explorer window',
    title: 'about:blank - Microsoft Internet Explorer',
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
          Done
        </span>
        <span className="status-right">
          <span className="status-icon"></span>Internet
        </span>
      </>
    ),
    useSharedWindowComponent: true,
  },
  taskButton: { id: 'taskButton', icon: 'task-icon-ie', label: 'about:blank - Microsoft Int...' },
  iframe: null, // IE manages its own iframe/navigation
  iframeSrc: null,
  hasChrome: true,
});

// Get references to elements within the generated window
const frame = ieConfig.el.querySelector('#browserFrame');
const addressInput = ieConfig.el.querySelector('#addressInput');
const statusText = ieConfig.el.querySelector('#statusText');
const windowTitle = ieConfig.el.querySelector('#windowTitle');
const taskButtonLabel = ieConfig.taskBtn.querySelector('span:last-child');

const historyStack = [];
let historyIndex = -1;
const homePage = 'https://example.com';
let bodyLoadingTimeoutId = null;

function formatBrowserTitle(url) {
  return url + ' - Microsoft Internet Explorer';
}

function navigate(url, pushHistory = true) {
  const finalUrl = normalizeBrowserUrl(url, homePage);
  statusText.textContent = 'Opening page...';
  body_loading(true);

  if (finalUrl === 'about:blank') {
    frame.src = '';
    frame.removeAttribute('src');
  } else {
    frame.src = finalUrl;
  }

  addressInput.value = finalUrl;
  const title = formatBrowserTitle(finalUrl);
  windowTitle.textContent = title;

  const shortTitle = title.length > 30 ? title.substring(0, 28) + '...' : title;
  taskButtonLabel.textContent = shortTitle;

  if (pushHistory) {
    historyStack.splice(historyIndex + 1);
    historyStack.push(finalUrl);
    historyIndex = historyStack.length - 1;
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
    }, 2000);
  } else {
    document.body.classList.remove('loading');
  }
}

function openInternetExplorer() {
  openWindowBoilerplate('ie');

  if (!frame.src || frame.src === 'about:blank' || frame.src === '') {
    if (historyStack.length === 0) {
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
  statusText.textContent = 'Refreshing...';
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
  statusText.textContent = 'Stopped';
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
  if (historyIndex > 0) {
    historyIndex -= 1;
    navigate(historyStack[historyIndex], false);
  }
}

function onForwardClick() {
  if (historyIndex < historyStack.length - 1) {
    historyIndex += 1;
    navigate(historyStack[historyIndex], false);
  }
}

function onFrameLoad() {
  statusText.textContent = 'Done';
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

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cleanupIEWindowListeners();
  });
}

// Register on shared namespace
WindoesApp.open.internetExplorer = openInternetExplorer;
WindoesApp.browser.navigate = navigate;
WindoesApp.ui.setBodyLoading = body_loading;
