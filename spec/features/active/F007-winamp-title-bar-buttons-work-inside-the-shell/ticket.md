---
opened: 2026-11-27
---

# F007 · Winamp title-bar buttons work inside the shell

## Outcome

Inside Windoes, the shell lays a transparent drag area (x 0–261) and close button over Winamp's title bar. The options, minimize and shade buttons drawn there cannot be pressed, and the close button's pressed frame never shows. After this, every title-bar button responds, and the window still drags by its title bar.

## Scope

- Start at the headless window overlay in `windoes/styles/windows-ie.css` and the Winamp window setup in `windoes/app-windows.jsx`.
- Minimize uses the shell's window manager. Shade mode and the options menu are out of scope; their buttons show their pressed frame and do nothing else, as in the app on its own.
- Dragging stays possible on the title bar outside the buttons.

## Out of scope

- Winamp shade mode or an options menu.
- Other apps' title bars.

## Acceptance

- In the shell, pressing each title-bar button shows its pressed frame.
- Minimize minimizes Winamp to the taskbar, and close closes it.
- Dragging the title bar outside the buttons moves the window.
- The Winamp app suite and the sandbox test pass.
