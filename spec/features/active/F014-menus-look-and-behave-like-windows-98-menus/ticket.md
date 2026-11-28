---
opened: 2026-11-28
---

# F014 · Menus look and behave like Windows 98 menus

## Outcome

Menu bars, dropdowns and context menus look like Windows 98 menus: a menu bar item shows a thin raised frame on hover and a thin sunken frame when open, with no navy fill; disabled items are embossed; and submenu arrows sit at the right edge. Today the menu bar turns navy and disabled items are flat grey. The 98 menu frame and the removal of the drop shadow already landed with the shared edge rules (F011).

## Scope

- Start in `windoes/styles/menus.css`, `windoes/styles/windows-ie.css` (`.menubar`) and `windoes/shell/DesktopContextMenu.jsx`.
- 98 row heights.
- Disabled items: #808080 text with a #FFFFFF copy 1 px down and right.
- The "New" arrow uses the existing arrow class, not a literal character.
- Details: `spec/research/windoes-ui-fidelity/report.md`, section "Menus".

## Out of scope

- The Start menu (F015).
- Making the other menu bar items in Notepad, My Computer and IE open menus.
- Mnemonic underlines.

## Acceptance

- In `capture.mjs`, Notepad's File item shows a raised frame on hover and a sunken frame when open, with no navy fill.
- The desktop context menu's disabled items are embossed.
- The "New" submenu arrow sits at the menu's right edge.
- The existing menu tests pass.
