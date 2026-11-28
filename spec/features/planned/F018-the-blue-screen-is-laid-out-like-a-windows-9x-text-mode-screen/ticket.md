---
opened: 2026-11-28
---

# F018 · The blue screen is laid out like a Windows 9x text-mode screen

## Outcome

The blue screen looks like a Windows 9x text-mode screen: a centred 80-column block, the highlighted " Windows " title centred above it, a centred footer, grey body text with white emphasis, and a VGA-style monospace font at 1:1 line height. Today the text sits at the top left with wide line spacing and white body text.

## Scope

- Start in `windoes/bsod.jsx`, `windoes/shell/BootScreens.jsx` and the `.bsod` rules in `windoes/styles/base.css`.
- Body #AAAAAA, emphasis #FFFFFF, 16 px line height.
- Details: `spec/research/windoes-ui-fidelity/report.md`, section "Blue screen".

## Out of scope

- The BIOS boot screen and the splash.
- New blue screen messages.

## Acceptance

- `capture.mjs` shows the text block centred horizontally, 80 columns wide.
- The title and footer are centred; the body is #AAAAAA.
- A key press still dismisses the blue screen.
