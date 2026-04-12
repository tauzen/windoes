import { useEffect, useState } from 'react';
import WindoesApp from '../app-state.js';

export default function ErrorDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState('Windoes');
    const [text, setText] = useState('An error has occurred.');
    const [icon, setIcon] = useState('error');

    function show(err) {
        setTitle(err.title);
        setText(err.text);
        setIcon(err.icon);
        setIsOpen(true);
        WindoesApp.sound.playErrorSound();
    }

    function hide() {
        setIsOpen(false);
    }

    useEffect(() => {
        WindoesApp.errorDialog.show = show;
        WindoesApp.errorDialog.hide = hide;
        WindoesApp.errorDialog.isOpen = () => isOpen;

        return () => {
            delete WindoesApp.errorDialog.show;
            delete WindoesApp.errorDialog.hide;
            delete WindoesApp.errorDialog.isOpen;
        };
    }, [isOpen]);

    return (
        <div className={`dialog-overlay${isOpen ? ' active' : ''}`} id="errorDialog">
            <div className="dialog-box">
                <div className="dialog-titlebar">
                    <span id="errorDialogTitle">{title}</span>
                    <button className="ctrl-btn" id="errorCloseBtn" aria-label="Close" onClick={hide}>×</button>
                </div>
                <div className="dialog-body">
                    <div className={`dialog-icon dialog-icon-${icon}`} id="errorDialogIcon"></div>
                    <div className="dialog-text" id="errorDialogText">{text}</div>
                </div>
                <div className="dialog-buttons">
                    <button className="dialog-btn" id="errorOkBtn" onClick={hide}>OK</button>
                </div>
            </div>
        </div>
    );
}
