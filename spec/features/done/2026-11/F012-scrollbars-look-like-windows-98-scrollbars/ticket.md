---
opened: 2026-11-28
landed: 2026-11-28
---

# F012 · Scrollbars look like Windows 98 scrollbars

## Outcome

Scrolling views in the shell show Windows 98 scrollbars: 16 px wide, raised 16x16 arrow buttons, a checkerboard track and a raised thumb. Today no rule styles them, so each user sees their own browser's modern scrollbar, which is the most visible modern element in an open window.

## Scope

- Start in `windoes/styles/base.css` with `::-webkit-scrollbar` rules for the bar, buttons with drawn arrows, track, thumb and corner, on the shared raised edge.
- Firefox fallback: `scrollbar-color` in the 98 greys.
- Notepad shows both bars when Word Wrap is off.
- Details: `spec/research/windoes-ui-fidelity/report.md`, section "Scrollbars".

## Out of scope

- Scrollbars inside embedded apps (Winamp, Paint, games), which own their own styles.
- Custom JavaScript scrollbars.

## Acceptance

- In Chromium at 1x, Notepad with long text shows a 16 px bar with arrow buttons, a checkerboard track and a raised thumb.
- Arrow buttons and the thumb show a sunken state while pressed.
- Firefox shows grey scrollbars in the 98 colours.
- Scrolling by wheel, keyboard and drag still works in Notepad, Explorer and IE.

## Notes

Uses the shared 98 edge rules from the bevel ticket (F011).
