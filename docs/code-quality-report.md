# Windoes — Code Quality Report

_Originally authored: 2026-05-31 · Branch: `claude/amazing-hypatia-0daRl` · Commit: `d0e9ecc`_

_Last verified against `main`: 2026-07-23 · `0b0a957` — **Phases 1–4 complete**
(roadmap items 1–12). The structural roadmap work has landed, but item 4 is
only partially complete: embedded-app JavaScript is linted while standalone HTML
apps are outside lint/format enforcement. The remaining work also includes the
long-term `WindoesApp.*` bridge burn-down and broadening `strict` typing to the
whole shell (tracked under §5, not the numbered roadmap).
Per-item progress is annotated inline below._

A Windows-98-inspired desktop simulator (React 19 + JS/JSX, two `.ts` modules,
Vite 8, Playwright). Shell code lives in `windoes/`; six embedded apps live
under `windoes/public/applications/`. This report covers maintainability, not
runtime correctness.

### Verification scope (2026-07-23)

This refresh cross-checked the report against merged PRs #93–123, the full
commit history since the prior sync, and GitHub issues. The Phase 1–4 work
landed in PRs #94–106; later merged changes added Paint file workflows, shared
file chooser support, local HTML viewing in IE, Minecraft, and the Winamp skin.
There are no open GitHub issues at this revision (the sole issue, #117, is
closed).

---

## 1. Executive summary

The project is in **good baseline health**. Tooling is wired up and green, the
state core (reducer + virtual filesystem) is well designed and tested, and the
codebase is modest-sized, with six embedded apps; the largest is now the
Winamp standalone HTML app (2,479 lines). The main quality risk called out at
authoring time — **architectural drift** from the
in-progress `window.WindoesApp.*` → React/reducer migration — has since been
substantially paid down: the four imperative subsystems flagged in Phase 3 now
live in the reducer, lint/type coverage has been tightened, and the previously
missing docs now exist. The remaining `WindoesApp.*` bridge is the legacy
compatibility layer described in the ADR, burned down one subsystem at a time.

The table below shows the signals as re-measured on 2026-07-23 (original values
remain documented in the findings where they establish the initial baseline).

| Signal                                            | Result                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| `npm run lint` (eslint)                           | ✅ clean                                                           |
| `npm run typecheck` (tsc, `strict: true`)         | ✅ clean for the two configured `.ts` modules                      |
| `npm run test:all`                                | ✅ 77 unit tests, 10 Playwright suites, and 165 app checks pass    |
| `npm run build`                                   | ✅ production build succeeds                                       |
| `npm audit --omit=dev --audit-level=high`         | ✅ 0 production vulnerabilities                                    |
| CI (typecheck + lint + unit + integration + apps) | ✅ configured (`.github/workflows/test.yml`)                       |
| Embedded-app lint/format coverage                 | ⚠️ JavaScript linted; standalone HTML app files remain uncovered   |
| `WindoesApp.*` imperative bridge                  | ⚠️ 225 dotted references across 22 shell files                     |
| Module-level `let` declarations in shell          | ⚠️ 13 across 8 files; needs classification before a burn-down goal |
| Docs referenced but missing                       | ✅ none known (all referenced docs live under `docs/`)             |

ESLint is clean at this revision. The `react-hooks/exhaustive-deps` rule remains
intentionally non-blocking (`warn`) so dependency guidance can be surfaced
without masking failures from the error-level rules.

**Overall grade: A−.** The state, lifecycle, error-surfacing, and accessibility
roadmap work is complete; embedded-app JavaScript is linted, but standalone HTML
apps are still outside lint/format enforcement. The foundation is backed by
stricter gates, a documented state contract, filesystem errors that surface
through the dialog UI, and keyboard-navigable menus. Remaining work includes
embedded-app HTML coverage, the long-term `WindoesApp.*` burn-down, and
whole-shell `strict` typing (tracked under §5).

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

The original 2026-05-31 scan found the bridge **pervasive, not temporary**:

- **143** references to runtime-filled `WindoesApp.*` namespaces
  (`open`, `startMenu`, `ui`, `WindowManager`, `browser`, …) across **21**
  files.
- **27** module-level `let` mutable variables in shell files held state outside
  the reducer (e.g. IE history stack in `ie-window.jsx`, an `fsReady` flag and
  notepad file path in `utility-windows.jsx`, a paint-FS init promise cache in
  `app-windows.jsx`).
- Window state effectively existed in **three** representations: the reducer
  (`windows.byId`), the `WindowManager` imperative layer, and direct DOM
  mutations.

