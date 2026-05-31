# Windoes — Code Quality Report

_Date: 2026-05-31 · Branch: `claude/amazing-hypatia-0daRl` · Commit: `d0e9ecc`_

A Windows-98-inspired desktop simulator (React 19 + JS/JSX, two `.ts` modules,
Vite 8, Playwright). Shell code lives in `windoes/`; five embedded apps live
under `windoes/public/applications/`. This report covers maintainability, not
runtime correctness.

---

## 1. Executive summary

The project is in **good baseline health**. Tooling is wired up and green, the
state core (reducer + virtual filesystem) is well designed and tested, and the
codebase is small (~3k LOC of shell + ~1.7k LOC for the largest app). The main
quality risk is **architectural drift**: an in-progress migration from a legacy
imperative model (`window.WindoesApp.*`) to a React/reducer model is only
partly done, leaving **two parallel state mechanisms** that coexist throughout
the shell. Secondary risks are **lenient type/lint coverage** and **stale
documentation references**.

| Signal                                           | Result                                       |
| ------------------------------------------------ | -------------------------------------------- |
| `npm run lint` (eslint)                          | ✅ 0 errors / **0 warnings**                 |
| `npm run typecheck` (tsc)                        | ✅ clean                                     |
| `TODO`/`FIXME`/`console.log`/`debugger` in shell | ✅ none                                      |
| Reducer unit tests                               | 25 cases                                     |
| CI (lint + unit + integration + typecheck)       | ✅ configured (`.github/workflows/test.yml`) |
| `WindoesApp.*` imperative references             | ⚠️ 143 across 21 files                       |
| Module-level `let` mutable state (shell)         | ⚠️ 27                                        |
| Docs referenced but missing                      | ⚠️ 2 files                                   |

**Overall grade: B / B+.** Solid foundation; pay down the migration debt and
tighten type/lint coverage before the surface area grows further.

---

## 2. Strengths

- **Clean tooling gates.** ESLint and `tsc --noEmit` both pass with zero
  warnings. Prettier + Husky + `lint-staged` enforce formatting on commit. CI
  runs the full `test:all` matrix on every non-`main` push.
- **Well-architected virtual filesystem** (`windoes/virtual-fs.ts`). Dedicated
  error classes (`FileNotFoundError`, `FileExistsError`, …), single-transaction
  atomic `rename`/`rm` (`virtual-fs.ts:410`), `readdir` caching with
  `BroadcastChannel` cross-tab invalidation (`virtual-fs.ts:154-167`), and
  defensive `normalizePath` that collapses `//` and resolves `.`/`..`
  (`virtual-fs.ts:45-66`). This is the strongest file in the repo.
- **Clean reducer core.** `app-state-reducer.mjs` is a pure, switch-based
  reducer with immutable updates and helper combinators (`withWindowState`,
  `recomputeWindowMeta`, `withDialogs`). 25 dedicated unit tests in
  `tests/node/reducer.test.js`.
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

### 3.3 TypeScript adoption is nominal

`tsconfig.json` sets `strict: false` and lists only **two** files in `files`
(`app-state.ts`, `virtual-fs.ts`). `allowJs`/`checkJs` are on, but the rest of
the shell (all `.jsx`/`.js`/`.mjs`) is effectively untyped. The reducer action
shape is hand-maintained as a JSDoc `@typedef` (`app-state-reducer.mjs:1-18`)
and cast away with `as never` in `app-state.ts:34` — so action payloads are
unchecked end to end.

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

### 3.5 Magic numbers & hardcoded strings

Scattered literals with no named constant or explanation:

- Hardcoded paths: `'/C:/My Documents/Untitled.txt'` appears in the reducer,
  notepad dialogs, and utility windows.
- Bootstrap delay `setTimeout(…, 300)` in `main.js`; IE loading spinner
  `2000`ms in `ie-window.jsx`.
- Title truncation thresholds: `> 22 ? …substring(0, 20)` in `app-windows.jsx:60`,
  `> 30 ? …substring(0, 28)` in `ie-window.jsx`.

### 3.6 Large, repetitive components

`windoes/shell/StartMenu.jsx` (**667 lines**) contains near-duplicate
submenu-leaf blocks and a family of almost-identical `onXEnter`/`onXLeave`
handlers, plus imperative submenu positioning via `useLayoutEffect` recomputed
on every open. It's the prime candidate for a data-driven menu-item factory.

### 3.7 Lifecycle cleanup is HMR-only in several modules

Modules such as `app-windows.jsx`, `ie-window.jsx`, and `utility-windows.jsx`
collect listener-cleanup callbacks but only invoke them on Vite HMR dispose, not
when the corresponding window actually closes. Long sessions can accumulate
listeners/timeouts. (Functional impact is low in a single-page retro toy, but
it's a latent leak and a confusing pattern.)

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

### Phase 1 — Cheap, high-value hygiene (hours)

1. **Fix the docs.** Either add `docs/adr-react-shell-state-contract.md` and
   `docs/architecture.md`, or remove the dangling references in README/CHANGELOG.
2. **Promote lint rules to errors** where the code already complies (it does —
   0 warnings today): turn `no-unused-vars`, `react/jsx-key`,
   `no-implicit-globals` into `error`, and add `eslint-plugin-react-hooks`
   (`rules-of-hooks: error`, `exhaustive-deps: warn`).
3. **Extract magic constants** (paths, timeouts, truncation lengths) into
   `constants.js`, which already exists.

### Phase 2 — Coverage of the blind spots (days)

4. **Lint + format the embedded apps.** Remove the
   `windoes/public/applications/**` ignore (start with `--max-warnings`
   tolerance), so `game.js` and friends get the same baseline.
5. **Tighten TypeScript incrementally.** Flip `strict: true` for the two
   existing `.ts` files, then migrate one more leaf module per PR
   (`event-bus.js`, `constants.js`, `dragging.js` are low-risk starts).
6. **Type the reducer action union.** Replace the JSDoc typedef + `as never`
   with a discriminated union so action payloads are checked at dispatch sites.

### Phase 3 — Pay down the architectural debt (weeks, incremental)

7. **Write the state-contract ADR first** (Phase 1 doc), then **migrate one
   imperative subsystem at a time** off `WindoesApp.*` into reducer
   actions + React handlers. Suggested order by isolation: IE history →
   notepad file state → paint FS init → start-menu submenu state. Track the
   `WindoesApp.*` reference count (currently 143) as a burn-down metric.
8. **Eliminate DOM-as-state.** Replace `textContent`/`dataset` mutations and
   `querySelector` caches with component state/props as each subsystem migrates.
9. **Unify lifecycle cleanup.** Drive listener teardown off window-close
   actions (React effect cleanup), not just HMR dispose.

### Phase 4 — Refactors that get easier after Phase 3

10. **Decompose `StartMenu.jsx`** into a data-driven menu config + small
    presentational components; collapse the duplicated hover handlers.
11. **Add async error surfacing** — route VFS typed errors into the existing
    error-dialog UI instead of silent catches.
12. **Add keyboard navigation** (arrow keys) to menus to complete the a11y story
    the `aria-*` attributes already promise.

---

## 5. Suggested "done" metrics

- `WindoesApp.*` references trending toward 0 (from 143).
- Module-level `let` state in shell trending toward 0 (from 27).
- `tsconfig` `files`/`include` covering the whole shell with `strict: true`.
- Embedded apps under lint.
- Zero dangling doc references.
