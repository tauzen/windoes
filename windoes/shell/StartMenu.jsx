import { useLayoutEffect, useRef, useState } from 'react';
import WindoesApp from '../app-state.js';
import { TASKBAR_HEIGHT_PX } from '../constants.js';

export default function StartMenu() {
    const bootDone = WindoesApp.state.use((s) => s.boot.done);
    const startMenuRef = useRef(null);
    const programsSubmenuRef = useRef(null);
    const accessoriesSubmenuRef = useRef(null);
    const gamesSubmenuRef = useRef(null);
    const menuProgramsRef = useRef(null);
    const subAccessoriesRef = useRef(null);
    const subAccGamesRef = useRef(null);

    const [shutdownOpen, setShutdownOpen] = useState(false);
    const [shutdownOption, setShutdownOption] = useState('shutdown');

    function closeOtherSubmenus(...keepRefs) {
        const allRefs = [programsSubmenuRef, accessoriesSubmenuRef, gamesSubmenuRef];
        const keep = new Set(keepRefs);
        for (const ref of allRefs) {
            if (keep.has(ref)) continue;
            if (ref.current) ref.current.classList.remove('open');
        }
    }

    function closeSubmenus() {
        closeOtherSubmenus();
    }

    function closeAllMenus() {
        const startMenu = startMenuRef.current;
        const startButton = WindoesApp.dom.startButton;
        if (startMenu) startMenu.classList.remove('open');
        if (startButton) startButton.classList.remove('pressed');
        closeSubmenus();
    }

    function positionSubmenu(submenu, triggerEl, parentSubmenu) {
        if (!submenu || !triggerEl) return;

        const rect = triggerEl.getBoundingClientRect();

        submenu.style.visibility = 'hidden';
        submenu.style.display = 'block';

        if (parentSubmenu) {
            const parentRect = parentSubmenu.getBoundingClientRect();
            let left = parentRect.right;
            if (left + submenu.offsetWidth > window.innerWidth) {
                left = parentRect.left - submenu.offsetWidth;
            }
            submenu.style.left = left + 'px';
        }

        let bottom = window.innerHeight - rect.top - rect.height;
        const minBottom = TASKBAR_HEIGHT_PX;
        const maxBottom = window.innerHeight - submenu.offsetHeight;
        bottom = Math.max(minBottom, Math.min(bottom, maxBottom));
        submenu.style.bottom = bottom + 'px';

        submenu.style.visibility = '';
        submenu.style.display = '';
        submenu.classList.add('open');
    }

    function onProgramsEnter() {
        positionSubmenu(programsSubmenuRef.current, menuProgramsRef.current, null);
        closeOtherSubmenus(programsSubmenuRef);
    }

    function onSubAccessoriesEnter() {
        positionSubmenu(accessoriesSubmenuRef.current, subAccessoriesRef.current, programsSubmenuRef.current);
        closeOtherSubmenus(programsSubmenuRef, accessoriesSubmenuRef);
    }

    function onSubAccGamesEnter() {
        positionSubmenu(gamesSubmenuRef.current, subAccGamesRef.current, accessoriesSubmenuRef.current);
    }

    function onStartMenuLeave(e) {
        const programsSubmenu = programsSubmenuRef.current;
        if (programsSubmenu && !programsSubmenu.contains(e.relatedTarget)) {
            closeSubmenus();
        }
    }

    function onProgramsLeave(e) {
        const startMenu = startMenuRef.current;
        const accessoriesSubmenu = accessoriesSubmenuRef.current;
        if (!startMenu || !accessoriesSubmenu) return;

        if (!startMenu.contains(e.relatedTarget) && !accessoriesSubmenu.contains(e.relatedTarget)) {
            closeOtherSubmenus();
        }
    }

    function onAccessoriesLeave(e) {
        const programsSubmenu = programsSubmenuRef.current;
        const gamesSubmenu = gamesSubmenuRef.current;
        if (!programsSubmenu || !gamesSubmenu) return;

        if (!programsSubmenu.contains(e.relatedTarget) && !gamesSubmenu.contains(e.relatedTarget)) {
            closeOtherSubmenus(programsSubmenuRef);
        }
    }

    function onGamesLeave(e) {
        const accessoriesSubmenu = accessoriesSubmenuRef.current;
        if (accessoriesSubmenu && !accessoriesSubmenu.contains(e.relatedTarget)) {
            closeOtherSubmenus(programsSubmenuRef, accessoriesSubmenuRef);
        }
    }

    function performShutdown() {
        setShutdownOpen(false);
        document.body.style.background = '#000';
        if (WindoesApp.dom.theDesktop) WindoesApp.dom.theDesktop.style.display = 'none';
        if (WindoesApp.dom.theTaskbar) WindoesApp.dom.theTaskbar.style.display = 'none';
        if (startMenuRef.current) startMenuRef.current.style.display = 'none';

        const shutdownMsg = document.createElement('div');
        shutdownMsg.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;color:#FF8000;font-size:24px;font-family:"MS Sans Serif",sans-serif;background:#000;z-index:99998;';
        shutdownMsg.style.textAlign = 'center';

        const textWrap = document.createElement('div');
        const line1 = document.createElement('div');
        line1.textContent = "It's now safe to turn off";
        const line2 = document.createElement('div');
        line2.textContent = 'your computer.';
        textWrap.appendChild(line1);
        textWrap.appendChild(line2);
        shutdownMsg.appendChild(textWrap);
        document.body.appendChild(shutdownMsg);
    }

    function performRestart() {
        setShutdownOpen(false);
        location.reload();
    }

    function runAction(handler) {
        handler();
        closeAllMenus();
    }

    useLayoutEffect(() => {
        const startMenuEl = startMenuRef.current;
        const startButton = WindoesApp.dom.startButton || document.getElementById('startButton');
        if (!startMenuEl || !startButton) return;

        WindoesApp.dom.startMenu = startMenuEl;

        WindoesApp.startMenu.closeSubmenus = closeSubmenus;

        function toggleStartMenu() {
            startMenuEl.classList.toggle('open');
            startButton.classList.toggle('pressed', startMenuEl.classList.contains('open'));
            if (!startMenuEl.classList.contains('open')) {
                closeSubmenus();
            }
            WindoesApp.sound.playClickSound();
        }

        WindoesApp.startMenu.toggle = toggleStartMenu;

        function onDocumentClick(e) {
            const programsSubmenu = programsSubmenuRef.current;
            const accessoriesSubmenu = accessoriesSubmenuRef.current;
            const gamesSubmenu = gamesSubmenuRef.current;
            if (!programsSubmenu || !accessoriesSubmenu || !gamesSubmenu) return;

            if (!startButton.contains(e.target)
                && !startMenuEl.contains(e.target)
                && !programsSubmenu.contains(e.target)
                && !accessoriesSubmenu.contains(e.target)
                && !gamesSubmenu.contains(e.target)) {
                closeAllMenus();
            }
        }

        document.addEventListener('click', onDocumentClick);

        return () => {
            delete WindoesApp.startMenu.closeSubmenus;
            delete WindoesApp.startMenu.toggle;
            document.removeEventListener('click', onDocumentClick);
        };
    }, []);

    return (
        <>
            <div ref={startMenuRef} className="start-menu" id="startMenu" aria-label="Start menu" style={{ display: bootDone ? '' : 'none' }} onMouseLeave={onStartMenuLeave}>
                <div className="start-rail">
                    <span className="rail-windoes">Windoes</span>
                    <strong>XD</strong>
                </div>
                <div className="menu-list">
                    <div className="menu-item" id="menuWindoesUpdate" onMouseEnter={closeSubmenus} onClick={() => runAction(() => WindoesApp.open.internetExplorer())}><span className="menu-icon menu-icon-winupdate"></span>Windoes Update</div>
                    <div className="menu-separator"></div>
                    <div ref={menuProgramsRef} className="menu-item menu-item-arrow" id="menuPrograms" onMouseEnter={onProgramsEnter}><span className="menu-icon menu-icon-programs"></span>Programs</div>
                    <div className="menu-item" id="menuHelp" onMouseEnter={closeSubmenus} onClick={() => runAction(() => WindoesApp.bsod.showErrorDialog({ title: 'Windoes Help', text: 'Help is not available for this program.\n\nTry searching online at microsoft.com for help topics.', icon: 'info' }))}><span className="menu-icon menu-icon-help"></span>Help</div>
                    <div className="menu-item" id="menuRun" onMouseEnter={closeSubmenus} onClick={() => runAction(() => WindoesApp.runDialog.open?.())}><span className="menu-icon menu-icon-run"></span>Run...</div>
                    <div className="menu-separator"></div>
                    <div
                        className="menu-item menu-shutdown"
                        id="menuShutdown"
                        onMouseEnter={closeSubmenus}
                        onClick={() => {
                            closeAllMenus();
                            setShutdownOption('shutdown');
                            setShutdownOpen(true);
                            WindoesApp.sound.playClickSound();
                        }}
                    >
                        <span className="menu-icon menu-icon-shutdown"></span>Shut Down...
                    </div>
                </div>
            </div>

            <div ref={programsSubmenuRef} className="programs-submenu" id="programsSubmenu" onMouseLeave={onProgramsLeave}>
                <div ref={subAccessoriesRef} className="submenu-item submenu-item-arrow" id="subAccessories" onMouseEnter={onSubAccessoriesEnter}><span className="submenu-icon submenu-icon-folder"></span>Accessories</div>
                <div className="context-menu-sep"></div>
                <div className="submenu-item" id="subIE" onMouseEnter={() => closeOtherSubmenus(programsSubmenuRef)} onClick={() => runAction(() => WindoesApp.open.internetExplorer())}><span className="submenu-icon submenu-icon-ie"></span>Internet Explorer</div>
                <div className="submenu-item" id="subMSDOS" onMouseEnter={() => closeOtherSubmenus(programsSubmenuRef)} onClick={() => runAction(() => WindoesApp.bsod.showErrorDialog({ title: 'MS-DOS Prompt', text: 'This program cannot be run in Windoes mode.', icon: 'error' }))}><span className="submenu-icon submenu-icon-msdos"></span>MS-DOS Prompt</div>
                <div className="submenu-item" id="subOutlook" onMouseEnter={() => closeOtherSubmenus(programsSubmenuRef)} onClick={() => runAction(() => WindoesApp.bsod.showErrorDialog({ title: 'Outlook Express', text: 'No Internet mail server is configured.\n\nPlease check your mail settings in Internet Accounts.', icon: 'info' }))}><span className="submenu-icon submenu-icon-outlook"></span>Outlook Express</div>
                <div className="submenu-item" id="subExplorer" onMouseEnter={() => closeOtherSubmenus(programsSubmenuRef)} onClick={() => runAction(() => WindoesApp.open.myComputer())}><span className="submenu-icon submenu-icon-explorer"></span>Windoes Explorer</div>
            </div>

            <div ref={accessoriesSubmenuRef} className="programs-submenu accessories-submenu" id="accessoriesSubmenu" onMouseLeave={onAccessoriesLeave}>
                <div ref={subAccGamesRef} className="submenu-item submenu-item-arrow" id="subAccGames" onMouseEnter={onSubAccGamesEnter}><span className="submenu-icon submenu-icon-folder"></span>Games</div>
                <div className="context-menu-sep"></div>
                <div className="submenu-item" id="subAccCalculator" onMouseEnter={() => closeOtherSubmenus(programsSubmenuRef, accessoriesSubmenuRef)} onClick={() => runAction(() => WindoesApp.bsod.showErrorDialog({ title: 'Calculator', text: 'Calculator is not available in this version of Windoes.', icon: 'info' }))}><span className="submenu-icon submenu-icon-calculator"></span>Calculator</div>
                <div className="submenu-item" id="subAccImaging" onMouseEnter={() => closeOtherSubmenus(programsSubmenuRef, accessoriesSubmenuRef)} onClick={() => runAction(() => WindoesApp.bsod.showErrorDialog({ title: 'Windoes', text: 'This feature is not available in this version of Windoes.', icon: 'info' }))}><span className="submenu-icon submenu-icon-imaging"></span>Imaging</div>
                <div className="submenu-item" id="subAccNotepad" onMouseEnter={() => closeOtherSubmenus(programsSubmenuRef, accessoriesSubmenuRef)} onClick={() => runAction(() => WindoesApp.open.notepad())}><span className="submenu-icon submenu-icon-notepad"></span>Notepad</div>
                <div className="submenu-item" id="subAccPaint" onMouseEnter={() => closeOtherSubmenus(programsSubmenuRef, accessoriesSubmenuRef)} onClick={() => runAction(() => WindoesApp.bsod.showErrorDialog({ title: 'Paint', text: 'Not enough memory to open Paint.\n\nClose some programs and try again.', icon: 'error' }))}><span className="submenu-icon submenu-icon-paint"></span>Paint</div>
                <div className="submenu-item" id="subAccWordPad" onMouseEnter={() => closeOtherSubmenus(programsSubmenuRef, accessoriesSubmenuRef)} onClick={() => runAction(() => WindoesApp.open.notepad())}><span className="submenu-icon submenu-icon-wordpad"></span>WordPad</div>
            </div>

            <div ref={gamesSubmenuRef} className="programs-submenu games-submenu" id="gamesSubmenu" onMouseLeave={onGamesLeave}>
                <div className="submenu-item" id="subGameAsciiRunner" onClick={() => runAction(() => WindoesApp.open.app('ASCII Runner', './applications/ascii-runner/index.html'))}><span className="submenu-icon submenu-icon-ascii-runner"></span>ASCII Runner</div>
                <div className="submenu-item" id="subGameMinesweeper" onClick={() => runAction(() => WindoesApp.open.minesweeper())}><span className="submenu-icon submenu-icon-minesweeper"></span>Minesweeper</div>
                <div className="submenu-item" id="subGameSolitaire" onClick={() => runAction(() => WindoesApp.open.solitaire())}><span className="submenu-icon submenu-icon-solitaire"></span>Solitaire</div>
            </div>

            <div className={`dialog-overlay shutdown-dialog${shutdownOpen ? ' active' : ''}`} id="shutdownDialog">
                <div className="dialog-box">
                    <div className="dialog-titlebar">
                        <span>Shut Down Windows</span>
                        <button className="ctrl-btn" id="shutdownCloseBtn" aria-label="Close" onClick={() => setShutdownOpen(false)}>×</button>
                    </div>
                    <div className="dialog-body">
                        <div className="shutdown-question">
                            <img src="icons/my-computer.png" className="shutdown-computer-icon" alt="My Computer" draggable={false} />
                            <div className="dialog-text">What do you want the computer to do?</div>
                        </div>
                        <div className="shutdown-options">
                            <label><input type="radio" name="shutdownOption" value="shutdown" checked={shutdownOption === 'shutdown'} onChange={() => setShutdownOption('shutdown')} /> Shut down</label>
                            <label><input type="radio" name="shutdownOption" value="restart" checked={shutdownOption === 'restart'} onChange={() => setShutdownOption('restart')} /> Restart</label>
                            <label><input type="radio" name="shutdownOption" value="msdos" checked={shutdownOption === 'msdos'} onChange={() => setShutdownOption('msdos')} /> Restart in MS-DOS mode</label>
                        </div>
                    </div>
                    <div className="dialog-buttons">
                        <button className="dialog-btn" id="shutdownOkBtn" onClick={() => (shutdownOption === 'shutdown' ? performShutdown() : performRestart())}>OK</button>
                        <button className="dialog-btn" id="shutdownCancelBtn" onClick={() => setShutdownOpen(false)}>Cancel</button>
                        <button className="dialog-btn" id="shutdownHelpBtn" onClick={() => WindoesApp.bsod.showErrorDialog({ title: 'Windoes Help', text: 'Help is not available for Shut Down.\n\nFor more information, click Start, and then click Help.', icon: 'info' })}>Help</button>
                    </div>
                </div>
            </div>
        </>
    );
}
