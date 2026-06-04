# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Changed

- Code-quality Phase 3: migrated Start-menu and submenu open state into the
  canonical `menus` reducer slice (`START_MENU_TOGGLE`/`START_MENU_CLOSE`/
  `MENU_SUBMENUS_KEEP`), removing the `startMenuOpen` prop-drilling, the
  `submenuOpen` local component state, and the entire `WindoesApp.startMenu.*`
  imperative bridge (consumed by the taskbar, Run dialog, and launch helpers).
- Code-quality Phase 3: unified the paint/explorer/notepad VirtualFS-init
  guards behind a single tested single-flight memoizer (`windoes/once.mjs`),
  removing three module-level `let` flags (`paintFsInitPromise`,
  `fsInitialized`, `fsReady`) and fixing a latent concurrent-init race in the
  explorer's `initFS`.
- Code-quality Phase 3: migrated Notepad's current-document path off the
  `textarea.dataset.filePath` DOM-as-state into a `notepad.currentFilePath`
  reducer field (`NOTEPAD_SET_FILE_PATH`). The titlebar now renders from state
  via a `NotepadTitleText` component instead of `#notepadTitle.textContent`
  mutations, and the window menubar `aria-label` no longer breaks when a window
  uses a reactive (non-string) title.
- Code-quality Phase 3: migrated Internet Explorer history off module-level
  `historyStack`/`historyIndex` variables into a canonical `browser` reducer
  slice (`BROWSER_NAVIGATE`/`BROWSER_BACK`/`BROWSER_FORWARD`/
  `BROWSER_HISTORY_RESET`), with unit tests. `ie-window.jsx` now reads/writes
  history through `WindoesApp.state`, the first imperative subsystem retired
  per the migration roadmap.
- Code-quality Phase 2: brought the embedded apps under ESLint (removed the
  `windoes/public/applications/**` ignore) and cleared the dead code it
  surfaced (`game.js` unused effect/touch state, an unused test binding).
- Code-quality Phase 2: enabled TypeScript `strict` mode for the checked
  modules, adding `@types/react`/`@types/react-dom` and tightening
  `virtual-fs.ts`, `listener-set.mjs`, and `app-state.ts` to satisfy it.
- Code-quality Phase 2: replaced the loose reducer action `@typedef` with a
  discriminated `WindoesAction` union plus explicit `State` typedefs in
  `app-state-reducer.mjs`, and removed the `as never` dispatch cast in
  `app-state.ts`.
- Code-quality Phase 1: promoted `no-unused-vars`, `react/jsx-key`, and
  `no-implicit-globals` ESLint rules from `warn` to `error`, and added
  `eslint-plugin-react-hooks` (`rules-of-hooks: error`, `exhaustive-deps: warn`).
- Code-quality Phase 1: extracted magic constants (boot delay, IE loading
  timeout, taskbar-label truncation budgets, default Notepad save path) into
  `windoes/constants.js`.
- Phase 6 H5: split `windoes/styles.css` into feature partials under `windoes/styles/*.css`.
- Phase 6 H1: added TypeScript bootstrap (`tsconfig.json`) and migrated core modules to `.ts`:
  - `windoes/app-state.ts`
  - `windoes/virtual-fs.ts`
- Phase 6 G4: adopted npm workspaces for embedded apps and removed per-app install workflow.
- Added root `typecheck` script and included typecheck in `npm run test:all`.

### Added

- `CONTRIBUTING.md`
- `docs/architecture.md`
- `docs/adr-react-shell-state-contract.md` (the state contract referenced by the README)
