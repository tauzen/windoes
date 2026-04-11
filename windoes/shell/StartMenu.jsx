import { useEffect, useRef } from 'react';
import WindoesApp from '../app-state.js';

export default function StartMenu() {
    const bootDone = WindoesApp.state.use((s) => s.boot.done);
    const startMenuRef = useRef(null);
    const programsSubmenuRef = useRef(null);
    const accessoriesSubmenuRef = useRef(null);
    const gamesSubmenuRef = useRef(null);
    const shutdownDialogRef = useRef(null);

    useEffect(() => {
        const startMenuEl = startMenuRef.current;
        const programsSubmenu = programsSubmenuRef.current;
        const accessoriesSubmenu = accessoriesSubmenuRef.current;
        const gamesSubmenu = gamesSubmenuRef.current;
        const shutdownDialog = shutdownDialogRef.current;
        const menuPrograms = document.getElementById('menuPrograms');
        const subAccessories = document.getElementById('subAccessories');
        const subAccGames = document.getElementById('subAccGames');
        const startButton = WindoesApp.dom.startButton || document.getElementById('startButton');
        if (!startMenuEl || !programsSubmenu || !accessoriesSubmenu || !gamesSubmenu || !shutdownDialog || !startButton) {
            return;
        }

        WindoesApp.dom.startMenu = startMenuEl;

        function closeSubmenus() {
            programsSubmenu.classList.remove('open');
            accessoriesSubmenu.classList.remove('open');
            gamesSubmenu.classList.remove('open');
        }

        function closeAllMenus() {
            startMenuEl.classList.remove('open');
            startButton.classList.remove('pressed');
            closeSubmenus();
        }

        function closeProgramsSubmenu() {
            closeSubmenus();
        }

        WindoesApp.menu.closeProgramsSubmenu = closeProgramsSubmenu;

        function onStartButtonClick(e) {
            e.stopPropagation();
            startMenuEl.classList.toggle('open');
            startButton.classList.toggle('pressed', startMenuEl.classList.contains('open'));
            if (!startMenuEl.classList.contains('open')) {
                closeSubmenus();
            }
            WindoesApp.sound.playClickSound();
        }

        function onDocumentClick(e) {
            if (!startButton.contains(e.target)
                && !startMenuEl.contains(e.target)
                && !programsSubmenu.contains(e.target)
                && !accessoriesSubmenu.contains(e.target)
                && !gamesSubmenu.contains(e.target)) {
                closeAllMenus();
            }
        }

        function positionSubmenu(submenu, triggerEl, parentSubmenu) {
            const rect = triggerEl.getBoundingClientRect();
            const taskbarHeight = 30;

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
            const minBottom = taskbarHeight;
            const maxBottom = window.innerHeight - submenu.offsetHeight;
            bottom = Math.max(minBottom, Math.min(bottom, maxBottom));
            submenu.style.bottom = bottom + 'px';

            submenu.style.visibility = '';
            submenu.style.display = '';
            submenu.classList.add('open');
        }

        function onProgramsEnter() {
            positionSubmenu(programsSubmenu, menuPrograms, null);
            accessoriesSubmenu.classList.remove('open');
            gamesSubmenu.classList.remove('open');
        }

        function onSubAccessoriesEnter() {
            positionSubmenu(accessoriesSubmenu, subAccessories, programsSubmenu);
            gamesSubmenu.classList.remove('open');
        }

        function onSubAccGamesEnter() {
            positionSubmenu(gamesSubmenu, subAccGames, accessoriesSubmenu);
        }

        function onStartMenuLeave(e) {
            if (!programsSubmenu.contains(e.relatedTarget)) {
                closeSubmenus();
            }
        }

        function onProgramsLeave(e) {
            if (!startMenuEl.contains(e.relatedTarget) && !accessoriesSubmenu.contains(e.relatedTarget)) {
                programsSubmenu.classList.remove('open');
                accessoriesSubmenu.classList.remove('open');
                gamesSubmenu.classList.remove('open');
            }
        }

        function onAccessoriesLeave(e) {
            if (!programsSubmenu.contains(e.relatedTarget) && !gamesSubmenu.contains(e.relatedTarget)) {
                accessoriesSubmenu.classList.remove('open');
                gamesSubmenu.classList.remove('open');
            }
        }

        function onGamesLeave(e) {
            if (!accessoriesSubmenu.contains(e.relatedTarget)) {
                gamesSubmenu.classList.remove('open');
            }
        }

        function closeShutdownDialog() {
            shutdownDialog.classList.remove('active');
        }

        function performShutdown() {
            closeShutdownDialog();
            document.body.style.background = '#000';
            if (WindoesApp.dom.theDesktop) WindoesApp.dom.theDesktop.style.display = 'none';
            if (WindoesApp.dom.theTaskbar) WindoesApp.dom.theTaskbar.style.display = 'none';
            startMenuEl.style.display = 'none';

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
            closeShutdownDialog();
            location.reload();
        }

        const onMenuItemHoverCloseSubmenus = (item) => {
            if (item !== menuPrograms) {
                item.addEventListener('mouseenter', closeSubmenus);
                return () => item.removeEventListener('mouseenter', closeSubmenus);
            }
            return () => {};
        };

        const onProgramsSubItemHoverClose = (item) => {
            if (item !== subAccessories) {
                const handler = () => {
                    accessoriesSubmenu.classList.remove('open');
                    gamesSubmenu.classList.remove('open');
                };
                item.addEventListener('mouseenter', handler);
                return () => item.removeEventListener('mouseenter', handler);
            }
            return () => {};
        };

        const onAccessoriesSubItemHoverClose = (item) => {
            if (item !== subAccGames) {
                const handler = () => gamesSubmenu.classList.remove('open');
                item.addEventListener('mouseenter', handler);
                return () => item.removeEventListener('mouseenter', handler);
            }
            return () => {};
        };

        const actionHandlers = {
            subIE: () => WindoesApp.open.internetExplorer(),
            subExplorer: () => WindoesApp.open.myComputer(),
            subMSDOS: () => WindoesApp.bsod.showErrorDialog({ title: 'MS-DOS Prompt', text: 'This program cannot be run in Windoes mode.', icon: 'error' }),
            subOutlook: () => WindoesApp.bsod.showErrorDialog({ title: 'Outlook Express', text: 'No Internet mail server is configured.\n\nPlease check your mail settings in Internet Accounts.', icon: 'info' }),
            subAccNotepad: () => WindoesApp.open.notepad(),
            subAccPaint: () => WindoesApp.bsod.showErrorDialog({ title: 'Paint', text: 'Not enough memory to open Paint.\n\nClose some programs and try again.', icon: 'error' }),
            subAccCalculator: () => WindoesApp.bsod.showErrorDialog({ title: 'Calculator', text: 'Calculator is not available in this version of Windoes.', icon: 'info' }),
            subAccWordPad: () => WindoesApp.open.notepad(),
            subAccImaging: () => WindoesApp.bsod.showErrorDialog({ title: 'Windoes', text: 'This feature is not available in this version of Windoes.', icon: 'info' }),
            subGameMinesweeper: () => WindoesApp.open.minesweeper(),
            subGameSolitaire: () => WindoesApp.open.solitaire(),
            subGameAsciiRunner: () => WindoesApp.open.app('ASCII Runner', './applications/ascii-runner/index.html'),
            menuWindoesUpdate: () => WindoesApp.open.internetExplorer(),
            menuHelp: () => WindoesApp.bsod.showErrorDialog({ title: 'Windoes Help', text: 'Help is not available for this program.\n\nTry searching online at microsoft.com for help topics.', icon: 'info' }),
        };

        const cleanupActions = Object.entries(actionHandlers).map(([id, handler]) => {
            const el = document.getElementById(id);
            if (!el) return () => {};
            const onClick = () => {
                handler();
                closeAllMenus();
            };
            el.addEventListener('click', onClick);
            return () => el.removeEventListener('click', onClick);
        });

        const menuShutdown = document.getElementById('menuShutdown');
        const shutdownOkBtn = document.getElementById('shutdownOkBtn');
        const shutdownCancelBtn = document.getElementById('shutdownCancelBtn');
        const shutdownCloseBtn = document.getElementById('shutdownCloseBtn');
        const shutdownHelpBtn = document.getElementById('shutdownHelpBtn');

        const onMenuShutdown = () => {
            closeAllMenus();
            shutdownDialog.classList.add('active');
            const shutdownInput = shutdownDialog.querySelector('input[value="shutdown"]');
            if (shutdownInput) shutdownInput.checked = true;
            WindoesApp.sound.playClickSound();
        };

        const onShutdownOk = () => {
            const selected = shutdownDialog.querySelector('input[name="shutdownOption"]:checked');
            const value = selected ? selected.value : 'shutdown';
            if (value === 'shutdown') {
                performShutdown();
            } else {
                performRestart();
            }
        };

        const onShutdownHelp = () => {
            WindoesApp.bsod.showErrorDialog({ title: 'Windoes Help', text: 'Help is not available for Shut Down.\n\nFor more information, click Start, and then click Help.', icon: 'info' });
        };

        startButton.addEventListener('click', onStartButtonClick);
        document.addEventListener('click', onDocumentClick);
        menuPrograms.addEventListener('mouseenter', onProgramsEnter);
        subAccessories.addEventListener('mouseenter', onSubAccessoriesEnter);
        subAccGames.addEventListener('mouseenter', onSubAccGamesEnter);
        startMenuEl.addEventListener('mouseleave', onStartMenuLeave);
        programsSubmenu.addEventListener('mouseleave', onProgramsLeave);
        accessoriesSubmenu.addEventListener('mouseleave', onAccessoriesLeave);
        gamesSubmenu.addEventListener('mouseleave', onGamesLeave);

        const startMenuItemCleanups = Array.from(startMenuEl.querySelectorAll('.menu-item')).map(onMenuItemHoverCloseSubmenus);
        const programsItemCleanups = Array.from(programsSubmenu.querySelectorAll('.submenu-item')).map(onProgramsSubItemHoverClose);
        const accessoriesItemCleanups = Array.from(accessoriesSubmenu.querySelectorAll('.submenu-item')).map(onAccessoriesSubItemHoverClose);

        if (menuShutdown) menuShutdown.addEventListener('click', onMenuShutdown);
        if (shutdownOkBtn) shutdownOkBtn.addEventListener('click', onShutdownOk);
        if (shutdownCancelBtn) shutdownCancelBtn.addEventListener('click', closeShutdownDialog);
        if (shutdownCloseBtn) shutdownCloseBtn.addEventListener('click', closeShutdownDialog);
        if (shutdownHelpBtn) shutdownHelpBtn.addEventListener('click', onShutdownHelp);

        return () => {
            delete WindoesApp.menu.closeProgramsSubmenu;
            startButton.removeEventListener('click', onStartButtonClick);
            document.removeEventListener('click', onDocumentClick);
            menuPrograms.removeEventListener('mouseenter', onProgramsEnter);
            subAccessories.removeEventListener('mouseenter', onSubAccessoriesEnter);
            subAccGames.removeEventListener('mouseenter', onSubAccGamesEnter);
            startMenuEl.removeEventListener('mouseleave', onStartMenuLeave);
            programsSubmenu.removeEventListener('mouseleave', onProgramsLeave);
            accessoriesSubmenu.removeEventListener('mouseleave', onAccessoriesLeave);
            gamesSubmenu.removeEventListener('mouseleave', onGamesLeave);
            startMenuItemCleanups.forEach((fn) => fn());
            programsItemCleanups.forEach((fn) => fn());
            accessoriesItemCleanups.forEach((fn) => fn());
            cleanupActions.forEach((fn) => fn());
            if (menuShutdown) menuShutdown.removeEventListener('click', onMenuShutdown);
            if (shutdownOkBtn) shutdownOkBtn.removeEventListener('click', onShutdownOk);
            if (shutdownCancelBtn) shutdownCancelBtn.removeEventListener('click', closeShutdownDialog);
            if (shutdownCloseBtn) shutdownCloseBtn.removeEventListener('click', closeShutdownDialog);
            if (shutdownHelpBtn) shutdownHelpBtn.removeEventListener('click', onShutdownHelp);
        };
    }, []);

    return (
        <>
            <div ref={startMenuRef} className="start-menu" id="startMenu" aria-label="Start menu" style={{ display: bootDone ? '' : 'none' }}>
                <div className="start-rail">
                    <span className="rail-windoes">Windoes</span>
                    <strong>XD</strong>
                </div>
                <div className="menu-list">
                    <div className="menu-item" id="menuWindoesUpdate"><span className="menu-icon menu-icon-winupdate"></span>Windoes Update</div>
                    <div className="menu-separator"></div>
                    <div className="menu-item menu-item-arrow" id="menuPrograms"><span className="menu-icon menu-icon-programs"></span>Programs</div>
                    <div className="menu-item" id="menuHelp"><span className="menu-icon menu-icon-help"></span>Help</div>
                    <div className="menu-item" id="menuRun"><span className="menu-icon menu-icon-run"></span>Run...</div>
                    <div className="menu-separator"></div>
                    <div className="menu-item menu-shutdown" id="menuShutdown"><span className="menu-icon menu-icon-shutdown"></span>Shut Down...</div>
                </div>
            </div>

            <div ref={programsSubmenuRef} className="programs-submenu" id="programsSubmenu">
                <div className="submenu-item submenu-item-arrow" id="subAccessories"><span className="submenu-icon submenu-icon-folder"></span>Accessories</div>
                <div className="context-menu-sep"></div>
                <div className="submenu-item" id="subIE"><span className="submenu-icon submenu-icon-ie"></span>Internet Explorer</div>
                <div className="submenu-item" id="subMSDOS"><span className="submenu-icon submenu-icon-msdos"></span>MS-DOS Prompt</div>
                <div className="submenu-item" id="subOutlook"><span className="submenu-icon submenu-icon-outlook"></span>Outlook Express</div>
                <div className="submenu-item" id="subExplorer"><span className="submenu-icon submenu-icon-explorer"></span>Windoes Explorer</div>
            </div>

            <div ref={accessoriesSubmenuRef} className="programs-submenu accessories-submenu" id="accessoriesSubmenu">
                <div className="submenu-item submenu-item-arrow" id="subAccGames"><span className="submenu-icon submenu-icon-folder"></span>Games</div>
                <div className="context-menu-sep"></div>
                <div className="submenu-item" id="subAccCalculator"><span className="submenu-icon submenu-icon-calculator"></span>Calculator</div>
                <div className="submenu-item" id="subAccImaging"><span className="submenu-icon submenu-icon-imaging"></span>Imaging</div>
                <div className="submenu-item" id="subAccNotepad"><span className="submenu-icon submenu-icon-notepad"></span>Notepad</div>
                <div className="submenu-item" id="subAccPaint"><span className="submenu-icon submenu-icon-paint"></span>Paint</div>
                <div className="submenu-item" id="subAccWordPad"><span className="submenu-icon submenu-icon-wordpad"></span>WordPad</div>
            </div>

            <div ref={gamesSubmenuRef} className="programs-submenu games-submenu" id="gamesSubmenu">
                <div className="submenu-item" id="subGameAsciiRunner"><span className="submenu-icon submenu-icon-ascii-runner"></span>ASCII Runner</div>
                <div className="submenu-item" id="subGameMinesweeper"><span className="submenu-icon submenu-icon-minesweeper"></span>Minesweeper</div>
                <div className="submenu-item" id="subGameSolitaire"><span className="submenu-icon submenu-icon-solitaire"></span>Solitaire</div>
            </div>

            <div ref={shutdownDialogRef} className="dialog-overlay shutdown-dialog" id="shutdownDialog">
                <div className="dialog-box">
                    <div className="dialog-titlebar">
                        <span>Shut Down Windows</span>
                        <button className="ctrl-btn" id="shutdownCloseBtn" aria-label="Close">×</button>
                    </div>
                    <div className="dialog-body">
                        <div className="shutdown-question">
                            <img src="icons/my-computer.png" className="shutdown-computer-icon" alt="My Computer" draggable={false} />
                            <div className="dialog-text">What do you want the computer to do?</div>
                        </div>
                        <div className="shutdown-options">
                            <label><input type="radio" name="shutdownOption" value="shutdown" defaultChecked /> Shut down</label>
                            <label><input type="radio" name="shutdownOption" value="restart" /> Restart</label>
                            <label><input type="radio" name="shutdownOption" value="msdos" /> Restart in MS-DOS mode</label>
                        </div>
                    </div>
                    <div className="dialog-buttons">
                        <button className="dialog-btn" id="shutdownOkBtn">OK</button>
                        <button className="dialog-btn" id="shutdownCancelBtn">Cancel</button>
                        <button className="dialog-btn" id="shutdownHelpBtn">Help</button>
                    </div>
                </div>
            </div>
        </>
    );
}