The Phase 3/4 migrations retired the specific state and DOM-as-state examples
above. **Current follow-up measurement (2026-07-23):** the shell has **225**
dotted `WindoesApp.*` references across **22** files and **13** top-level `let`
declarations across **8** files. The bridge count is not a reliable progress
metric by itself: newer features added bridge consumers while the report's
stateful subsystems were removed. Future work should classify handles as
compatibility API, event service, or mutable state before treating the number as
a burn-down target.

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

At authoring, `eslint.config.mjs` ignored `windoes/public/applications/**` entirely,
and the embedded apps were not in `tsconfig`. That left the then-largest source
file — `windoes/public/applications/ascii-runner/game.js` (**1,706 lines**) —
with no lint and no type checking, plus four other apps. Their only gate is a
per-app smoke `test` script.

The ESLint ruleset itself is minimal: five rules, **all set to `warn`**
(`no-unused-vars`, `react/jsx-key`, `react/jsx-uses-vars`,
`no-implicit-globals`, `consistent-return`). Nothing fails the build, and there
is no `eslint-plugin-react-hooks` despite heavy hook/effect usage.

- _Partially resolved (roadmap items 2 & 4):_ the
  `windoes/public/applications/**` ESLint ignore was removed, so JavaScript files
  such as `game.js` use the shell's baseline (and the dead state it surfaced was
  cleared). `no-unused-vars`, `react/jsx-key`, and `no-implicit-globals` were
  promoted from `warn` to **`error`**, and `eslint-plugin-react-hooks` was added
  (`rules-of-hooks: error`, `exhaustive-deps: warn`). **Gap:** the flat ESLint
  config only targets JS-family extensions and `lint-staged` excludes HTML, so
  standalone embedded-app `index.html` files and their inline script/style are
  neither linted nor format-checked. Add HTML-aware lint/format tooling before
  considering item 4 complete.

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

- _Resolved (roadmap item 11):_ a `describeFsError` mapper (`windoes/fs-errors.mjs`)
  turns the VFS typed errors (keyed on `error.name`) into friendly,
  era-appropriate dialog content, and the filesystem callers route through it:
  the explorer open/create/delete catches, the Notepad save catch, and the
  previously bare `initFS().then(…)` in `openMyComputer` (now `.catch()`-guarded)
  all surface failures through the shared error-dialog UI instead of swallowing
  them. The paint save/load flows already report failures back to the paint
  iframe over `postMessage`, and the IE `stop()` `catch` is an intentional
  cross-origin no-op. Covered by `tests/node/fs-errors.test.js`.

### 3.9 Note on a non-issue (scoped out)

An automated pass flagged "path traversal to `/etc/`" in the notepad save flow.
**This is not a real vulnerability:** the filesystem is a sandboxed IndexedDB
store, and `normalizePath` resolves `..` segments _within_ the virtual tree
(`virtual-fs.ts:53-65`) — there is no host filesystem to escape to. Worth a
cosmetic guard against confusing `..` paths, nothing more. (One genuinely minor
gap: `writeFile` did not surface IndexedDB quota errors distinctly — now
addressed: `describeFsError` maps the browser's `QuotaExceededError` to a
dedicated "not enough free space" message as part of roadmap item 11.)

### 3.10 Browser and iframe security boundary

