# ADR: React shell state contract

_Status: Accepted (documents current state) · Last updated: 2026-05-31_

## Context

Windoes began as an imperative DOM application driven by a global
`window.WindoesApp.*` namespace. It is being migrated to a React 19 shell
backed by a single pure reducer. During the migration two state mechanisms
coexist, so this ADR defines the **canonical** state contract and the
**boundary** of the legacy compatibility layer, so new code lands on the
right side of the line.

## Decision

### 1. There is one canonical store

Shell state lives in a single store defined in `windoes/app-state.ts`, built on
React's `useSyncExternalStore`. The store is the only sanctioned long-term
imperative surface, exposed as `WindoesApp.state`:

| Member                         | Purpose                                           |
| ------------------------------ | ------------------------------------------------- |
| `WindoesApp.state.get()`       | Read the current immutable state snapshot.        |
| `WindoesApp.state.dispatch()`  | Send an action to the reducer.                    |
| `WindoesApp.state.subscribe()` | Subscribe to changes (returns an unsubscribe fn). |
| `WindoesApp.state.use(sel)`    | React hook with a selector for component reads.   |

`dispatch` short-circuits when the reducer returns the same reference
(`app-state.ts:33-39`), so no-op actions don't re-render.

### 2. State is reduced, not mutated

State transitions happen only in the pure reducer `app-state-reducer.mjs`
(`reduce(state, action)`). The reducer:

- is a `switch` over `action.type`,
- returns new objects for changed slices and the **same reference** otherwise,
- contains no side effects (no DOM, no I/O, no timers).

It is unit-tested in isolation (`tests/node/reducer.test.js`).

### 3. Canonical state slices

`initialState` (`app-state-reducer.mjs`) defines the contract. New shell state
belongs in one of these slices, not in module-level variables or the DOM:

| Slice       | Owns                                                                |
| ----------- | ------------------------------------------------------------------- |
| `boot`      | BIOS/splash boot phases and progress.                               |
| `menus`     | Start-menu / context-menu open flags.                               |
| `dialogs`   | Run / error / shutdown / notepad dialog visibility.                 |
| `windows`   | `stack`, `focusedId`, and `byId` window records (the window model). |
| `selection` | Selected desktop icon / explorer item.                              |
| `explorer`  | Explorer context-menu position and selected path.                   |
| `notepad`   | Notepad file-menu, save-dialog, and current document path.          |
| `browser`   | Internet Explorer history stack and current position.               |

Window focus and z-index are **derived** from `windows.stack` by
`recomputeWindowMeta` — they are never set directly.

### 4. Action shape

Actions are `{ type: string, ...payload }`. The action union is currently
documented as a JSDoc `@typedef` at the top of `app-state-reducer.mjs` and cast
with `as never` at the dispatch boundary (`app-state.ts:34`). Tightening this
into a checked discriminated union is tracked as Phase 2 of the code-quality
roadmap (see `docs/code-quality-report.md`).

Action types in use today, grouped by slice:

- **boot**: `BOOT_RESET`, `BOOT_BIOS_PROGRESS`, `BOOT_BIOS_STATUS`,
  `BOOT_PHASE_SPLASH`, `BOOT_SPLASH_PROGRESS`, `BOOT_FINISH`
- **menus**: `START_MENU_TOGGLE`, `START_MENU_CLOSE`, `MENU_SUBMENUS_KEEP`
- **windows**: `WINDOW_REGISTER`, `WINDOW_OPEN`, `WINDOW_CLOSE`,
  `WINDOW_FOCUS`, `WINDOW_MINIMIZE`, `WINDOW_RESTORE`, `WINDOW_MAXIMIZE_TOGGLE`
- **dialogs**: `SHUTDOWN_DIALOG_OPEN`, `SHUTDOWN_DIALOG_CLOSE`,
  `SHUTDOWN_SCREEN_SHOW`, `SHUTDOWN_SCREEN_HIDE`
- **explorer**: `EXPLORER_CONTEXT_OPEN`, `EXPLORER_CONTEXT_CLOSE`
- **notepad**: `NOTEPAD_FILE_MENU_OPEN`, `NOTEPAD_FILE_MENU_CLOSE`,
  `NOTEPAD_SAVE_DIALOG_OPEN`, `NOTEPAD_SAVE_DIALOG_CLOSE`,
  `NOTEPAD_SAVE_DIALOG_SET_PATH`, `NOTEPAD_SET_FILE_PATH`
- **browser**: `BROWSER_NAVIGATE`, `BROWSER_BACK`, `BROWSER_FORWARD`,
  `BROWSER_HISTORY_RESET`

### 5. The `WindoesApp.*` bridge is legacy-only

Beyond `WindoesApp.state`, `WindoesApp.config`, and the typed `WindoesApp.events`
buses, the namespace carries runtime-filled service handles
(`open`, `bsod`, `ui`, `browser`, `WindowManager`, …) populated by feature
modules at import time. These exist **only as a compatibility bridge** and are
burned down one subsystem at a time — e.g. the former `WindoesApp.startMenu`
imperative handle was removed once the Start menu moved to the `menus` slice.

**Rule for new code:** implement new shell behavior as reducer actions plus
React component handlers. Do not add new global imperative handles, new
module-level `let` state, or new DOM-as-state writes (`textContent`,
`dataset`, cached `querySelector` results). The `WindoesApp.*` reference count
is tracked as a burn-down metric (143 at the time of the code-quality report).

## Consequences

- A single source of truth for shell state that is testable without a DOM.
- A clear, reviewable boundary: a PR adding a new `WindoesApp.<service>` handle
  is going the wrong way; a PR adding a reducer action + selector is going the
  right way.
- The compatibility layer can be burned down one subsystem at a time without a
  big-bang rewrite (see Phase 3 of `docs/code-quality-report.md`).

## References

- `windoes/app-state.ts` — store and namespace
- `windoes/app-state-reducer.mjs` — reducer and `initialState`
- `tests/node/reducer.test.js` — reducer unit tests
- `docs/architecture.md` — system overview
- `docs/code-quality-report.md` — migration roadmap and metrics
