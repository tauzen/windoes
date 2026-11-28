---
opened: 2026-11-28
landed: 2026-11-28
---

# F009 · Window title bars and frames match Windows 98

## Outcome

Every Windoes window and dialog has the Windows 98 caption and frame: an 18 px title bar with the navy-to-blue gradient when active and the grey gradient with grey text when inactive, a 4 px frame in the 98 bevel order, and caption buttons drawn as crisp 1-bit glyphs. Today the bar is 22 px, uses Windows 2000 colours, keeps white text when inactive, and draws `_ □ ×` as blurred text.

## Scope

- Start in `windoes/styles/windows-ie.css`, `windoes/styles/dialogs.css` (`.dialog-titlebar`) and `windoes/window-manager/window-renderers.jsx`.
- Active #000080 → #1084D0, inactive #808080 → #C0C0C0 with #C0C0C0 text; 18 px caption; 16x14 buttons with a 2 px gap before Close.
- Our own 1-bit minimise, maximise, restore and close glyphs (inline SVG or CSS), pressed state sunken with the glyph offset 1 px.
- Maximised windows drop the frame. Their height belongs to the taskbar ticket (F010), which owns `--taskbar-height`.
- Details: `spec/research/windoes-ui-fidelity/report.md`, section "Window chrome".

## Out of scope

- Window icons, the resize grip and the minimise animation.
- The headless Winamp window, which draws its own title bar.

## Acceptance

- `capture.mjs` shows an 18 px title bar with the 98 active and inactive colours on Notepad and a dialog.
- Caption glyphs are pixel-sharp at 1x, with no anti-aliased edge in the capture.
- A maximised Notepad shows no frame.
- The window manager and dialog tests pass.

## Notes

Uses the shared 98 edge rules that landed with F011. Runs in parallel with the taskbar ticket (F010); do not edit the maximised height rule in `windows-ie.css`.
