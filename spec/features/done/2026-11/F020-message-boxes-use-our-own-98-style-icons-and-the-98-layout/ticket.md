---
opened: 2026-11-28
landed: 2026-11-28
---

# F020 · Message boxes use our own 98-style icons and the 98 layout

## Outcome

Error, warning and information boxes show crisp 32x32 pixel icons in the Windows 98 style, drawn for Windoes, and size themselves to their text the way 98 does. The Run dialog's buttons sit at the right. Today the icons are CSS shapes, every box is 340–480 px wide whatever the text, and the Run buttons are centred.

## Scope

- Start in `windoes/shell/ErrorDialog.jsx`, `windoes/shell/RunDialog.jsx` and `windoes/styles/dialogs.css`.
- Draw our own error, warning and information icons as pixel art (the Winamp text-source and build pattern from F005 is one option).
- Content-fit width with a maximum; one-line text centred on the icon; buttons 75x23, centred in message boxes and right-aligned in Run.
- Details: `spec/research/windoes-ui-fidelity/report.md`, sections "Message boxes" and "Run dialog".

## Out of scope

- Copying, tracing or extracting Microsoft icons.
- A help caption button or a combo box in Run.

## Acceptance

- `capture.mjs` shows the three icons pixel-sharp at 1x.
- A one-line message box is narrower than a long one, and its text is centred on the icon.
- Run's OK, Cancel and Browse buttons are right-aligned.
- The dialog tests pass.
