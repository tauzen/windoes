---
opened: 2026-11-28
---

# F013 · UI text renders in a crisp 8 pt pixel font

## Outcome

All shell UI text renders as a crisp, aliased pixel font close to the Windows 98 8 pt UI font, the same on every operating system. Today no user sees the 98 look: the stack asks for MS Sans Serif, but browsers render Liberation Sans, Microsoft Sans Serif with ClearType, or Tahoma, anti-aliased with colour fringes.

## Scope

- Choose one openly licensed pixel UI font (regular and bold, designed for 11 px), self-host it under `windoes/public/`, and record its licence in the PR.
- Define the font once in a `--ui-font` variable in `windoes/styles/base.css`; other rules use `font: inherit`.
- Toolbar labels move from 10 px to the 11 px UI size.
- Notepad uses a fixed-pitch bitmap-style font close to Fixedsys.
- Details: `spec/research/windoes-ui-fidelity/report.md`, sections "Fonts" and "Notepad".

## Out of scope

- Microsoft fonts in any form.
- Fonts inside embedded apps.

## Acceptance

- `capture.mjs` shows the new font in the taskbar, menus, dialogs and title bars, with no anti-aliased colour fringes at 1x.
- A grep finds the UI font stack in one place only.
- The font files and their licence text are in the repository, and the licence allows redistribution.

## Notes

Open owner question: approve the chosen font and its licence before this ticket starts.
