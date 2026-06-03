# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Changed

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
