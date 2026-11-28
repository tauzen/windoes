---
opened: 2026-11-28
---

# F017 · The Shut Down dialog dims the screen and uses 98 radio buttons

## Outcome

Opening Shut Down darkens the whole screen with the Windows 98 black checkerboard, and the dialog's options use drawn 98 radio buttons. Today the screen behind stays bright and the radios are the browser's blue circles.

## Scope

- Start in the shutdown dialog in `windoes/shell/StartMenu.jsx` and `windoes/styles/dialogs.css`.
- A 2x2 checkerboard overlay behind the dialog, removed when it closes.
- 12x12 radio buttons drawn with `appearance: none`, in a shared class other dialogs can reuse.
- Details: `spec/research/windoes-ui-fidelity/report.md`, sections "Shut Down dialog" and "Push buttons and form controls".

## Out of scope

- A "Stand by" option or the Windows Me dropdown layout.

## Acceptance

- `capture.mjs` shows the checkerboard over the desktop while the dialog is open, and none after Cancel.
- The radios render as 98 radios in checked, unchecked and focused states.
- Arrow keys still move between options, and OK runs the chosen option.
