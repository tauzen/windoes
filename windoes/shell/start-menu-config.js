// Data-driven model for the Start menu and its cascading submenus.
//
// Each entry is plain, serializable data: an `id`/`label`/`icon` plus either an
// `action` descriptor (resolved to a handler in `StartMenu.jsx`), a `submenu`
// key (an arrow item that opens a nested panel), or `{ separator: true }`.
//
// Hover behaviour is derived from each submenu's `chain` — the list of submenu
// keys that must stay open while the pointer is inside that panel — so the menu
// no longer needs a bespoke `onXEnter`/`onXLeave` handler per item. See
// `StartMenu.jsx` for how the chain drives keep/leave.

/** Top-level Start-menu items (rendered with the `menu-*` class family). */
export const ROOT_ITEMS = [
  {
    id: 'menuWindoesUpdate',
    icon: 'winupdate',
    label: 'Windoes Update',
    action: { kind: 'open', app: 'internetExplorer' },
  },
  { separator: true },
  { id: 'menuPrograms', icon: 'programs', label: 'Programs', submenu: 'programs' },
  { id: 'menuHelp', icon: 'help', label: 'Help', action: { kind: 'help' } },
  { id: 'menuRun', icon: 'run', label: 'Run...', action: { kind: 'run' } },
  { separator: true },
  {
    id: 'menuShutdown',
    icon: 'shutdown',
    label: 'Shut Down...',
    extraClass: 'menu-shutdown',
    action: { kind: 'shutdown' },
  },
];

/**
 * Cascading submenus, parent-before-child. `chain` lists the open submenu keys
 * for this panel (ancestors included); `parentKey`/`childKey` describe the
 * cascade used for pointer-leave and positioning.
 */
export const SUBMENUS = [
  {
    key: 'programs',
    domId: 'programsSubmenu',
    ariaLabel: 'Programs',
    className: 'programs-submenu',
    chain: ['programs'],
    parentKey: null,
    childKey: 'games',
    items: [
      { id: 'subGames', icon: 'folder', label: 'Games', submenu: 'games' },
      { separator: true },
      {
        id: 'subNotepad',
        icon: 'notepad',
        label: 'Notepad',
        action: { kind: 'open', app: 'notepad' },
      },
      { id: 'subPaint', icon: 'paint', label: 'Paint', action: { kind: 'open', app: 'paint' } },
      {
        id: 'subWordPad',
        icon: 'wordpad',
        label: 'WordPad',
        action: { kind: 'open', app: 'notepad' },
      },
      { separator: true },
      {
        id: 'subIE',
        icon: 'ie',
        label: 'Internet Explorer',
        action: { kind: 'open', app: 'internetExplorer' },
      },
      {
        id: 'subExplorer',
        icon: 'explorer',
        label: 'Windoes Explorer',
        action: { kind: 'open', app: 'myComputer' },
      },
    ],
  },
  {
    key: 'games',
    domId: 'gamesSubmenu',
    ariaLabel: 'Games',
    className: 'programs-submenu games-submenu',
    chain: ['programs', 'games'],
    parentKey: 'programs',
    childKey: null,
    items: [
      {
        id: 'subGameAsciiRunner',
        icon: 'ascii-runner',
        label: 'ASCII Runner',
        action: {
          kind: 'openApp',
          name: 'ASCII Runner',
          url: './applications/ascii-runner/index.html',
        },
      },
      {
        id: 'subGameMinesweeper',
        icon: 'minesweeper',
        label: 'Minesweeper',
        action: { kind: 'open', app: 'minesweeper' },
      },
      {
        id: 'subGameSolitaire',
        icon: 'solitaire',
        label: 'Solitaire',
        action: { kind: 'open', app: 'solitaire' },
      },
    ],
  },
];

/** Class families: top-level Start menu vs. the cascading submenus. */
export const ROOT_FAMILY = {
  itemBase: 'menu-item',
  iconBase: 'menu-icon',
  separatorClass: 'menu-separator',
};

export const SUBMENU_FAMILY = {
  itemBase: 'submenu-item',
  iconBase: 'submenu-icon',
  separatorClass: 'context-menu-sep',
};
