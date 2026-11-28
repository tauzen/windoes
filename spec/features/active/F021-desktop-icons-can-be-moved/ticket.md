---
opened: 2026-11-28
---

# F021 · Desktop icons can be moved

## Outcome

A user can drag a desktop icon to a different place on the desktop and arrange icons to suit their workflow. Today icons stay in their original cells when dragged. Moving an icon must not accidentally open it or break normal selection and activation.

## Scope

- Start with desktop icon handling in `windoes/shell/Desktop.jsx` and layout in `windoes/styles/desktop.css`.
- Support pointer dragging within the usable desktop area, including touch, without covering the taskbar or making an icon unreachable.
- Keep selection and double-click activation working; a completed drag is not an activation.
- Preserve positions across a page reload and handle a smaller viewport without losing access to icons.

## Out of scope

- Dragging files between the desktop and Explorer or onto application windows.
- New desktop icons or changes to their artwork.

## Acceptance

- Drag an icon to a different position: it remains there after release and the application does not open.
- Reload the page: the icon returns to its chosen position.
- Clicking selects an icon and double-clicking opens it, before and after moving it.
- Dragging on a touch-sized viewport works, and icons remain accessible after resizing the viewport.
- Existing desktop and window interaction checks pass.
