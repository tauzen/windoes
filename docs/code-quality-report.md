# Windoes — Code Quality Report

_Originally authored: 2026-05-31 · Branch: `claude/amazing-hypatia-0daRl` · Commit: `d0e9ecc`_

_Last synced with codebase: 2026-06-04 — **Phases 1–3 complete** (roadmap items
1–9) **plus Phase 4 item 10**. Only Phase 4 items 11–12 remain open. Per-item
progress is annotated inline below._

A Windows-98-inspired desktop simulator (React 19 + JS/JSX, two `.ts` modules,
Vite 8, Playwright). Shell code lives in `windoes/`; five embedded apps live
under `windoes/public/applications/`. This report covers maintainability, not
runtime correctness.

---

## 1. Executive summary

The project is in **good baseline health**. Tooling is wired up and green, the
state core (reducer + virtual filesystem) is well designed and tested, and the
codebase is small (~3k LOC of shell + ~1.7k LOC for the largest app). The main
quality risk called out at authoring time — **architectural drift** from the
in-progress `window.WindoesApp.*` → React/reducer migration — has since been
substantially paid down: the four imperative subsystems flagged in Phase 3 now
live in the reducer, lint/type coverage has been tightened, and the previously
missing docs now exist. The remaining `WindoesApp.*` bridge is the legacy
compatibility layer described in the ADR, burned down one subsystem at a time.

The table below shows the signals as measured at the 2026-06-04 sync (originals
in parentheses where they have moved).

| Signal                                           | Result                                                 |
| ------------------------------------------------ | ------------------------------------------------------ |
| `npm run lint` (eslint)                          | ✅ clean, with only non-blocking hook warnings         |
| `npm run typecheck` (tsc, `strict: true`)        | ✅ clean                                               |
| `TODO`/`FIXME`/`console.log`/`debugger` in shell | ✅ none                                                |
| Reducer unit tests                               | ✅ expanded reducer coverage                           |
| CI (lint + unit + integration + typecheck)       | ✅ configured (`.github/workflows/test.yml`)           |
| Lint/format coverage of embedded apps            | ✅ now linted (ignore removed)                         |
| `WindoesApp.*` imperative bridge                 | ⚠️ still present as the legacy bridge described by ADR |
| Docs referenced but missing                      | ✅ none known (all referenced docs live under `docs/`) |

The remaining ESLint output is limited to non-blocking
`react-hooks/exhaustive-deps` guidance surfaced by the newly-added
`eslint-plugin-react-hooks`.

**Overall grade: B+ / A−.** Roadmap items 1–10 are complete (all of Phases 1–3
plus the Phase 4 Start-menu decomposition); the foundation is now backed by
stricter gates and a documented state contract. Only the Phase 4 polish items
11–12 (async-error surfacing, menu keyboard nav) remain.

---

## 2. Strengths

- **Clean tooling gates.** ESLint and `tsc --noEmit` pass, with hook dependency
  guidance kept as non-blocking lint output. Prettier + Husky + `lint-staged`
  enforce formatting on commit. CI runs the full `test:all` matrix on every
  non-`main` push.
- **Well-architected virtual filesystem** (`windoes/virtual-fs.ts`). Dedicated
  error classes (`FileNotFoundError`, `FileExistsError`, …), single-transaction
  atomic `rename`/`rm` (`virtual-fs.ts:410`), `readdir` caching with
  `BroadcastChannel` cross-tab invalidation (`virtual-fs.ts:154-167`), and
  defensive `normalizePath` that collapses `//` and resolves `.`/`..`
  (`virtual-fs.ts:45-66`). This is the strongest file in the repo.
- **Clean reducer core.** `app-state-reducer.mjs` is a pure, switch-based
  reducer with immutable updates and helper combinators (`withWindowState`,
  `recomputeWindowMeta`, `withDialogs`). Dedicated unit tests in
  `tests/node/reducer.test.js` cover the reducer in isolation.
