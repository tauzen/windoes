import { useLayoutEffect, useRef, useState } from 'react';
import WindoesApp from '../app-state.js';
import { TASKBAR_HEIGHT_PX } from '../constants.js';
import { useDialogFocus } from './dialog-focus.js';

const DEFAULT_SUBMENU_STYLES = {
  programs: {},
  accessories: {},
  games: {},
};

function areStylesEqual(a = {}, b = {}) {
  return a.left === b.left && a.bottom === b.bottom;
}

function calcSubmenuStyle({ submenuEl, triggerEl, parentSubmenuEl }) {
  if (!submenuEl || !triggerEl) return null;

  const triggerRect = triggerEl.getBoundingClientRect();
  const submenuRect = submenuEl.getBoundingClientRect();

  let left;
  if (parentSubmenuEl) {
    const parentRect = parentSubmenuEl.getBoundingClientRect();
    left = parentRect.right;
    if (left + submenuRect.width > window.innerWidth) {
      left = parentRect.left - submenuRect.width;
    }
  }

  let bottom = window.innerHeight - triggerRect.top - triggerRect.height;
  const minBottom = TASKBAR_HEIGHT_PX;
  const maxBottom = Math.max(minBottom, window.innerHeight - submenuRect.height);
  bottom = Math.max(minBottom, Math.min(bottom, maxBottom));

  return {
    ...(typeof left === 'number' ? { left: `${left}px` } : {}),
    bottom: `${bottom}px`,
  };
}

