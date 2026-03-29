// ══════════════════════════════════════════════
// Right-click Context Menu (generated from JS)
// ══════════════════════════════════════════════
const contextMenu = document.createElement('div');
contextMenu.className = 'context-menu';
contextMenu.id = 'contextMenu';
contextMenu.innerHTML = `<div class="context-menu-item" data-action="arrange">Arrange Icons</div>
    <div class="context-menu-item" data-action="lineup">Line Up Icons</div>
    <div class="context-menu-sep"></div>
    <div class="context-menu-item" data-action="refresh">Refresh</div>
    <div class="context-menu-sep"></div>
    <div class="context-menu-item disabled" data-action="paste">Paste</div>
    <div class="context-menu-item disabled" data-action="paste-shortcut">Paste Shortcut</div>
    <div class="context-menu-sep"></div>
    <div class="context-menu-item" data-action="new">New &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &#9654;</div>
    <div class="context-menu-sep"></div>
    <div class="context-menu-item" data-action="properties">Properties</div>`;
document.body.appendChild(contextMenu);

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
            text: 'Windoes Me\nMillennium Edition\n\nVersion 4.90.3000\n\nCopyright \u00A9 Microsoft Corp. 1981-2000\n\nRegistered to: User\nProduct ID: 55274-OEM-0011903-00102',
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
// Clock Tooltip (generated from JS)
// ══════════════════════════════════════════════
const clockTooltip = document.createElement('div');
clockTooltip.className = 'clock-tooltip';
clockTooltip.id = 'clockTooltip';
document.body.appendChild(clockTooltip);

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