The shell does not use `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `eval`,
or `new Function`. IE navigation accepts only `http(s)`, `about:blank`, or a
normalized VirtualFS path (`browser-url.mjs`); user-created local HTML is
rendered through `srcdoc` with `sandbox="allow-scripts"`, intentionally omitting
`allow-same-origin` (`ie-window.jsx`).

**Medium — embedded-app iframes are trusted, not isolated.** The first-party app
frames use both `allow-scripts` and `allow-same-origin`, while the shell exposes
`window.WindoesApp`; a compromised same-origin app could access its parent and
origin-scoped storage. Treat every embedded app as trusted code, or move apps to
a separate origin and remove `allow-same-origin` while replacing direct access
with capability-scoped `postMessage` RPC.

**Low — Paint VFS RPC is authorized too broadly.** The message handler validates
origin and accepts a source from any registered app iframe before processing
Paint file read/write/chooser messages. Restrict those message types to
`paintFrame.contentWindow`, validate a strict message schema and request IDs,
and retain source/origin checks. No high-severity shell issue was identified;
GitHub issue #117 (Security audit) is closed.

---

## 4. Improvement roadmap

Ordered by value-to-effort. None of this is urgent — the app works and the
gates are green — but it's the path to keeping it maintainable as it grows.

> **Status (2026-06-04):** Phases 1–4 are complete (items 1–12). Completed items
> are marked **✅ Done** with a note of how they landed.

### Phase 1 — Cheap, high-value hygiene (hours) — ✅ Done

1. **✅ Fix the docs.** Added `docs/adr-react-shell-state-contract.md` and
   `docs/architecture.md`; all README/CHANGELOG references now resolve.
2. **✅ Promote lint rules to errors.** `no-unused-vars`, `react/jsx-key`, and
   `no-implicit-globals` are now `error`, and `eslint-plugin-react-hooks` was
   added (`rules-of-hooks: error`, `exhaustive-deps: warn`).
3. **✅ Extract magic constants** (boot delay, IE loading timeout, taskbar-label
   truncation budgets, default Notepad save path) into `windoes/constants.js`.

### Phase 2 — Coverage of the blind spots (days) — items 5–6 ✅; item 4 ⚠️ partial

4. **⚠️ Partially lint the embedded apps.** Removed the
   `windoes/public/applications/**` ignore, so embedded-app JavaScript files
   share the shell ESLint baseline; the dead code it surfaced was cleared.
   Standalone `index.html` files (and their inline scripts/styles) remain outside
   both ESLint and the staged Prettier file set. Add HTML-aware lint/format
   enforcement to complete this item.
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

### Phase 4 — Refactors that get easier after Phase 3 — ✅ Done

10. **Decompose `StartMenu.jsx`** into a data-driven menu config + small
    presentational components; collapse the duplicated hover handlers.
    - _Done:_ extracted the menu/submenu structure into
      `windoes/shell/start-menu-config.js` and rendered it through
      `MenuItem`/`Submenu` components in `windoes/shell/MenuItems.jsx`. The
      per-item `onXEnter`/`onXLeave` handlers collapse into one chain-derived
      keep/leave rule, substantially reducing `StartMenu.jsx` while keeping
      DOM/ARIA/behaviour unchanged, guarded by
      `tests/node/start-menu-config.test.js`.
11. **✅ Add async error surfacing** — route VFS typed errors into the existing
    error-dialog UI instead of silent catches.
    - _Done:_ `windoes/fs-errors.mjs` maps the VFS typed errors (and the
      browser's `QuotaExceededError`) to friendly dialog content via
      `describeFsError`; the explorer open/create/delete catches, the Notepad
      save catch, and the previously bare `openMyComputer` init promise now all
      surface through `WindoesApp.bsod.showErrorDialog`. Unit-tested in
      `tests/node/fs-errors.test.js`.
12. **✅ Add keyboard navigation** (arrow keys) to menus to complete the a11y
    story the `aria-*` attributes already promise.
    - _Done:_ the Start menu and its cascading submenus now support roving
      Up/Down (with Home/End and wrap-around), Right/Enter to open a submenu and
      focus its first item, Left to collapse back to the parent trigger, and
      Escape to close and return focus to the Start button. The pure navigation
      logic lives in `windoes/shell/menu-keyboard.js` (unit-tested in
      `tests/node/menu-keyboard.test.js`); `StartMenu.jsx`/`MenuItems.jsx` wire
      it to focus, and `menus.css` adds a `:focus`/`:focus-visible` highlight so
      the keyboard position is visible.

---

## 5. Suggested "done" metrics

Status at the 2026-07-23 verification (☑ met, ☐ outstanding):

- ☐ Classify then reduce the `WindoesApp.*` bridge. The four Phase 3 subsystems
  were migrated off it, but **225** dotted references across 22 shell files
  remain. Count compatibility handles, event services, and mutable state
  separately before setting a numeric target.
- ☐ Classify then reduce top-level `let` state. The shell now has **13** such
  declarations across 8 files; some are legitimate timer, listener-ref, or
  renderer-cache values rather than application state.
- ☐ `tsconfig` `files`/`include` covering the whole shell with `strict: true`.
  `strict: true` is on for the checked `.ts` modules; broadening coverage to
  the rest of the `.jsx`/`.js` shell is still open.
- ☐ Complete embedded-app lint/format coverage. JavaScript is covered and all
  six apps run in `npm run test:all`, but standalone HTML files and inline
  scripts/styles are currently outside both ESLint and staged Prettier.
- ☑ Zero dangling doc references.
- ☑ Full local quality gate passed: lint, typecheck, 77 unit tests, 10
  Playwright integration suites, six app smoke suites (165 checks), production
  build, and a production dependency audit with zero reported vulnerabilities.
