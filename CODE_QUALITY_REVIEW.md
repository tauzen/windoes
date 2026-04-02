# Code Quality & Maintainability Review

This review focuses on the JavaScript simulator in `windoes/` and the current test setup in `tests/`.

## What is already working well

- **Clear modular separation by concern** (`boot`, `window manager`, `desktop`, `start menu`, dialogs, app launchers), which makes navigation approachable for a small vanilla JS project.
- **A shared namespace (`WindoesApp`) avoids accidental global sprawl** and gives modules a common integration surface.
- **Template-based window creation in `WindowManager`** reduces repeated DOM boilerplate.
- **Automated tests exist for core window behavior and embedded apps**, which is a good base for future refactors.

## Key maintainability risks

## 1) Heavy reliance on implicit DOM contracts and hard-coded IDs

Many modules assume specific IDs/classes are present and immediately bind listeners (for example in `run-dialog.js` and `desktop.js`). This is fast to build, but fragile as UI structure evolves.

### Improvement

- Introduce a small **DOM contract layer** (`dom-refs.js`) that validates required elements once and exports stable references.
- Fail gracefully when an expected node is missing (warn + feature disable) instead of throwing at module load.
- Group selectors in one place to reduce brittle cross-file coupling.

### Impact

- Fewer runtime regressions after HTML/CSS changes.
- Easier onboarding and safer refactors.

---

## 2) `WindowManager` is becoming a god-object

`window-manager.js` currently mixes template rendering, lifecycle, z-index stack policy, control wiring, taskbar behavior, and maximize/minimize interactions.

### Improvement

Split responsibilities while preserving API compatibility:

- `window-factory.js`: pure DOM creation from templates.
- `window-stack.js`: z-order/focus rules.
- `window-controller.js`: behavior wiring (dragging, control buttons, taskbar toggling).
- Keep `WindoesApp.WindowManager` as a thin facade for backward compatibility.

### Impact

- Smaller files and functions.
- More targeted unit tests.
- Lower risk when adding new window features.

---

## 3) Dynamic HTML string assembly increases XSS/escaping and debugging risk

Modules build complex markup via `innerHTML` strings. This is manageable now, but it scales poorly and makes escaping rules easy to miss.

### Improvement

- For complex UI pieces (dialogs, window content), migrate to **DOM API builder helpers** (createElement + textContent) or `<template>` elements in HTML.
- Reserve `innerHTML` for trusted static snippets only.

### Impact

- Better safety posture and easier debugging.
- Finer-grained test assertions on DOM structure.

---

## 4) Testing breadth is decent, but lacks stable quality gates

Tests run, but there is no lint/typecheck pipeline and little guidance on coverage targets.

### Improvement

1. Add **ESLint + Prettier** with a minimal rule set first (`no-undef`, `no-unused-vars`, `eqeqeq`, consistent semicolons/quotes).
2. Add **JSDoc type checking** (`// @ts-check`) for critical modules before full TypeScript migration.
3. Introduce a CI workflow (GitHub Actions) that runs:
   - `npm ci`
   - `npm run test:all`
   - `npm run lint`
4. Track rough coverage trends (even if not enforced at first).

### Impact

- Prevents style/logic drift.
- Catches defects earlier than browser manual testing.

---

## 5) Configuration and behavior are partially mixed

Some behavior maps are configurable (`runActions`, `experimentApps`), while other feature toggles and labels remain hard-coded in JS.

### Improvement

- Expand config-driven patterns:
  - desktop icon definitions
  - app launcher metadata
  - dialog labels/messages where practical
- Keep defaults in code, but allow overrides from `simulator.config.js`.

### Impact

- Easier customization and experimentation.
- Less repetitive code edits for UI variants.

---

## 6) Accessibility and keyboard support need systematic pass

The UI emulates a desktop environment nicely, but ARIA semantics, focus management, and keyboard traversal are inconsistent.

### Improvement

- Add a focused accessibility checklist for:
  - dialog open/close focus trap and restore
  - keyboard activation parity for icons/menus
  - meaningful labels/roles for dynamic controls
- Add a few Playwright accessibility assertions for critical flows.

### Impact

- Better usability and inclusion.
- More resilient interaction model beyond pointer-only input.

## Recommended phased roadmap

### Phase 1 (1–2 days): Low-risk quality baseline

- Add ESLint/Prettier and lint scripts.
- Add DOM reference guard utility for top-level modules.
- Add contributor doc section: “how to add new windows/apps safely”.

### Phase 2 (2–4 days): Architecture hardening

- Extract `window-factory` and `window-stack` from `WindowManager`.
- Add focused unit tests around stack/focus behavior.

### Phase 3 (2–3 days): Safety and a11y

- Replace most complex `innerHTML` builders with templates/DOM helpers.
- Add keyboard/focus and ARIA improvements in dialogs and menus.

### Phase 4 (ongoing): Optional type-safety path

- Enable `// @ts-check` + JSDoc in core modules.
- Evaluate incremental TS conversion for `window-manager` and boot orchestration only after phases 1–3.

## Quick wins to start this week

1. Add linting + formatting tooling.
2. Add `dom-refs` utility with null guards.
3. Extract at least one `WindowManager` concern (stack logic) into a pure module with tests.
4. Add keyboard test for Start menu open/close + Run dialog Enter/Escape behavior.
