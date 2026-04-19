# Windoes Architecture Overview

This document summarizes the current shell architecture and module boundaries.

## High-level model

Windoes runs as a single React-rooted shell with a reducer-backed app state and imperative bridges for legacy integrations.

Core flow:

1. `windoes/main.js` boots the shell.
2. `windoes/app-state.ts` initializes the canonical store (`WindoesApp.state`).
3. Shell components render through React and subscribe to reducer slices.
4. `WindowManager` applies window lifecycle/view projection to DOM containers.
5. Embedded apps run in iframes under `windoes/public/applications/*`.

## Key modules

- `windoes/app-state.ts`
  - Canonical reducer store interface: `get`, `dispatch`, `subscribe`, `use`
  - Event-bus channels for one-shot imperative interactions
- `windoes/app-state-reducer.mjs`
  - Pure reducer and initial state
- `windoes/window-manager.jsx` + `windoes/window-manager/*`
  - Window orchestration and lifecycle projection
- `windoes/shell/*`
  - Taskbar, Start menu, dialogs, and context-menu UI
- `windoes/virtual-fs.ts`
  - IndexedDB-backed virtual file system used by Explorer/Notepad paths
- `windoes/fs-explorer.jsx`
  - Explorer view + navigation wiring

## Dataflow

- User interaction -> reducer action (`WindoesApp.state.dispatch`) -> updated state
- React subscribers (`WindoesApp.state.use(...)`) -> rerender relevant UI slices
- Imperative edge cases -> typed event bus channels (`WindoesApp.events.*`)

## Styling

`windoes/styles.css` is the entrypoint and imports feature-partial styles from `windoes/styles/*.css`.

## Testing stack

- Unit tests: `tests/node/*.test.js` via Node test runner
- Integration/E2E: Playwright suites via `tests/node/playwright-integration.test.js`
- Embedded app tests: per-app tests under each app directory

## Build and tooling

- Bundler/dev server: Vite (`vite.config.js`, root `windoes/`)
- Type bootstrap: `tsconfig.json` (allowJs/checkJs), initial `.ts` migrations in shell core modules
- Formatting/linting: Prettier + ESLint
