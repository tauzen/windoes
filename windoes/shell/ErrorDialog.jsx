import { useEffect, useRef } from 'react';
import WindoesApp from '../app-state.js';

export default function ErrorDialog() {
    const dialogRef = useRef(null);
    const titleRef = useRef(null);
    const textRef = useRef(null);
    const iconRef = useRef(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        const titleEl = titleRef.current;
        const textEl = textRef.current;
        const iconEl = iconRef.current;
        const okBtn = document.getElementById('errorOkBtn');
        const closeBtn = document.getElementById('errorCloseBtn');
        if (!dialog || !titleEl || !textEl || !iconEl || !okBtn || !closeBtn) return;

        function show(err) {
            titleEl.textContent = err.title;
            textEl.textContent = err.text;
            iconEl.className = 'dialog-icon dialog-icon-' + err.icon;
            dialog.classList.add('active');
            WindoesApp.sound.playErrorSound();
        }

        function hide() {
            dialog.classList.remove('active');
        }

        if (!WindoesApp.dialogs) WindoesApp.dialogs = {};
        WindoesApp.dialogs.error = { show, hide, isOpen: () => dialog.classList.contains('active') };

        okBtn.addEventListener('click', hide);
        closeBtn.addEventListener('click', hide);

        return () => {
            okBtn.removeEventListener('click', hide);
            closeBtn.removeEventListener('click', hide);
            if (WindoesApp.dialogs?.error) delete WindoesApp.dialogs.error;
        };
    }, []);

    return (
        <div ref={dialogRef} className="dialog-overlay" id="errorDialog">
            <div className="dialog-box">
                <div className="dialog-titlebar">
                    <span ref={titleRef} id="errorDialogTitle">Windoes</span>
                    <button className="ctrl-btn" id="errorCloseBtn" aria-label="Close">×</button>
                </div>
                <div className="dialog-body">
                    <div ref={iconRef} className="dialog-icon dialog-icon-error" id="errorDialogIcon"></div>
                    <div ref={textRef} className="dialog-text" id="errorDialogText">An error has occurred.</div>
                </div>
                <div className="dialog-buttons">
                    <button className="dialog-btn" id="errorOkBtn">OK</button>
                </div>
            </div>
        </div>
    );
}
