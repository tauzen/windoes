# Windoes

A Windows 98-inspired desktop simulator built with vanilla HTML, CSS, and JavaScript, bundled with Vite.

Windoes recreates a retro desktop UX with draggable windows, taskbar behavior, Start menu interactions, desktop icons, and built-in mini apps.

## Live demo

https://tauzen.github.io/windoes/

## What is included

- Boot flow + retro dialogs (`boot.js`, `bsod.js`, `utility-windows.js`)
- Desktop shell and taskbar (`desktop.js`, `start-menu.js`, `window-manager.js`)
- Windowed app launching (`app-windows.js`, `ie-window.js`, `run-dialog.js`)
- Virtual file system and explorer-style navigation (`virtual-fs.js`, `fs-explorer.js`)
- Built-in applications under `windoes/public/applications/`:
  - ASCII Runner
  - Minesweeper
  - Solitaire
  - Winamp Player

## Project structure

```text
windoes/
  main.js                app entrypoint
  index.html             shell markup
  styles.css             global styles
  simulator.config.js    app/window configuration
  public/
    icons/               desktop/start menu icon assets
    img/                 boot screen assets
    applications/        embedded app bundles + app-level tests
tests/                   top-level simulator test suite
.github/workflows/       CI + deploy workflows
```

## Local development

Requirements:

- Node.js 18+
- npm

Install dependencies:

```bash
npm ci
npm run install:apps
```

Start the dev server:

```bash
npm run dev
```

Then open the local URL shown by Vite (usually `http://localhost:5173`).

## Build and preview

```bash
npm run build
npm run preview
```

## Tests

Run simulator tests:

```bash
npm test
```

Run embedded app tests:

```bash
npm run test:apps
```

Run everything:

```bash
npm run test:all
```

## Contributing

- Create a feature branch from `main`
- Keep commits focused and descriptive
- Run `npm run test:all` before opening a PR

### Note about deploy-key automation

When Hermes contributes with deploy-key access:

- Hermes can push branches
- Hermes cannot open PRs directly via API
- Hermes will provide a PR creation link for manual submission
