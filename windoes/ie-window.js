// ══════════════════════════════════════════════
// IE Window
// ══════════════════════════════════════════════
const frame = document.getElementById('browserFrame');
const ieWindow = document.getElementById('ieWindow');
const addressInput = document.getElementById('addressInput');
const statusText = document.getElementById('statusText');
const windowTitle = document.getElementById('windowTitle');
// startButton and startMenu are declared in boot.js (shared DOM refs)
const clock = document.getElementById('clock');
const internetExplorerIcon = document.getElementById('internetExplorerIcon');
const closeWindowBtn = document.getElementById('closeWindowBtn');
const minimizeBtn = document.getElementById('minimizeBtn');
const taskButton = document.getElementById('taskButton');
const taskButtonLabel = taskButton.querySelector('span:last-child');

// Register IE with WindowManager (iframe managed manually — IE keeps its own nav state)
WindowManager.register('ie', {
    el: ieWindow,
    taskBtn: taskButton,
    iframe: null,       // IE manages its own iframe/navigation
    iframeSrc: null,
    hasChrome: true,
});

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
    WindowManager.open('ie');
    startMenu.classList.remove('open');
    startButton.classList.remove('pressed');
    playClickSound();

    if (!frame.src || frame.src === 'about:blank' || frame.src === '') {
        if (historyStack.length === 0) {
            navigate('about:blank');
        }
    }
}

function closeInternetExplorer() {
    WindowManager.close('ie');
}

function updateClock() {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// Navigation buttons
document.getElementById('goBtn').addEventListener('click', () => navigate(addressInput.value));
addressInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') navigate(addressInput.value); });

document.getElementById('homeBtn').addEventListener('click', () => navigate(homePage));
document.getElementById('refreshBtn').addEventListener('click', () => {
    statusText.textContent = 'Refreshing...';
    if (addressInput.value && addressInput.value !== 'about:blank') {
        frame.src = addressInput.value;
    }
});
document.getElementById('stopBtn').addEventListener('click', () => {
    window.stop();
    statusText.textContent = 'Stopped';
});

document.getElementById('searchBtn').addEventListener('click', () => {
    navigate('https://www.google.com');
});

document.getElementById('favoritesBtn').addEventListener('click', () => {
    alert('Favorites\n\n\u2022 https://example.com\n\u2022 https://archive.org\n\u2022 https://wikipedia.org');
});

document.getElementById('historyBtn').addEventListener('click', () => {
    if (historyStack.length === 0) {
        alert('History is empty.');
    } else {
        alert('History\n\n' + historyStack.map((u, i) => (i === historyIndex ? '\u25b6 ' : '  ') + u).join('\n'));
    }
});

document.getElementById('backBtn').addEventListener('click', () => {
    if (historyIndex > 0) {
        historyIndex -= 1;
        navigate(historyStack[historyIndex], false);
    }
});

document.getElementById('forwardBtn').addEventListener('click', () => {
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