- **Reasonable store design.** `app-state.ts` uses `useSyncExternalStore` with a
  selector hook and reference-equality dispatch short-circuit
  (`app-state.ts:33-39`) — the right primitive for React 19.
- **Layered styling.** CSS was split from a monolith into feature partials
  under `windoes/styles/*` (per CHANGELOG).
- **Good accessibility intent.** Extensive `aria-*`, `role="menu"`/`menuitem`,
  `aria-expanded`/`aria-haspopup` usage in the Start menu; a dedicated
  axe-core accessibility test (`tests/test-axe-accessibility.js`).

---

## 3. Key findings

### 3.1 Incomplete imperative→React migration (highest-impact)

The README itself flags this: _"`WindoesApp` should be treated as a temporary
bridge for legacy integration only."_ In practice the bridge is **pervasive,
not temporary**:

- **143** references to runtime-filled `WindoesApp.*` namespaces
  (`open`, `startMenu`, `ui`, `WindowManager`, `browser`, …) across **21**
  files.
- **27** module-level `let` mutable variables in shell files hold state that
  lives outside the reducer (e.g. IE history stack in `ie-window.jsx`, an
  `fsReady` flag and notepad file path in `utility-windows.jsx`, a paint-FS init
  promise cache in `app-windows.jsx`).
- Window state effectively exists in **three** representations: the reducer
  (`windows.byId`), the `WindowManager` imperative layer, and direct DOM
  mutations (e.g. `appWindowTitle.textContent = title` in `app-windows.jsx:58`,
  `textarea.dataset.filePath` in the notepad flow).

**Why it matters:** the two models can desync, the same behavior is expressed
two ways depending on the file, and onboarding requires understanding both. This
is the root cause behind most of the file-level smells below.

### 3.2 Documentation references point at missing files

- README §"Architecture contract" links to
  `docs/adr-react-shell-state-contract.md` — **the `docs/` directory does not
  exist**.
- `CHANGELOG.md` references adding `docs/architecture.md` — also missing.

Onboarding docs that 404 are worse than none, because they imply a contract
nobody can read. (This report is the first file in `docs/`.)

- _Resolved (roadmap item 1):_ both files now exist —
  `docs/adr-react-shell-state-contract.md` (the state contract) and
  `docs/architecture.md` (system overview) — so every README/CHANGELOG
  reference resolves. There are no dangling doc links.

### 3.3 TypeScript adoption is nominal

`tsconfig.json` sets `strict: false` and lists only **two** files in `files`
(`app-state.ts`, `virtual-fs.ts`). `allowJs`/`checkJs` are on, but the rest of
the shell (all `.jsx`/`.js`/`.mjs`) is effectively untyped. The reducer action
shape is hand-maintained as a JSDoc `@typedef` (`app-state-reducer.mjs:1-18`)
and cast away with `as never` in `app-state.ts:34` — so action payloads are
unchecked end to end.

- _Resolved (roadmap items 5 & 6):_ `tsconfig.json` now sets `strict: true`
  for the checked modules (`@types/react`/`@types/react-dom` added,
  `_ensureInit` returns the live DB so transaction calls narrow off the
  `IDBDatabase | null` field). The reducer action shape is now a checked
  discriminated `WindoesAction` union with explicit per-slice `State` typedefs,
  and the `as never` dispatch cast in `app-state.ts` is gone — action payloads
  are type-checked at dispatch sites. Broadening `files`/`include` to cover the
  rest of the `.jsx`/`.js` shell under `strict` remains future work.

### 3.4 Lint/type coverage excludes the largest code

`eslint.config.mjs` ignores `windoes/public/applications/**` entirely, and the
embedded apps are not in `tsconfig`. That leaves the **single largest source
file** — `windoes/public/applications/ascii-runner/game.js` (**1,706 lines**) —
with no lint and no type checking, plus four other apps. Their only gate is a
per-app smoke `test` script.

