---
opened: 2026-11-28
---

# F015 · The Start menu opens like the Windows 98 Start menu

## Outcome

The Start menu has the Windows 98 shape and timing: 32 px icons in about 36 px rows at the root, tight 16 px submenu rows, the 98 navy-to-blue side banner, drawn arrows, and submenus that open after a 400 ms hover instead of at once. Today root rows are 26 px with 16 px icons, and Programs opens within 60 ms and closes the moment the pointer leaves.

## Scope

- Start in `windoes/shell/StartMenu.jsx`, `windoes/shell/MenuItems.jsx` and `windoes/styles/menus.css`.
- A 400 ms hover timer opens and switches submenus; it is cancelled when the pointer leaves, and the open submenu stays while the pointer crosses other items.
- Banner #000080 → #1084D0, keeping the "WindoesXD" text.
- Arrows drawn as a 4x7 solid triangle at the right edge.
- Details: `spec/research/windoes-ui-fidelity/report.md`, sections "Start menu" and "Behaviour".

## Out of scope

- New Start menu entries (Favorites, Documents, Settings, Find, Log Off).
- The open slide animation.

## Acceptance

- `capture.mjs` measures root rows of about 36 px with 32 px icons, and submenu rows of about 20 px.
- A test shows that Programs is closed at 200 ms of hover and open at 500 ms.
- Moving the pointer briefly across another item does not close the open submenu.
- Keyboard navigation of the Start menu still works.
