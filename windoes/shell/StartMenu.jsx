import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import WindoesApp from '../app-state.js';
import { TASKBAR_HEIGHT_PX } from '../constants.js';
import { useDialogFocus } from './dialog-focus.js';
import { useOutsideClick } from './outside-click.js';
import { MenuItem, Submenu } from './MenuItems.jsx';
import { ROOT_FAMILY, ROOT_ITEMS, SUBMENUS } from './start-menu-config.js';

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

export default function StartMenu({ startButtonRef }) {
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

  // Start-menu and submenu open flags are canonical reducer state (`menus`).
  // Submenu positioning, derived from DOM measurement, stays local.
  const startMenuOpen = WindoesApp.state.use((s) => s.menus.startOpen);
  const programsOpen = WindoesApp.state.use((s) => s.menus.programsOpen);
  const accessoriesOpen = WindoesApp.state.use((s) => s.menus.accessoriesOpen);
  const gamesOpen = WindoesApp.state.use((s) => s.menus.gamesOpen);
  const openByKey = { programs: programsOpen, accessories: accessoriesOpen, games: gamesOpen };
  const [submenuStyles, setSubmenuStyles] = useState(DEFAULT_SUBMENU_STYLES);

  // Per-submenu DOM handles, keyed so the config-driven render and the
  // positioning effect can look them up without bespoke per-panel wiring.
  const panelRefs = {
    programs: programsSubmenuRef,
    accessories: accessoriesSubmenuRef,
    games: gamesSubmenuRef,
  };
  const triggerRefs = {
    programs: menuProgramsRef,
    accessories: subAccessoriesRef,
    games: subAccGamesRef,
  };

  function keepSubmenus(keepKeys = []) {
    WindoesApp.state.dispatch({ type: 'MENU_SUBMENUS_KEEP', keep: keepKeys });
  }

  function closeAllMenus() {
    WindoesApp.state.dispatch({ type: 'START_MENU_CLOSE' });
  }

  function performShutdown() {
    WindoesApp.state.dispatch({ type: 'SHUTDOWN_SCREEN_SHOW' });
  }

  function performRestart() {
    WindoesApp.state.dispatch({ type: 'SHUTDOWN_SCREEN_HIDE' });
    location.reload();
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

  // Resolve a config `action` descriptor to a side-effecting handler.
  function resolveAction(action) {
    switch (action.kind) {
      case 'open':
        return () => WindoesApp.open[action.app]();
      case 'openApp':
        return () => WindoesApp.open.app(action.name, action.url);
      case 'error':
        return () =>
          WindoesApp.bsod.showErrorDialog({
            title: action.title,
            text: action.text,
            icon: action.icon,
          });
      case 'help':
        return showHelpDialog;
      case 'run':
        return () => WindoesApp.runDialog.open?.();
      case 'shutdown':
        return () => openShutdownDialog('shutdown');
      default:
        return () => {};
    }
  }

  // Activate a leaf item. The shutdown flow manages its own menu close (and
  // ordering with the click sound), so it is not wrapped in the auto-close.
  function onSelect(item) {
    const run = resolveAction(item.action);
    if (item.action.kind === 'shutdown') {
      run();
      return;
    }
    run();
    closeAllMenus();
  }

  // Parent/child panels a submenu may yield focus to without collapsing, used
  // by each panel's pointer-leave check.
  function getAdjacentEls(submenu) {
    const parentEl = submenu.parentKey
      ? panelRefs[submenu.parentKey].current
      : startMenuRef.current;
    const childEl = submenu.childKey ? panelRefs[submenu.childKey].current : null;
    return [parentEl, childEl];
  }

  useLayoutEffect(() => {
    let nextStyles = submenuStyles;

    for (const submenu of SUBMENUS) {
      if (!openByKey[submenu.key]) continue;
      const style = calcSubmenuStyle({
        submenuEl: panelRefs[submenu.key].current,
        triggerEl: triggerRefs[submenu.key].current,
        parentSubmenuEl: submenu.parentKey ? panelRefs[submenu.parentKey].current : null,
      });
      if (style && !areStylesEqual(submenuStyles[submenu.key], style)) {
        nextStyles = { ...nextStyles, [submenu.key]: style };
      }
    }

    if (nextStyles !== submenuStyles) {
      setSubmenuStyles(nextStyles);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startMenuOpen, programsOpen, accessoriesOpen, gamesOpen, submenuStyles]);

  const getStartMenuElements = useCallback(
    () => [
      startButtonRef?.current,
      startMenuRef.current,
      programsSubmenuRef.current,
      accessoriesSubmenuRef.current,
      gamesSubmenuRef.current,
    ],
    [startButtonRef]
  );

  useOutsideClick({
    enabled: startMenuOpen,
    getElements: getStartMenuElements,
    onOutsideClick: closeAllMenus,
  });

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
        onMouseLeave={(e) => {
          const programsSubmenu = programsSubmenuRef.current;
          if (programsSubmenu && !programsSubmenu.contains(e.relatedTarget)) {
            keepSubmenus([]);
          }
        }}
      >
        <div className="start-rail" aria-hidden={true}>
          <span className="rail-windoes">Windoes</span>
          <strong>XD</strong>
        </div>
        <div className="menu-list" role="none">
          {ROOT_ITEMS.map((item, i) => (
            <MenuItem
              key={item.id || `sep-${i}`}
              item={item}
              family={ROOT_FAMILY}
              keep={item.submenu ? [item.submenu] : []}
              expanded={item.submenu ? openByKey[item.submenu] : undefined}
              triggerRef={item.submenu ? triggerRefs[item.submenu] : undefined}
              onKeep={keepSubmenus}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>

      {SUBMENUS.map((submenu) => (
        <Submenu
          key={submenu.key}
          submenu={submenu}
          open={openByKey[submenu.key]}
          style={submenuStyles[submenu.key]}
          panelRef={panelRefs[submenu.key]}
          childTriggerRef={submenu.childKey ? triggerRefs[submenu.childKey] : null}
          openByKey={openByKey}
          onKeep={keepSubmenus}
          onSelect={onSelect}
          getAdjacentEls={() => getAdjacentEls(submenu)}
        />
      ))}

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
