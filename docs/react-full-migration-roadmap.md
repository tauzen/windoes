# React Shell Migration Roadmap (to Full React)

## Goal
Move Windoes from the current hybrid React + imperative DOM model to a fully React-driven shell, with minimal compatibility glue.

---

## Phase 1 — Freeze architecture contract

### Deliverables
- Define a single React state contract for shell behavior:
  - `boot`
  - `menus`
  - `dialogs`
  - `windows` (open/minimized/focused/z-index/maximized)
  - `selection`
  - `drag`
- Document `WindoesApp` as temporary compatibility layer only.

### Checklist
- [x] Add architecture section to README or dedicated ADR doc.
- [x] Enumerate allowed cross-module imperative APIs.
- [x] Mark deprecated `WindoesApp.*` handles with migration target.

---

## Phase 2 — Remove DOM-query event wiring

### Deliverables
- Replace `document.getElementById(...)` + manual listeners with React props/refs/hooks.
- Keep behavior identical for:
  - Start menu
  - Run dialog
  - Context menus
  - Error/Notepad dialogs

### Checklist
- [ ] Move click/keydown handlers into component-level React handlers.
- [ ] Remove global document listeners where avoidable.
- [ ] Ensure cleanup for any remaining global listeners in `useEffect`.

---

## Phase 3 — Make window lifecycle declarative

### Deliverables
- Drive window state from React reducer/store.
- Keep a thin adapter for existing imperative callers during transition.

### Checklist
- [ ] Open/close/minimize/restore/focus/z-index controlled by state.
- [ ] Taskbar button state derived from reducer state.
- [ ] Drag/maximize interactions dispatch actions, not direct DOM mutations.
- [ ] Keep parity with existing WindowManager tests.

---

## Phase 4 — React-first integrations (Explorer/Notepad/Overlays)

### Deliverables
- Finish migration of explorer context actions and notepad save flows to React-first event paths.
- Reduce callback registry usage (`WindoesApp.*`) to strict minimum.

### Checklist
- [ ] Explorer menu actions flow through React state + typed action handlers.
- [ ] Notepad dialogs + file menu fully controlled by React state/events.
- [ ] Drag overlay controlled by React state, no external imperative toggles unless strictly needed.

---

## Phase 5 — Remove compatibility layer

### Deliverables
- Delete obsolete stub modules and deprecated handles.
- Retain only minimal bridge APIs required for iframe apps.

### Checklist
- [ ] Remove unused `WindoesApp.*` handles.
- [ ] Remove deprecated module shims/stubs.
- [ ] Confirm no behavior regressions after cleanup.

---

## Quality gates (every phase)

### Automated
- [ ] `npm test` passes.
- [ ] No new test snapshots/baselines needed unless intentional.

### Manual smoke
- [ ] Boot flow completes.
- [ ] Desktop icons open expected windows.
- [ ] Start menu + Run dialog work.
- [ ] Error and Notepad dialogs function.
- [ ] Explorer actions work (new folder / rename / delete).
- [ ] Show Desktop + taskbar restore behavior remains correct.

---

## PR strategy
- Keep changes in small PRs (one subsystem at a time).
- Preferred sequence:
  1. Event wiring cleanup
  2. Declarative window lifecycle
  3. Explorer/Notepad React-first flow
  4. Compatibility layer removal
- Each PR should include:
  - concise scope
  - risks
  - test output
  - manual smoke checklist results