The ESLint ruleset itself is minimal: five rules, **all set to `warn`**
(`no-unused-vars`, `react/jsx-key`, `react/jsx-uses-vars`,
`no-implicit-globals`, `consistent-return`). Nothing fails the build, and there
is no `eslint-plugin-react-hooks` despite heavy hook/effect usage.

- _Resolved (roadmap items 2 & 4):_ the `windoes/public/applications/**`
  ESLint ignore was removed, so `game.js` and the embedded apps now share the
  shell's baseline (the dead state it surfaced was cleared).
  `no-unused-vars`, `react/jsx-key`, and `no-implicit-globals` were promoted
  from `warn` to **`error`**, and `eslint-plugin-react-hooks` was added
  (`rules-of-hooks: error`, `exhaustive-deps: warn`). Lint passes with no
  blocking errors.

### 3.5 Magic numbers & hardcoded strings

Scattered literals with no named constant or explanation:

- Hardcoded paths: `'/C:/My Documents/Untitled.txt'` appears in the reducer,
  notepad dialogs, and utility windows.
- Bootstrap delay `setTimeout(…, 300)` in `main.js`; IE loading spinner
  `2000`ms in `ie-window.jsx`.
- Title truncation thresholds: `> 22 ? …substring(0, 20)` in `app-windows.jsx:60`,
  `> 30 ? …substring(0, 28)` in `ie-window.jsx`.

- _Resolved (roadmap item 3):_ the boot delay, IE loading timeout,
  taskbar-label truncation budgets, and the default Notepad save path are now
  named constants in `windoes/constants.js` instead of inline literals.

### 3.6 Large, repetitive components

`windoes/shell/StartMenu.jsx` (**667 lines**) contains near-duplicate
submenu-leaf blocks and a family of almost-identical `onXEnter`/`onXLeave`
handlers, plus imperative submenu positioning via `useLayoutEffect` recomputed
on every open. It's the prime candidate for a data-driven menu-item factory.

- _Done (roadmap item 10):_ `StartMenu.jsx` was decomposed into a data-driven
  model (`start-menu-config.js`) plus `MenuItem`/`Submenu` presentational
  components (`MenuItems.jsx`); the menu and submenus now render by mapping over
  config, and the per-item hover handlers collapse into a single rule keyed on
  each panel's `chain` of ancestors. The component is substantially smaller
  while preserving DOM ids/classes/ARIA and behaviour. The `useLayoutEffect`
  positioning pass is intentionally retained (it derives from DOM measurement).

### 3.7 Lifecycle cleanup is HMR-only in several modules

