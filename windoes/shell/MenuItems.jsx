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
 * @param {string[]} props.keep - Submenu keys this item keeps open.
 * @param {(keep: string[]) => void} props.onHover - Pointer entered: apply `keep` after the hover delay.
 * @param {(keep: string[]) => void} props.onOpen - Arrow item clicked: apply `keep` now.
 * @param {(item: object) => void} props.onSelect - Activate an action leaf.
 * @param {boolean} [props.expanded] - aria-expanded state for arrow items.
 * @param {import('react').Ref<HTMLButtonElement>} [props.triggerRef] - Arrow trigger ref.
 */
export function MenuItem({ item, family, keep, onHover, onOpen, onSelect, expanded, triggerRef }) {
  if (item.separator) {
    return <div className={family.separatorClass} role="separator"></div>;
  }

  const isArrow = Boolean(item.submenu);
  const className = `${family.itemBase}${isArrow ? ` ${family.itemBase}-arrow` : ''}`;
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
        onMouseEnter={() => onHover(keep)}
        onClick={() => onOpen(keep)}
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
      onMouseEnter={() => onHover(keep)}
      onClick={() => onSelect(item)}
    >
      {icon}
      {item.label}
    </button>
  );
}

/**
 * A cascading submenu panel. Open state is owned by the caller; leaving the
 * panel only reports `onPointerLeave`, so the open submenus stay as they are.
 *
 * @param {object} props
 * @param {object} props.submenu - Submenu config (`key`, `chain`, `items`, …).
 * @param {boolean} props.open
 * @param {object} props.style - Positioning style for this panel.
 * @param {import('react').Ref<HTMLDivElement>} props.panelRef
 * @param {import('react').Ref<HTMLButtonElement>|null} props.childTriggerRef - Ref for the arrow item, if any.
 * @param {Record<string, boolean>} props.openByKey - Open flag per submenu key (for aria-expanded).
 * @param {(keep: string[]) => void} props.onHover
 * @param {(keep: string[]) => void} props.onOpen
 * @param {(item: object) => void} props.onSelect
 * @param {() => void} props.onPointerLeave - Pointer left the panel.
 * @param {(e: import('react').KeyboardEvent) => void} [props.onKeyDown] - Panel-level keyboard navigation.
 */
export function Submenu({
  submenu,
  open,
  style,
  panelRef,
  childTriggerRef,
  openByKey,
  onHover,
  onOpen,
  onSelect,
  onPointerLeave,
  onKeyDown,
}) {
  return (
    <div
      ref={panelRef}
      className={`${submenu.className}${open ? ' open' : ''}`}
      id={submenu.domId}
      role="menu"
      aria-label={submenu.ariaLabel}
      style={style}
      onMouseLeave={onPointerLeave}
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
          onHover={onHover}
          onOpen={onOpen}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
