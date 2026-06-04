// Presentational building blocks for the Start menu, driven by the data model
// in `start-menu-config.js`. These render markup only; all behaviour (which
// submenus to keep open, what an item does) is passed in as callbacks so the
// same components serve both the root menu and every nested submenu.

import { SUBMENU_FAMILY } from './start-menu-config.js';

/**
 * A single menu entry: a separator, an action leaf, or an arrow item that opens
 * a child submenu. `family` selects the `menu-*` vs `submenu-*` class set.
 *
 * @param {object} props
 * @param {object} props.item - Config entry from `start-menu-config.js`.
 * @param {{ itemBase: string, iconBase: string, separatorClass: string }} props.family
 * @param {string[]} props.keep - Submenu keys to keep open while hovered.
 * @param {(keep: string[]) => void} props.onKeep - Apply the keep set on hover.
 * @param {(item: object) => void} props.onSelect - Activate an action leaf.
 * @param {boolean} [props.expanded] - aria-expanded state for arrow items.
 * @param {import('react').Ref<HTMLButtonElement>} [props.triggerRef] - Arrow trigger ref.
 */
export function MenuItem({ item, family, keep, onKeep, onSelect, expanded, triggerRef }) {
  if (item.separator) {
    return <div className={family.separatorClass} role="separator"></div>;
  }

  const isArrow = Boolean(item.submenu);
  const className =
    `${family.itemBase}${isArrow ? ` ${family.itemBase}-arrow` : ''}` +
    `${item.extraClass ? ` ${item.extraClass}` : ''}`;
  const icon = (
    <span
      className={`${family.iconBase} ${family.iconBase}-${item.icon}`}
      aria-hidden={true}
    ></span>
  );

  if (isArrow) {
    return (
      <button
        ref={triggerRef}
        type="button"
        role="menuitem"
        className={className}
        id={item.id}
        aria-haspopup="menu"
        aria-controls={`${item.submenu}Submenu`}
        aria-expanded={expanded ? 'true' : 'false'}
        onMouseEnter={() => onKeep(keep)}
      >
        {icon}
        {item.label}
      </button>
    );
  }

  return (
    <button
      type="button"
      role="menuitem"
      className={className}
      id={item.id}
      onMouseEnter={() => onKeep(keep)}
      onClick={() => onSelect(item)}
    >
      {icon}
      {item.label}
    </button>
  );
}

/**
 * A cascading submenu panel. Pointer-leave keeps the parent chain open unless
 * the pointer moved into the parent or child panel (the `adjacentEls`).
 *
 * @param {object} props
 * @param {object} props.submenu - Submenu config (`key`, `chain`, `items`, …).
 * @param {boolean} props.open
 * @param {object} props.style - Positioning style for this panel.
 * @param {import('react').Ref<HTMLDivElement>} props.panelRef
 * @param {import('react').Ref<HTMLButtonElement>|null} props.childTriggerRef - Ref for the arrow item, if any.
 * @param {Record<string, boolean>} props.openByKey - Open flag per submenu key (for aria-expanded).
 * @param {(keep: string[]) => void} props.onKeep
 * @param {(item: object) => void} props.onSelect
 * @param {() => (HTMLElement|null)[]} props.getAdjacentEls - Parent/child panels for leave checks.
 * @param {(e: import('react').KeyboardEvent) => void} [props.onKeyDown] - Panel-level keyboard navigation.
 */
export function Submenu({
  submenu,
  open,
  style,
  panelRef,
  childTriggerRef,
  openByKey,
  onKeep,
  onSelect,
  getAdjacentEls,
  onKeyDown,
}) {
  function onMouseLeave(e) {
    const stayInside = getAdjacentEls().some((el) => el && el.contains(e.relatedTarget));
    if (stayInside) return;
    onKeep(submenu.chain.slice(0, -1));
  }

  return (
    <div
      ref={panelRef}
      className={`${submenu.className}${open ? ' open' : ''}`}
      id={submenu.domId}
      role="menu"
      aria-label={submenu.ariaLabel}
      style={style}
      onMouseLeave={onMouseLeave}
      onKeyDown={onKeyDown}
    >
      {submenu.items.map((item, i) => (
        <MenuItem
          key={item.id || `sep-${i}`}
          item={item}
          family={SUBMENU_FAMILY}
          keep={item.submenu ? [...submenu.chain, item.submenu] : submenu.chain}
          expanded={item.submenu ? openByKey[item.submenu] : undefined}
          triggerRef={item.submenu ? childTriggerRef : undefined}
          onKeep={onKeep}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
