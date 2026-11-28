---
opened: 2026-11-28
---

# F017 · The Shut Down dialog dims the screen and uses 98 radio buttons

## Outcome

Opening Shut Down darkens the whole screen with the Windows 98 black checkerboard. Today the screen behind stays bright. The 98 radio buttons already landed with the shared edge rules (F011); their keyboard focus still shows Chromium's default ring, not the 98 dotted box.

## Scope

- Start in the shutdown dialog in `windoes/shell/StartMenu.jsx` and `windoes/styles/dialogs.css`.
- A 2x2 checkerboard overlay behind the dialog, removed when it closes.
- The radio focus indicator becomes the 98 dotted box around the label.
- Details: `spec/research/windoes-ui-fidelity/report.md`, section "Shut Down dialog".

## Out of scope

- A "Stand by" option or the Windows Me dropdown layout.

## Acceptance

- `capture.mjs` shows the checkerboard over the desktop while the dialog is open, and none after Cancel.
- A focused radio shows the dotted box around its label, not a browser focus ring.
- Arrow keys still move between options, and OK runs the chosen option.
