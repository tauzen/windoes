import { useEffect, useRef } from 'react';
import WindoesApp from '../app-state.js';

export default function DesktopContextMenu() {
    const contextMenuRef = useRef(null);
    const clockTooltipRef = useRef(null);

    useEffect(() => {
        const contextMenu = contextMenuRef.current;
        const clockTooltip = clockTooltipRef.current;
        const desktop = WindoesApp.dom.theDesktop || document.getElementById('theDesktop');
        const clockEl = document.getElementById('clock');
        const showDesktopBtn = document.querySelector('.ql-desktop');
        const trayVolume = document.getElementById('trayVolume');
        if (!contextMenu || !desktop || !clockTooltip || !clockEl || !showDesktopBtn || !trayVolume) return;

        function onDesktopContextMenu(e) {
            if (e.target.closest('.window') || e.target.closest('.icon')) return;
            e.preventDefault();
            contextMenu.style.left = e.clientX + 'px';
            contextMenu.style.top = e.clientY + 'px';
            contextMenu.classList.add('open');
        }

        function onDocumentClick(e) {
            if (!contextMenu.contains(e.target)) {
                contextMenu.classList.remove('open');
            }
        }

        function onMenuClick(e) {
            const action = e.target.dataset.action;
            contextMenu.classList.remove('open');
            if (action === 'refresh') {
                WindoesApp.helpers.body_loading(true);
            } else if (action === 'properties') {
                WindoesApp.bsod.showErrorDialog({
                    title: 'Display Properties',
                    text: 'Windoes XD\nMillennium Edition\n\nVersion 4.90.3000\n\nCopyright © Microsoft Corp. 1981-2000\n\nRegistered to: User\nProduct ID: 55274-OEM-0011903-00102',
                    icon: 'info',
                });
            } else if (action === 'new') {
                WindoesApp.open.notepad();
            } else if (action === 'arrange') {
                WindoesApp.sound.playClickSound();
            }
        }

        function onShowDesktopClick() {
            WindoesApp.WindowManager.minimizeAll();
        }

        function onClockEnter(e) {
            const now = new Date();
            clockTooltip.textContent = now.toLocaleDateString(undefined, {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            });
            clockTooltip.style.display = 'block';
            clockTooltip.style.left = (e.clientX - 80) + 'px';
            clockTooltip.style.top = (e.clientY - 24) + 'px';
        }

        function onClockLeave() {
            clockTooltip.style.display = 'none';
        }

        function onTrayVolumeClick() {
            WindoesApp.bsod.showErrorDialog({ title: 'Volume Control', text: 'There are no active mixer devices available. To install mixer devices, go to Control Panel, click Printers and Other Hardware, and then click Add Hardware.\n\nThis program will now close.', icon: 'error' });
        }

        desktop.addEventListener('contextmenu', onDesktopContextMenu);
        document.addEventListener('click', onDocumentClick);
        contextMenu.addEventListener('click', onMenuClick);
        showDesktopBtn.addEventListener('click', onShowDesktopClick);
        clockEl.addEventListener('mouseenter', onClockEnter);
        clockEl.addEventListener('mouseleave', onClockLeave);
        trayVolume.addEventListener('click', onTrayVolumeClick);

        return () => {
            desktop.removeEventListener('contextmenu', onDesktopContextMenu);
            document.removeEventListener('click', onDocumentClick);
            contextMenu.removeEventListener('click', onMenuClick);
            showDesktopBtn.removeEventListener('click', onShowDesktopClick);
            clockEl.removeEventListener('mouseenter', onClockEnter);
            clockEl.removeEventListener('mouseleave', onClockLeave);
            trayVolume.removeEventListener('click', onTrayVolumeClick);
        };
    }, []);

    return (
        <>
            <div ref={contextMenuRef} className="context-menu" id="contextMenu">
                <div className="context-menu-item" data-action="arrange">Arrange Icons</div>
                <div className="context-menu-item" data-action="lineup">Line Up Icons</div>
                <div className="context-menu-sep"></div>
                <div className="context-menu-item" data-action="refresh">Refresh</div>
                <div className="context-menu-sep"></div>
                <div className="context-menu-item disabled" data-action="paste">Paste</div>
                <div className="context-menu-item disabled" data-action="paste-shortcut">Paste Shortcut</div>
                <div className="context-menu-sep"></div>
                <div className="context-menu-item" data-action="new">New         ▶</div>
                <div className="context-menu-sep"></div>
                <div className="context-menu-item" data-action="properties">Properties</div>
            </div>
            <div ref={clockTooltipRef} className="clock-tooltip" id="clockTooltip"></div>
        </>
    );
}
