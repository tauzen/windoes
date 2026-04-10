// ══════════════════════════════════════════════
// Right-click Context Menu (generated from JS)
// ══════════════════════════════════════════════
import WindoesApp from './app-state.js';

const contextMenu = document.getElementById('contextMenu');

document.getElementById('theDesktop').addEventListener('contextmenu', (e) => {
    if (e.target.closest('.window') || e.target.closest('.icon')) return;
    e.preventDefault();
    contextMenu.style.left = e.clientX + 'px';
    contextMenu.style.top = e.clientY + 'px';
    contextMenu.classList.add('open');
});

document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target)) {
        contextMenu.classList.remove('open');
    }
});

contextMenu.addEventListener('click', (e) => {
    const action = e.target.dataset.action;
    contextMenu.classList.remove('open');
    if (action === 'refresh') {
        WindoesApp.helpers.body_loading(true);
    } else if (action === 'properties') {
        WindoesApp.bsod.showErrorDialog({
            title: 'Display Properties',
            text: 'Windoes XD\nMillennium Edition\n\nVersion 4.90.3000\n\nCopyright \u00A9 Microsoft Corp. 1981-2000\n\nRegistered to: User\nProduct ID: 55274-OEM-0011903-00102',
            icon: 'info'
        });
    } else if (action === 'new') {
        WindoesApp.open.notepad();
    } else if (action === 'arrange') {
        WindoesApp.sound.playClickSound();
    }
});

// ══════════════════════════════════════════════
// Show Desktop quick launch
// ══════════════════════════════════════════════
document.querySelector('.ql-desktop').addEventListener('click', () => {
    WindoesApp.WindowManager.minimizeAll();
});

// ══════════════════════════════════════════════
// Clock Tooltip (rendered by ShellApp)
// ══════════════════════════════════════════════
const clockTooltip = document.getElementById('clockTooltip');
const clockEl = document.getElementById('clock');

clockEl.addEventListener('mouseenter', (e) => {
    const now = new Date();
    clockTooltip.textContent = now.toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    clockTooltip.style.display = 'block';
    clockTooltip.style.left = (e.clientX - 80) + 'px';
    clockTooltip.style.top = (e.clientY - 24) + 'px';
});
clockEl.addEventListener('mouseleave', () => {
    clockTooltip.style.display = 'none';
});

// Volume icon click
document.getElementById('trayVolume').addEventListener('click', () => {
    WindoesApp.bsod.showErrorDialog({ title: 'Volume Control', text: 'There are no active mixer devices available. To install mixer devices, go to Control Panel, click Printers and Other Hardware, and then click Add Hardware.\n\nThis program will now close.', icon: 'error' });
});
