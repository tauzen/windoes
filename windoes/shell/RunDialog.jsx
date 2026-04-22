import { useEffect, useRef, useState } from 'react';
import WindoesApp from '../app-state.js';
import { useDialogFocus } from './dialog-focus.js';

export default function RunDialog() {
  const runInputRef = useRef(null);
  const dialogBoxRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [runValue, setRunValue] = useState('');

  const runActionHandlers = {
    openNotepad: () => WindoesApp.open.notepad(),
    openMyComputer: () => WindoesApp.open.myComputer(),
    openInternetExplorer: () => WindoesApp.open.internetExplorer(),
    openWinamp: () => WindoesApp.open.winamp(),
    openMinesweeper: () => WindoesApp.open.minesweeper(),
    openSolitaire: () => WindoesApp.open.solitaire(),
  };

  function openDialog() {
    WindoesApp.startMenu.closeAll?.();
    setRunValue('');
    setIsOpen(true);
    WindoesApp.sound.playClickSound();
  }

  function closeDialog() {
    setIsOpen(false);
  }

  function runCommand() {
    const rawCommand = runValue.trim();
    const cmd = rawCommand.toLowerCase();
    closeDialog();

    if (!cmd) return;

    const actionName = (WindoesApp.config.runActions || {})[cmd];
    if (actionName && runActionHandlers[actionName]) {
      runActionHandlers[actionName]();
    } else if (cmd === 'calc' || cmd === 'calc.exe') {
      WindoesApp.bsod.showErrorDialog({
        title: 'Calculator',
        text: "Windoes cannot find 'calc.exe'. Make sure you typed the name correctly, and then try again.",
        icon: 'error',
      });
    } else if (cmd.startsWith('http://') || cmd.startsWith('https://') || cmd.startsWith('www.')) {
      WindoesApp.open.internetExplorer();
      WindoesApp.browser.navigate?.(cmd);
    } else {
      WindoesApp.bsod.showErrorDialog({
        title: 'Run',
        text: `Windoes cannot find '${rawCommand}'. Make sure you typed the name correctly, and then try again. To search for a file, click the Start button, and then click Search.`,
        icon: 'error',
      });
    }
  }

  useEffect(() => {
    WindoesApp.runDialog.open = openDialog;
    WindoesApp.runDialog.close = closeDialog;
    return () => {
      delete WindoesApp.runDialog.open;
      delete WindoesApp.runDialog.close;
    };
  }, []);

  useDialogFocus({
    isOpen,
    dialogRef: dialogBoxRef,
    initialFocusRef: runInputRef,
  });

  return (
    <div className={`dialog-overlay run-dialog${isOpen ? ' active' : ''}`} id="runDialog">
      <div ref={dialogBoxRef} className="dialog-box" style={{ minWidth: '380px' }}>
        <div className="dialog-titlebar">
          <span>Run</span>
          <button className="ctrl-btn" id="runCloseBtn" aria-label="Close" onClick={closeDialog}>
            ×
          </button>
        </div>
        <div className="dialog-body">
          <div className="run-icon-area">
            <div
              className="dialog-icon"
              aria-hidden={true}
              style={{ background: '#C0C0C0', border: '2px solid #808080', borderRadius: '2px' }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '4px',
                  left: '4px',
                  right: '4px',
                  height: '10px',
                  background: '#000080',
                }}
              ></div>
              <div
                style={{
                  position: 'absolute',
                  bottom: '4px',
                  left: '4px',
                  width: '12px',
                  height: '8px',
                  background: '#fff',
                  border: '1px solid #808080',
                }}
              ></div>
            </div>
            <div className="dialog-text">
              Type the name of a program, folder, document, or Internet resource, and Windoes will
              open it for you.
            </div>
          </div>
          <div className="run-row">
            <label>Open:</label>
            <input
              ref={runInputRef}
              type="text"
              id="runInput"
              value={runValue}
              onChange={(e) => setRunValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') runCommand();
                if (e.key === 'Escape') closeDialog();
              }}
            />
          </div>
        </div>
        <div className="dialog-buttons">
          <button className="dialog-btn" id="runOkBtn" onClick={runCommand}>
            OK
          </button>
          <button className="dialog-btn" id="runCancelBtn" onClick={closeDialog}>
            Cancel
          </button>
          <button className="dialog-btn">Browse...</button>
        </div>
      </div>
    </div>
  );
}
