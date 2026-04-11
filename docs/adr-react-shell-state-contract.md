# ADR: React Shell State Contract and Compatibility Boundaries

Status: Accepted (Phase 1 roadmap baseline)

## Context
Windoes currently runs a single React root shell, but some behavior is still wired through imperative global handles (`window.WindoesApp.*`) and direct DOM listeners.

To finish the migration, we need one canonical state contract and explicit limits on what imperative APIs remain allowed.

## Decision
The React shell contract uses `WindoesApp.state` as the canonical store during migration.

### Canonical state slices
- `boot`
  - phase/progress/status and completion
- `menus`
  - start/program/accessories/games and context-menu open state
- `dialogs`
  - run/error/shutdown/notepad dialog visibility
- `windows`
  - stack/focus and lifecycle state (open/minimized/focused/z-index/maximized)
- `selection`
  - desktop/explorer selected item
- `drag`
  - drag activity + source metadata

## Compatibility layer policy (`WindoesApp`)
`WindoesApp` remains as a temporary bridge for legacy modules and iframe-facing integration points.

### Allowed imperative APIs (during migration)
- `WindoesApp.state.get`
- `WindoesApp.state.dispatch`
- `WindoesApp.state.subscribe`
- `WindoesApp.state.use`
- `WindoesApp.sound.*` (non-UI side effects)

### Deprecated bridge namespaces and migration targets
- `WindoesApp.dom` → React refs/hooks + component-owned state
- `WindoesApp.boot` → reducer actions from boot controller components
- `WindoesApp.bsod` → dialog actions in React shell reducer/components
- `WindoesApp.open` → typed window actions and reducer-driven lifecycle
- `WindoesApp.menu` → reducer-driven menu state + component handlers
- `WindoesApp.ie` / `WindoesApp.helpers` → explicit feature-local module exports

## Consequences
- New shell features should be reducer-first and component-event-driven.
- Adding new global mutable handles is disallowed.
- Existing bridge APIs may remain only for transitional compatibility and should be removed phase-by-phase.

## Implementation notes
- Keep IDs/classes stable while migrating behavior wiring.
- Preserve behavior parity with Playwright tests while replacing imperative paths.
- Embedded app bundles under `windoes/public/applications/*` are outside this ADR scope.
