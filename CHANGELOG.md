# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Changed

- Phase 6 H5: split `windoes/styles.css` into feature partials under `windoes/styles/*.css`.
- Phase 6 H1: added TypeScript bootstrap (`tsconfig.json`) and migrated core modules to `.ts`:
  - `windoes/app-state.ts`
  - `windoes/virtual-fs.ts`
- Phase 6 G4: adopted npm workspaces for embedded apps and removed per-app install workflow.
- Added root `typecheck` script and included typecheck in `npm run test:all`.

### Added

- `CONTRIBUTING.md`
- `docs/architecture.md`