export default function StartMenu({ startButtonRef, startMenuOpen, setStartMenuOpen }) {
  const bootDone = WindoesApp.state.use((s) => s.boot.done);
  const startMenuRef = useRef(null);
  const programsSubmenuRef = useRef(null);
  const accessoriesSubmenuRef = useRef(null);
  const gamesSubmenuRef = useRef(null);
  const menuProgramsRef = useRef(null);
  const subAccessoriesRef = useRef(null);
  const subAccGamesRef = useRef(null);
  const shutdownDialogRef = useRef(null);
  const shutdownOkBtnRef = useRef(null);

  const shutdownOpen = WindoesApp.state.use((s) => s.dialogs.shutdownOpen);
  const shutdownScreenVisible = WindoesApp.state.use((s) => s.dialogs.shutdownScreenVisible);
  const shellVisible = bootDone && !shutdownScreenVisible;
  const [shutdownOption, setShutdownOption] = useState('shutdown');
  const [submenuOpen, setSubmenuOpen] = useState({
    programs: false,
    accessories: false,
    games: false,
  });
  const [submenuStyles, setSubmenuStyles] = useState(DEFAULT_SUBMENU_STYLES);

  function closeOtherSubmenus(...keepKeys) {
    if (!startMenuOpen) {
      setSubmenuOpen({ programs: false, accessories: false, games: false });
      return;
    }

    const keep = new Set(keepKeys);
    setSubmenuOpen({
      programs: keep.has('programs'),
      accessories: keep.has('accessories'),
      games: keep.has('games'),
    });
  }

  function closeSubmenus() {
    closeOtherSubmenus();
  }

  function closeAllMenus() {
    setStartMenuOpen(false);
    closeSubmenus();
  }

  function onProgramsEnter() {
    closeOtherSubmenus('programs');
  }

  function onSubAccessoriesEnter() {
    closeOtherSubmenus('programs', 'accessories');
  }

  function onSubAccGamesEnter() {
    closeOtherSubmenus('programs', 'accessories', 'games');
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
      closeSubmenus();
    }
  }

  function onAccessoriesLeave(e) {
    const programsSubmenu = programsSubmenuRef.current;
    const gamesSubmenu = gamesSubmenuRef.current;
    if (!programsSubmenu || !gamesSubmenu) return;

    if (!programsSubmenu.contains(e.relatedTarget) && !gamesSubmenu.contains(e.relatedTarget)) {
      closeOtherSubmenus('programs');
    }
  }

  function onGamesLeave(e) {
    const accessoriesSubmenu = accessoriesSubmenuRef.current;
    if (accessoriesSubmenu && !accessoriesSubmenu.contains(e.relatedTarget)) {
      closeOtherSubmenus('programs', 'accessories');
    }
  }

  function performShutdown() {
    WindoesApp.state.dispatch({ type: 'SHUTDOWN_SCREEN_SHOW' });
  }

  function performRestart() {
    WindoesApp.state.dispatch({ type: 'SHUTDOWN_SCREEN_HIDE' });
    location.reload();
  }

  function runAction(handler) {
    handler();
    closeAllMenus();
  }

  function showHelpDialog() {
    WindoesApp.bsod.showErrorDialog({
      title: 'Windoes Help',
      text: 'Help is not available for this program.\n\nTry searching online at microsoft.com for help topics.',
      icon: 'info',
    });
  }

  function openShutdownDialog(defaultOption = 'shutdown') {
    closeAllMenus();
    setShutdownOption(defaultOption);
    WindoesApp.state.dispatch({ type: 'SHUTDOWN_DIALOG_OPEN' });
    WindoesApp.sound.playClickSound();
  }

  useLayoutEffect(() => {
    if (!startMenuOpen) {
      setSubmenuOpen({ programs: false, accessories: false, games: false });
    }
  }, [startMenuOpen]);

  useLayoutEffect(() => {
    let nextStyles = submenuStyles;

    if (submenuOpen.programs) {
      const style = calcSubmenuStyle({
        submenuEl: programsSubmenuRef.current,
        triggerEl: menuProgramsRef.current,
      });
      if (style && !areStylesEqual(submenuStyles.programs, style)) {
        nextStyles = { ...nextStyles, programs: style };
      }
    }

    if (submenuOpen.accessories) {
      const style = calcSubmenuStyle({
        submenuEl: accessoriesSubmenuRef.current,
        triggerEl: subAccessoriesRef.current,
        parentSubmenuEl: programsSubmenuRef.current,
      });
      if (style && !areStylesEqual(submenuStyles.accessories, style)) {
        nextStyles = { ...nextStyles, accessories: style };
      }
    }

    if (submenuOpen.games) {
      const style = calcSubmenuStyle({
        submenuEl: gamesSubmenuRef.current,
        triggerEl: subAccGamesRef.current,
        parentSubmenuEl: accessoriesSubmenuRef.current,
      });
      if (style && !areStylesEqual(submenuStyles.games, style)) {
        nextStyles = { ...nextStyles, games: style };
      }
    }

    if (nextStyles !== submenuStyles) {
      setSubmenuStyles(nextStyles);
    }
  }, [startMenuOpen, submenuOpen, submenuStyles]);

  useLayoutEffect(() => {
    WindoesApp.startMenu.closeSubmenus = closeSubmenus;
    WindoesApp.startMenu.closeAll = closeAllMenus;
    WindoesApp.startMenu.isOpen = () => !!startMenuOpen;

    WindoesApp.startMenu.toggle = () => {
      setStartMenuOpen((open) => {
        const nextOpen = !open;
        if (!nextOpen) {
          closeSubmenus();
        }
        WindoesApp.sound.playClickSound();
        return nextOpen;
      });
    };

    return () => {
      delete WindoesApp.startMenu.closeSubmenus;
      delete WindoesApp.startMenu.closeAll;
      delete WindoesApp.startMenu.isOpen;
      delete WindoesApp.startMenu.toggle;
    };
  }, [setStartMenuOpen, startMenuOpen]);

  useLayoutEffect(() => {
    const startMenuEl = startMenuRef.current;
    const startButton = startButtonRef?.current;
    if (!startMenuEl || !startButton) return undefined;

    function onDocumentClick(e) {
      const programsSubmenu = programsSubmenuRef.current;
      const accessoriesSubmenu = accessoriesSubmenuRef.current;
      const gamesSubmenu = gamesSubmenuRef.current;
      if (!programsSubmenu || !accessoriesSubmenu || !gamesSubmenu) return;

      if (
        !startButton.contains(e.target) &&
        !startMenuEl.contains(e.target) &&
        !programsSubmenu.contains(e.target) &&
        !accessoriesSubmenu.contains(e.target) &&
        !gamesSubmenu.contains(e.target)
      ) {
        closeAllMenus();
      }
    }

    document.addEventListener('click', onDocumentClick);

    return () => {
      document.removeEventListener('click', onDocumentClick);
    };
  }, [startButtonRef, setStartMenuOpen]);

  useDialogFocus({
    isOpen: shutdownOpen,
    dialogRef: shutdownDialogRef,
    initialFocusRef: shutdownOkBtnRef,
  });

  return (
    <>
      <div
        ref={startMenuRef}
        className={`start-menu${startMenuOpen ? ' open' : ''}`}
        id="startMenu"
        role="menu"
        aria-label="Start menu"
        style={{ display: shellVisible ? '' : 'none' }}
        onMouseLeave={onStartMenuLeave}
      >
        <div className="start-rail" aria-hidden={true}>
          <span className="rail-windoes">Windoes</span>
          <strong>XD</strong>
        </div>
        <div className="menu-list" role="none">
          <button
            type="button"
            role="menuitem"
            className="menu-item"
            id="menuWindoesUpdate"
            onMouseEnter={closeSubmenus}
            onClick={() => runAction(() => WindoesApp.open.internetExplorer())}
          >
            <span className="menu-icon menu-icon-winupdate" aria-hidden={true}></span>Windoes Update
          </button>
          <div className="menu-separator" role="separator"></div>
          <button
            ref={menuProgramsRef}
            type="button"
            role="menuitem"
            className="menu-item menu-item-arrow"
            id="menuPrograms"
            aria-haspopup="menu"
            aria-controls="programsSubmenu"
            aria-expanded={submenuOpen.programs ? 'true' : 'false'}
            onMouseEnter={onProgramsEnter}
          >
            <span className="menu-icon menu-icon-programs" aria-hidden={true}></span>Programs
          </button>
          <button
            type="button"
            role="menuitem"
            className="menu-item"
            id="menuHelp"
            onMouseEnter={closeSubmenus}
            onClick={() => runAction(showHelpDialog)}
          >
            <span className="menu-icon menu-icon-help" aria-hidden={true}></span>Help
          </button>
          <button
            type="button"
            role="menuitem"
            className="menu-item"
            id="menuRun"
            onMouseEnter={closeSubmenus}
            onClick={() => runAction(() => WindoesApp.runDialog.open?.())}
          >
            <span className="menu-icon menu-icon-run" aria-hidden={true}></span>Run...
          </button>
          <div className="menu-separator" role="separator"></div>
          <button
            type="button"
            role="menuitem"
            className="menu-item menu-shutdown"
            id="menuShutdown"
            onMouseEnter={closeSubmenus}
            onClick={() => openShutdownDialog('shutdown')}
          >
            <span className="menu-icon menu-icon-shutdown" aria-hidden={true}></span>Shut Down...
          </button>
        </div>
      </div>

      <div
        ref={programsSubmenuRef}
        className={`programs-submenu${submenuOpen.programs ? ' open' : ''}`}
        id="programsSubmenu"
        role="menu"
        aria-label="Programs"
        style={submenuStyles.programs}
        onMouseLeave={onProgramsLeave}
      >
        <button
          ref={subAccessoriesRef}
          type="button"
          role="menuitem"
          className="submenu-item submenu-item-arrow"
          id="subAccessories"
          aria-haspopup="menu"
          aria-controls="accessoriesSubmenu"
          aria-expanded={submenuOpen.accessories ? 'true' : 'false'}
          onMouseEnter={onSubAccessoriesEnter}
        >
          <span className="submenu-icon submenu-icon-folder" aria-hidden={true}></span>Accessories
        </button>
        <div className="context-menu-sep" role="separator"></div>
        <button
          type="button"
          role="menuitem"
          className="submenu-item"
          id="subIE"
          onMouseEnter={() => closeOtherSubmenus('programs')}
          onClick={() => runAction(() => WindoesApp.open.internetExplorer())}
        >
          <span className="submenu-icon submenu-icon-ie" aria-hidden={true}></span>Internet Explorer
        </button>
        <button
          type="button"
          role="menuitem"
          className="submenu-item"
          id="subMSDOS"
          onMouseEnter={() => closeOtherSubmenus('programs')}
          onClick={() =>
            runAction(() =>
              WindoesApp.bsod.showErrorDialog({
                title: 'MS-DOS Prompt',
                text: 'This program cannot be run in Windoes mode.',
                icon: 'error',
              })
            )
          }
        >
          <span className="submenu-icon submenu-icon-msdos" aria-hidden={true}></span>MS-DOS Prompt
        </button>
        <button
          type="button"
          role="menuitem"
          className="submenu-item"
          id="subOutlook"
          onMouseEnter={() => closeOtherSubmenus('programs')}
          onClick={() =>
            runAction(() =>
              WindoesApp.bsod.showErrorDialog({
                title: 'Outlook Express',
                text: 'No Internet mail server is configured.\n\nPlease check your mail settings in Internet Accounts.',
                icon: 'info',
              })
            )
          }
        >
          <span className="submenu-icon submenu-icon-outlook" aria-hidden={true}></span>Outlook
          Express
        </button>
        <button
          type="button"
          role="menuitem"
          className="submenu-item"
          id="subExplorer"
          onMouseEnter={() => closeOtherSubmenus('programs')}
          onClick={() => runAction(() => WindoesApp.open.myComputer())}
        >
          <span className="submenu-icon submenu-icon-explorer" aria-hidden={true}></span>Windoes
          Explorer
        </button>
      </div>

      <div
        ref={accessoriesSubmenuRef}
        className={`programs-submenu accessories-submenu${submenuOpen.accessories ? ' open' : ''}`}
        id="accessoriesSubmenu"
        role="menu"
        aria-label="Accessories"
        style={submenuStyles.accessories}
        onMouseLeave={onAccessoriesLeave}
      >
        <button
          ref={subAccGamesRef}
          type="button"
          role="menuitem"
          className="submenu-item submenu-item-arrow"
          id="subAccGames"
          aria-haspopup="menu"
          aria-controls="gamesSubmenu"
          aria-expanded={submenuOpen.games ? 'true' : 'false'}
          onMouseEnter={onSubAccGamesEnter}
        >
          <span className="submenu-icon submenu-icon-folder" aria-hidden={true}></span>Games
        </button>
        <div className="context-menu-sep" role="separator"></div>
        <button
          type="button"
          role="menuitem"
          className="submenu-item"
          id="subAccCalculator"
          onMouseEnter={() => closeOtherSubmenus('programs', 'accessories')}
          onClick={() =>
            runAction(() =>
              WindoesApp.bsod.showErrorDialog({
                title: 'Calculator',
                text: 'Calculator is not available in this version of Windoes.',
                icon: 'info',
              })
            )
          }
        >
          <span className="submenu-icon submenu-icon-calculator" aria-hidden={true}></span>
          Calculator
        </button>
        <button
          type="button"
          role="menuitem"
          className="submenu-item"
          id="subAccImaging"
          onMouseEnter={() => closeOtherSubmenus('programs', 'accessories')}
          onClick={() =>
            runAction(() =>
              WindoesApp.bsod.showErrorDialog({
                title: 'Windoes',
                text: 'This feature is not available in this version of Windoes.',
                icon: 'info',
              })
            )
          }
        >
          <span className="submenu-icon submenu-icon-imaging" aria-hidden={true}></span>Imaging
        </button>
        <button
          type="button"
          role="menuitem"
          className="submenu-item"
          id="subAccNotepad"
          onMouseEnter={() => closeOtherSubmenus('programs', 'accessories')}
          onClick={() => runAction(() => WindoesApp.open.notepad())}
        >
          <span className="submenu-icon submenu-icon-notepad" aria-hidden={true}></span>Notepad
        </button>
        <button
          type="button"
          role="menuitem"
          className="submenu-item"
          id="subAccPaint"
          onMouseEnter={() => closeOtherSubmenus('programs', 'accessories')}
          onClick={() =>
            runAction(() =>
              WindoesApp.bsod.showErrorDialog({
                title: 'Paint',
                text: 'Not enough memory to open Paint.\n\nClose some programs and try again.',
                icon: 'error',
              })
            )
          }
        >
          <span className="submenu-icon submenu-icon-paint" aria-hidden={true}></span>Paint
        </button>
        <button
          type="button"
          role="menuitem"
          className="submenu-item"
          id="subAccWordPad"
          onMouseEnter={() => closeOtherSubmenus('programs', 'accessories')}
          onClick={() => runAction(() => WindoesApp.open.notepad())}
        >
          <span className="submenu-icon submenu-icon-wordpad" aria-hidden={true}></span>WordPad
        </button>
      </div>

      <div
        ref={gamesSubmenuRef}
        className={`programs-submenu games-submenu${submenuOpen.games ? ' open' : ''}`}
        id="gamesSubmenu"
        role="menu"
        aria-label="Games"
        style={submenuStyles.games}
        onMouseLeave={onGamesLeave}
      >
        <button
          type="button"
          role="menuitem"
          className="submenu-item"
          id="subGameAsciiRunner"
          onClick={() =>
            runAction(() =>
              WindoesApp.open.app('ASCII Runner', './applications/ascii-runner/index.html')
            )
          }
        >
          <span className="submenu-icon submenu-icon-ascii-runner" aria-hidden={true}></span>ASCII
          Runner
        </button>
        <button
          type="button"
          role="menuitem"
          className="submenu-item"
          id="subGameMinesweeper"
          onClick={() => runAction(() => WindoesApp.open.minesweeper())}
        >
          <span className="submenu-icon submenu-icon-minesweeper" aria-hidden={true}></span>
          Minesweeper
        </button>
        <button
          type="button"
          role="menuitem"
          className="submenu-item"
          id="subGameSolitaire"
          onClick={() => runAction(() => WindoesApp.open.solitaire())}
        >
          <span className="submenu-icon submenu-icon-solitaire" aria-hidden={true}></span>Solitaire
        </button>
      </div>

      <div
        className={`dialog-overlay shutdown-dialog${shutdownOpen ? ' active' : ''}`}
        id="shutdownDialog"
      >
        <div ref={shutdownDialogRef} className="dialog-box">
          <div className="dialog-titlebar">
            <span>Shut Down Windows</span>
            <button
              className="ctrl-btn"
              id="shutdownCloseBtn"
              aria-label="Close"
              onClick={() => WindoesApp.state.dispatch({ type: 'SHUTDOWN_DIALOG_CLOSE' })}
            >
              ×
            </button>
          </div>
          <div className="dialog-body">
            <div className="shutdown-question">
              <img
                src="icons/my-computer.png"
                className="shutdown-computer-icon"
                alt="My Computer"
                draggable={false}
              />
              <div className="dialog-text">What do you want the computer to do?</div>
            </div>
            <div className="shutdown-options">
              <label>
                <input
                  type="radio"
                  name="shutdownOption"
                  value="shutdown"
                  checked={shutdownOption === 'shutdown'}
                  onChange={() => setShutdownOption('shutdown')}
                />{' '}
                Shut down
              </label>
              <label>
                <input
                  type="radio"
                  name="shutdownOption"
                  value="restart"
                  checked={shutdownOption === 'restart'}
                  onChange={() => setShutdownOption('restart')}
                />{' '}
                Restart
              </label>
              <label>
                <input
                  type="radio"
                  name="shutdownOption"
                  value="msdos"
                  checked={shutdownOption === 'msdos'}
                  onChange={() => setShutdownOption('msdos')}
                />{' '}
                Restart in MS-DOS mode
              </label>
            </div>
          </div>
          <div className="dialog-buttons">
            <button
              ref={shutdownOkBtnRef}
              className="dialog-btn"
              id="shutdownOkBtn"
              onClick={() => (shutdownOption === 'shutdown' ? performShutdown() : performRestart())}
            >
              OK
            </button>
            <button
              className="dialog-btn"
              id="shutdownCancelBtn"
              onClick={() => WindoesApp.state.dispatch({ type: 'SHUTDOWN_DIALOG_CLOSE' })}
            >
              Cancel
            </button>
            <button
              className="dialog-btn"
              id="shutdownHelpBtn"
              onClick={() =>
                WindoesApp.bsod.showErrorDialog({
                  title: 'Windoes Help',
                  text: 'Help is not available for Shut Down.\n\nFor more information, click Start, and then click Help.',
                  icon: 'info',
                })
              }
            >
              Help
            </button>
          </div>
        </div>
      </div>

      {shutdownScreenVisible ? (
        <div
          id="shutdownScreen"
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FF8000',
            fontSize: '24px',
            fontFamily: '"MS Sans Serif", sans-serif',
            background: '#000',
            zIndex: 99998,
            textAlign: 'center',
          }}
        >
          <div>
            <div>It's now safe to turn off</div>
            <div>your computer.</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
