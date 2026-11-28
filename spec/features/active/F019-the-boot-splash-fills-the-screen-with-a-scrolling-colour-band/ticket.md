---
opened: 2026-11-28
---

# F019 · The boot splash fills the screen with a scrolling colour band

## Outcome

The boot splash looks like the Windows 98 startup screen: the splash image fills the screen, and a thin colour band scrolls along the bottom, with no progress bar or status text. Today it is a 400 px image with rounded corners on black, a blue progress bar and status text.

## Scope

- Start in `windoes/shell/BootScreens.jsx`, `windoes/boot.js` and `windoes/styles/base.css`.
- Full-screen image with `object-fit`, no radius; a 10 px animated colour band at the bottom.
- Real asset preloading still decides when the splash ends; it no longer draws a bar.
- Details: `spec/research/windoes-ui-fidelity/report.md`, section "Boot screen".

## Out of scope

- The splash image art and the BIOS screen.

## Acceptance

- `capture.mjs` shows the splash image at full screen with no rounded corners, and the band at the bottom.
- No progress bar or status text appears during boot.
- The boot preload test passes, and the desktop appears only after preloading ends.
