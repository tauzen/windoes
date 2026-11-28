---
opened: 2026-11-28
landed: 2026-11-28
---

# F011 · Every raised and sunken edge uses the Windows 98 bevel

## Outcome

Buttons, fields, menus, views and window frames all use the Windows 98 four-colour 3D edge: outer #FFFFFF/#000000 and inner #DFDFDF/#808080. Today about 100 hand-written one-side borders use one or two colours and miss the black outer shadow, so controls look flat. This ticket is the base the other shell fidelity tickets build on.

## Scope

- Start in `windoes/styles/base.css`: palette variables (`--button-face`, `--button-hilight`, `--button-light`, `--button-shadow`, `--button-dk-shadow`) and `raised`, `sunken`, `field` and `window` edge rules.
- Replace the hand-written edges in `dialogs.css`, `menus.css`, `notepad-explorer.css` and the form controls with those rules.
- Push buttons: the 98 default-button outline, the pressed edge with the label offset 1 px, and the dotted focus box inside the face.
- Tooltip colour #FFFFE1.
- Details: `spec/research/windoes-ui-fidelity/report.md`, sections "Palette and 3D edges" and "Push buttons and form controls".

## Out of scope

- Title bars, taskbar and scrollbars (their own tickets reuse these rules).
- Fonts.

## Acceptance

- A grep finds no `inset`/`outset` border keywords and no hand-written two-colour bevels in the shell styles.
- In `capture.mjs`, a dialog button, a text field and a menu frame show the four 98 edge colours at the right pixels.
- The default button in a message box has the 1 px black outline; a pressed button moves its label 1 px.
- All existing shell tests pass.
