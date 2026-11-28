---
opened: 2026-11-28
---

# F010 · Taskbar buttons show Windows 98 active and inactive states

## Outcome

The taskbar reads like Windows 98: a 28 px bar, inactive task buttons with normal-weight labels, and the active task button bold on a white-and-silver checkerboard. Today every task label is bold and the active button is plain grey, so the user cannot tell the active window from the taskbar at a glance.

## Scope

- Start in `windoes/styles/taskbar.css`; keep the touch overrides in `windoes/styles/responsive.css` below 700 px.
- 28 px taskbar with the 98 top edge, 22 px buttons, Start and task buttons on the shared raised and sunken edges, label offset 1 px when pressed.
- Tray well edge and the Quick Launch grip.
- Details: `spec/research/windoes-ui-fidelity/report.md`, section "Taskbar".

## Out of scope

- The taskbar right-click menu (F008).
- Tray and Quick Launch icons.

## Acceptance

- `capture.mjs` measures a 28 px taskbar and 22 px task buttons.
- With two windows open, only the active task label is bold, and the active button shows the checkerboard.
- Pressing a task button moves its label 1 px right and down.
- Maximised windows still end exactly at the taskbar's top edge.

## Notes

Uses the shared 98 edge rules from the bevel ticket (F011). Touches the same component as F008; land them one after the other.
