---
opened: 2026-11-28
---

# F016 · Desktop icons behave like Windows 98 desktop icons

## Outcome

Desktop icons look and react like Windows 98: labels without a text shadow, no highlight on hover, a navy-tinted image and label when selected, and a 75 px grid. Today labels have a black shadow, hovering paints them navy, and icons sit closer than in 98.

## Scope

- Start in `windoes/styles/desktop.css`.
- Remove the label shadow and the hover rule; keep `.selected`.
- Selected icons get a navy checkerboard over the image.
- 75x75 grid cell.
- Details: `spec/research/windoes-ui-fidelity/report.md`, section "Desktop".

## Out of scope

- The icon images themselves.
- Explorer folder views.

## Acceptance

- `capture.mjs` shows desktop labels with no shadow.
- Hovering an icon changes nothing; selecting it tints the image and highlights the label.
- Icons sit on a 75 px vertical pitch.
- Double-click, selection and drag on desktop icons still work.
