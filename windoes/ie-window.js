// ══════════════════════════════════════════════
// IE Window
// ══════════════════════════════════════════════
import WindoesApp from './app-state.js';

// Register IE with template-based DOM generation
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
        toolbar: `<div class="toolbar">
                <div class="toolbar-grip"></div>
                <button class="tb-btn" id="backBtn"><span class="tb-icon tb-icon-back"></span>Back</button>
                <button class="tb-btn" id="forwardBtn"><span class="tb-icon tb-icon-forward"></span>Forward</button>
                <button class="tb-btn" id="stopBtn"><span class="tb-icon tb-icon-stop"></span>Stop</button>
                <button class="tb-btn" id="refreshBtn"><span class="tb-icon tb-icon-refresh"></span>Refresh</button>
                <button class="tb-btn" id="homeBtn"><span class="tb-icon tb-icon-home"></span>Home</button>
                <div class="tb-sep"></div>
                <button class="tb-btn" id="searchBtn"><span class="tb-icon tb-icon-search"></span>Search</button>
                <button class="tb-btn" id="favoritesBtn"><span class="tb-icon tb-icon-favorites"></span>Favorites</button>
                <button class="tb-btn" id="historyBtn"><span class="tb-icon tb-icon-history"></span>History</button>
            </div>
            <div class="address-row">
                <div class="toolbar-grip"></div>
                <label for="addressInput">Address</label>
                <div class="address-input-wrap">
                    <span class="address-icon" aria-hidden="true"></span>
                    <input id="addressInput" value="about:blank" aria-label="Address bar" />
                </div>
                <button class="go-btn" id="goBtn">Go</button>
            </div>`,
        view: '<iframe id="browserFrame" title="Internet Explorer content" referrerpolicy="no-referrer"></iframe>',
        statusBar: '<span class="status-left" id="statusText">Done</span><span class="status-right"><span class="status-icon"></span>Internet</span>',
    },
    taskButton: { id: 'taskButton', icon: 'task-icon-ie', label: 'about:blank - Microsoft Int...' },
    iframe: null,       // IE manages its own iframe/navigation
    iframeSrc: null,
    hasChrome: true,
});

// Get references to elements within the generated window
const frame = ieConfig.el.querySelector('#browserFrame');
const addressInput = ieConfig.el.querySelector('#addressInput');
const statusText = ieConfig.el.querySelector('#statusText');
const windowTitle = ieConfig.el.querySelector('#windowTitle');
const clock = document.getElementById('clock');
const taskButtonLabel = ieConfig.taskBtn.querySelector('span:last-child');

const historyStack = [];
let historyIndex = -1;
const homePage = 'https://example.com';

function normalizeUrl(raw) {
    const trimmed = raw.trim();
    if (!trimmed) return homePage;
    if (trimmed === 'about:blank') return trimmed;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return 'https://' + trimmed;
}

function truncateTitle(url) {
    return url + ' - Microsoft Internet Explorer';
}

function navigate(url, pushHistory = true) {
    const finalUrl = normalizeUrl(url);
    statusText.textContent = 'Opening page...';
    body_loading(true);

    if (finalUrl === 'about:blank') {
        frame.src = '';
        frame.removeAttribute('src');
    } else {
        frame.src = finalUrl;
    }

    addressInput.value = finalUrl;
    const title = truncateTitle(finalUrl);
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
    if (on) {
        document.body.classList.add('loading');
        setTimeout(() => document.body.classList.remove('loading'), 2000);
    } else {
        document.body.classList.remove('loading');
    }
}

function openInternetExplorer() {
    WindoesApp.WindowManager.open('ie');
    if (WindoesApp.dom.startMenu) WindoesApp.dom.startMenu.classList.remove('open');
    WindoesApp.dom.startButton.classList.remove('pressed');
    WindoesApp.sound.playClickSound();

    if (!frame.src || frame.src === 'about:blank' || frame.src === '') {
        if (historyStack.length === 0) {
            navigate('about:blank');
        }
    }
}

function closeInternetExplorer() {
    WindoesApp.WindowManager.close('ie');
}

function updateClock() {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// Navigation buttons — query within the generated window element
ieConfig.el.querySelector('#goBtn').addEventListener('click', () => navigate(addressInput.value));
addressInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') navigate(addressInput.value); });

ieConfig.el.querySelector('#homeBtn').addEventListener('click', () => navigate(homePage));
ieConfig.el.querySelector('#refreshBtn').addEventListener('click', () => {
    statusText.textContent = 'Refreshing...';
    if (addressInput.value && addressInput.value !== 'about:blank') {
        frame.src = addressInput.value;
    }
});
ieConfig.el.querySelector('#stopBtn').addEventListener('click', () => {
    window.stop();
    statusText.textContent = 'Stopped';
});

ieConfig.el.querySelector('#searchBtn').addEventListener('click', () => {
    navigate('https://www.google.com');
});

ieConfig.el.querySelector('#favoritesBtn').addEventListener('click', () => {
    alert('Favorites\n\n\u2022 https://example.com\n\u2022 https://archive.org\n\u2022 https://wikipedia.org');
});

ieConfig.el.querySelector('#historyBtn').addEventListener('click', () => {
    if (historyStack.length === 0) {
        alert('History is empty.');
    } else {
        alert('History\n\n' + historyStack.map((u, i) => (i === historyIndex ? '\u25b6 ' : '  ') + u).join('\n'));
    }
});

ieConfig.el.querySelector('#backBtn').addEventListener('click', () => {
    if (historyIndex > 0) {
        historyIndex -= 1;
        navigate(historyStack[historyIndex], false);
    }
});

ieConfig.el.querySelector('#forwardBtn').addEventListener('click', () => {
    if (historyIndex < historyStack.length - 1) {
        historyIndex += 1;
        navigate(historyStack[historyIndex], false);
    }
});

frame.addEventListener('load', () => {
    statusText.textContent = 'Done';
    body_loading(false);
});

setInterval(updateClock, 1000);
updateClock();

// Register on shared namespace
WindoesApp.open.internetExplorer = openInternetExplorer;
WindoesApp.ie = { navigate };
WindoesApp.helpers.body_loading = body_loading;
