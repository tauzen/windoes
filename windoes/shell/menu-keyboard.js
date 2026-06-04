// Pure keyboard-navigation helpers for the Start menu and its cascading
// submenus. Deliberately free of React/DOM so the roving-focus arithmetic and
// the config lookups are unit-testable in isolation; `StartMenu.jsx` wires
// these to real `focus()` calls and reducer dispatches.

import { SUBMENUS } from './start-menu-config.js';

const SUBMENU_BY_KEY = new Map(SUBMENUS.map((submenu) => [submenu.key, submenu]));
// Each submenu's panel `domId` is also the `aria-controls` target of the arrow
// item that opens it, so this maps an arrow's controls-id back to its key.
const KEY_BY_CONTROLS_ID = new Map(SUBMENUS.map((submenu) => [submenu.domId, submenu.key]));

/**
 * Resolve an arrow keypress to the next roving-focus index within a menu panel,
 * wrapping around the ends. `currentIndex` may be -1 when nothing in the panel
 * is focused yet. Returns `null` for keys that don't move focus.
 *
 * @param {string} key - `KeyboardEvent.key`.
 * @param {number} currentIndex - Index of the focused item, or -1.
 * @param {number} length - Number of focusable items in the panel.
 * @returns {number | null}
 */
export function nextRovingIndex(key, currentIndex, length) {
  if (length <= 0) return null;

  switch (key) {
    case 'ArrowDown':
      return currentIndex < 0 ? 0 : (currentIndex + 1) % length;
    case 'ArrowUp':
      return currentIndex < 0 ? length - 1 : (currentIndex - 1 + length) % length;
    case 'Home':
      return 0;
    case 'End':
      return length - 1;
    default:
      return null;
  }
}

/**
 * The submenu key an arrow item opens, derived from its `aria-controls` id
 * (e.g. `"programsSubmenu"` → `"programs"`). Returns `null` for non-arrow ids.
 *
 * @param {string | null | undefined} controlsId
 * @returns {string | null}
 */
export function submenuKeyFromControlsId(controlsId) {
  return (controlsId && KEY_BY_CONTROLS_ID.get(controlsId)) || null;
}

/**
 * The chain of submenu keys to keep open when *entering* a submenu's panel
 * (ancestors included). Returns `null` for an unknown key.
 *
 * @param {string} key
 * @returns {string[] | null}
 */
export function chainForSubmenu(key) {
  const submenu = SUBMENU_BY_KEY.get(key);
  return submenu ? submenu.chain : null;
}

/**
 * The chain to keep open when *leaving* a submenu back toward its parent — its
 * own chain with the last (own) key dropped. Returns `null` for an unknown key.
 *
 * @param {string} key
 * @returns {string[] | null}
 */
export function parentChainForSubmenu(key) {
  const submenu = SUBMENU_BY_KEY.get(key);
  return submenu ? submenu.chain.slice(0, -1) : null;
}