Modules such as `app-windows.jsx`, `ie-window.jsx`, and `utility-windows.jsx`
collect listener-cleanup callbacks but only invoke them on Vite HMR dispose, not
when the corresponding window actually closes. Long sessions can accumulate
listeners/timeouts. (Functional impact is low in a single-page retro toy, but
it's a latent leak and a confusing pattern.)

- _Resolved (roadmap item 9):_ listener teardown for `app-windows.jsx` and
  `ie-window.jsx` is now driven off window-close lifecycle in
  `window-manager.jsx`/`state-applier.js`, not just HMR dispose, with
  coverage in `tests/test-window-manager.js`.

### 3.8 Async error handling is inconsistent

Several `.then()`/`await` flows (paint FS init, notepad save path, IE stop) lack
`.catch()` or swallow errors silently, so a failed IndexedDB/init operation can
leave the UI believing it succeeded. The VFS throws rich typed errors — the
callers mostly don't use them.

### 3.9 Note on a non-issue (scoped out)

An automated pass flagged "path traversal to `/etc/`" in the notepad save flow.
**This is not a real vulnerability:** the filesystem is a sandboxed IndexedDB
store, and `normalizePath` resolves `..` segments _within_ the virtual tree
(`virtual-fs.ts:53-65`) — there is no host filesystem to escape to. Worth a
cosmetic guard against confusing `..` paths, nothing more. (One genuinely minor
gap: `writeFile` does not surface IndexedDB quota errors distinctly.)

---

## 4. Improvement roadmap

Ordered by value-to-effort. None of this is urgent — the app works and the
gates are green — but it's the path to keeping it maintainable as it grows.

> **Status (2026-06-04):** Phases 1–3 are complete (items 1–9), and Phase 4's
> item 10 has landed. Phase 4 items 11–12 are still open. Completed items are
> marked **✅ Done** with a note of how they landed.

### Phase 1 — Cheap, high-value hygiene (hours) — ✅ Done

1. **✅ Fix the docs.** Added `docs/adr-react-shell-state-contract.md` and
   `docs/architecture.md`; all README/CHANGELOG references now resolve.
2. **✅ Promote lint rules to errors.** `no-unused-vars`, `react/jsx-key`, and
   `no-implicit-globals` are now `error`, and `eslint-plugin-react-hooks` was
   added (`rules-of-hooks: error`, `exhaustive-deps: warn`).
3. **✅ Extract magic constants** (boot delay, IE loading timeout, taskbar-label
   truncation budgets, default Notepad save path) into `windoes/constants.js`.

### Phase 2 — Coverage of the blind spots (days) — ✅ Done

4. **✅ Lint + format the embedded apps.** Removed the
   `windoes/public/applications/**` ignore, so `game.js` and friends share the
   shell baseline; the dead code it surfaced was cleared.
5. **✅ Tighten TypeScript.** Flipped `strict: true` for the checked modules
   (added `@types/react`/`@types/react-dom`; `_ensureInit` returns the live DB
   so VFS transactions narrow off `IDBDatabase | null`). Broadening `strict`
   coverage to the remaining `.jsx`/`.js` shell modules remains future work.
6. **✅ Type the reducer action union.** Replaced the JSDoc typedef + `as never`
   with a discriminated `WindoesAction` union, so action payloads are checked at
   dispatch sites.

### Phase 3 — Pay down the architectural debt (weeks, incremental) — ✅ Done

7. **Write the state-contract ADR first** (Phase 1 doc), then **migrate one
   imperative subsystem at a time** off `WindoesApp.*` into reducer
   actions + React handlers. Suggested order by isolation: IE history →
   notepad file state → paint FS init → start-menu submenu state. Track the
   `WindoesApp.*` reference count as a burn-down metric.
   - _Done:_ **IE history** migrated into the `browser` reducer slice
     (`BROWSER_NAVIGATE`/`BROWSER_BACK`/`BROWSER_FORWARD`/
     `BROWSER_HISTORY_RESET`), retiring the module-level `historyStack`/
     `historyIndex` variables in `ie-window.jsx`.
   - _Done:_ **Notepad file state** migrated into `notepad.currentFilePath`
     (`NOTEPAD_SET_FILE_PATH`), retiring the `textarea.dataset.filePath`
     DOM-as-state and the `#notepadTitle` `textContent` mutations in
     `utility-windows.jsx` (the title now renders from state via a
     `NotepadTitleText` component).
   - _Done:_ **Paint FS init** (and the sibling explorer/notepad FS-init
     guards) unified behind a single tested single-flight memoizer
     (`windoes/once.mjs`), retiring three module-level `let` guards
     (`paintFsInitPromise`, `fsInitialized`, `fsReady`) and fixing a latent
     concurrent-init race in `initFS`. An async-I/O init promise is
     deliberately **not** reducer state — the reducer stays pure per the ADR —
     so this milestone is a `let`-burndown/dedup rather than a reducer
     migration.
   - _Done:_ **Start-menu submenu state** migrated into the (previously dead)
     `menus` reducer slice via `START_MENU_TOGGLE`/`START_MENU_CLOSE`/
     `MENU_SUBMENUS_KEEP`. Removed the `startMenuOpen` prop-drilling, the
     `submenuOpen` local `useState`, and the entire `WindoesApp.startMenu.*`
     imperative bridge (4 handles + its consumers in `Taskbar`, `RunDialog`,
     and `launch-helpers`). Submenu positioning, which is derived from DOM
     measurement, intentionally stays local. This completes the subsystems
     listed under roadmap item 7.
8. **Eliminate DOM-as-state.** Replace `textContent`/`dataset` mutations and
   `querySelector` caches with component state/props as each subsystem migrates.
   - _Done:_ Notepad title/path (see item 7) and the **window maximize-button
     glyph**, which is now rendered reactively from `windows.byId[id].maximized`
     in `WindowTitlebar` — retiring the imperative `updateMaxBtn`
     `querySelector`/`textContent` writer in `state-applier.js`. (The button
     also now exposes `aria-label="Restore"` while maximized.)
   - _Done:_ the **IE window** and **generic app window** title / status /
     task-button label now render reactively from the `browser` and `app`
     reducer slices (`BROWSER_SET_PAGE`/`BROWSER_SET_STATUS`,
     `APP_SET_PAGE`/`APP_SET_STATUS`) via small `Ie*`/`App*` components,
     retiring the imperative `textContent` writes in `ie-window.jsx` and
     `app-windows.jsx`. Item 8 is complete for the shell; the remaining
     `dataset`/`querySelector` hits are legitimate event-delegation/identity
     reads, and form-input values (`addressInput.value`, the notepad textarea)
     are intentionally left as uncontrolled inputs.
9. **Unify lifecycle cleanup.** Drive listener teardown off window-close
   actions (React effect cleanup), not just HMR dispose.
   - _Done:_ window-close lifecycle in `window-manager.jsx`/`state-applier.js`
     now invokes the per-window listener teardown for `app-windows.jsx` and
     `ie-window.jsx` (no longer HMR-only), covered by
     `tests/test-window-manager.js`.

### Phase 4 — Refactors that get easier after Phase 3 — ⏳ Item 10 done; 11–12 open

10. **Decompose `StartMenu.jsx`** into a data-driven menu config + small
    presentational components; collapse the duplicated hover handlers.
    - _Done:_ extracted the menu/submenu structure into
      `windoes/shell/start-menu-config.js` and rendered it through
      `MenuItem`/`Submenu` components in `windoes/shell/MenuItems.jsx`. The
      per-item `onXEnter`/`onXLeave` handlers collapse into one chain-derived
      keep/leave rule, substantially reducing `StartMenu.jsx` while keeping
      DOM/ARIA/behaviour unchanged, guarded by
      `tests/node/start-menu-config.test.js`.
11. **Add async error surfacing** — route VFS typed errors into the existing
    error-dialog UI instead of silent catches.
12. **Add keyboard navigation** (arrow keys) to menus to complete the a11y story
    the `aria-*` attributes already promise.

---

## 5. Suggested "done" metrics

Status at the 2026-06-04 sync (☑ met, ☐ outstanding):

- ☐ `WindoesApp.*` references continuing to trend down. The four Phase 3
  subsystems were migrated off the bridge, but it remains the sanctioned legacy
  compatibility layer; full removal is long-term work.
- ☐ Module-level `let` state in shell continuing to trend down. Reduced by the
  Phase 3 migrations (e.g. IE history, notepad path, FS-init guards); a handful
  of legitimate non-state `let`s remain.
- ☐ `tsconfig` `files`/`include` covering the whole shell with `strict: true`.
  `strict: true` is on for the checked `.ts` modules; broadening coverage to
  the rest of the `.jsx`/`.js` shell is still open.
- ☑ Embedded apps under lint.
- ☑ Zero dangling doc references.
- ☑ Reducer unit-test coverage has grown, with new suites for the single-flight
  memoizer (`once.test.js`) and the data-driven Start-menu config
  (`start-menu-config.test.js`).
