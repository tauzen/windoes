# Code Quality Analysis & Roadmap

_Scope: the simulator shell under `windoes/` (excludes embedded apps under `windoes/public/applications/`)._

## 1. Executive summary

The project is mid-migration from an imperative DOM-driven shell to a React-driven shell (see `docs/adr-react-shell-state-contract.md`). The migration has produced a half-and-half architecture in which:

- A central reducer (`WindoesApp.state`) is the declared canonical store, but many code paths still mutate the DOM directly and bypass it.
- `WindoesApp` itself is a global service-locator / god-object filled in at runtime by feature modules, creating order-of-initialization coupling.
- `WindowManager` (`windoes/window-manager.jsx`, 546 lines) is an imperative singleton with its own stack/z-index logic that bridges to React through a `renderInto` portal registry and to the reducer through a subscribe callback. It is the main source of architectural complexity and a primary target for cleanup.
- `fs-explorer.jsx`, `ie-window.jsx`, `utility-windows.jsx`, and `app-windows.jsx` are imperative modules registered against global DOM ids and `WindoesApp.*` slots instead of React components.

None of the issues below block the app, but together they create duplication, fragile DOM lookups, memory leaks, unhandled security surface (unvalidated `postMessage`), and a high barrier to onboarding contributors.

---

## 2. Findings by category

### 2.1 Architecture & migration debt

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                                    | Location                                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| A1  | `WindoesApp` is a mutable global service locator. Feature modules write to `WindoesApp.open.*`, `WindoesApp.bsod.*`, `WindoesApp.ui.*`, etc. at import time. This makes load order load-bearing (see `main.js` sequential imports) and hides implicit dependencies.                                                                                                                                        | `app-state.js:322-358`, `main.js:18-25`                                                                                  |
| A2  | `WindoesApp.bootDone` getter/setter is a write-triggers-dispatch shim — callers think they are setting a flag but are actually dispatching a reducer action.                                                                                                                                                                                                                                               | `app-state.js:360-369`                                                                                                   |
| A3  | Three stub `.jsx` files exist (`context-menu.jsx`, `run-dialog.jsx`, `start-menu.jsx`) only to re-export nothing. Remove them and update any remaining imports.                                                                                                                                                                                                                                            | `windoes/context-menu.jsx`, `windoes/run-dialog.jsx`, `windoes/start-menu.jsx`                                           |
| A4  | `WindowManager` keeps duplicated state: `_stack` / `_windows[id].isOpen` / `_windows[id].isMaximized` alongside the reducer's `state.windows.stack` / `byId[id].open` / `byId[id].maximized`. Each `open`/`close`/`minimize` has to `_syncState()` after mutation — it is easy to forget.                                                                                                                  | `window-manager.jsx:28-51, 321-398`                                                                                      |
| A5  | `WindowManager` builds DOM by instantiating `<section>` elements and then calling `renderInto` a React tree into them via a portal registry — the chrome is React, but the section element, z-index, visibility, titlebar active class, and task-button display are all toggled imperatively via `classList` / `style`.                                                                                    | `window-manager.jsx:146-154, 500-526`                                                                                    |
| A6  | The same boilerplate "close start menu + unpress start button + close submenus + play click sound" block is duplicated in at least 7 `open*()` functions.                                                                                                                                                                                                                                                  | `app-windows.jsx:43-47, 92-96, 126-129, 159-162`, `utility-windows.jsx:77-79, 220-223, 263-265`, `ie-window.jsx:119-121` |
| A7  | `fs-explorer.jsx` captures DOM refs in module-level `let` variables (`viewEl`, `addressEl`, …) populated by `setDomRefs(cfg)` from `utility-windows.jsx`. Rerendering the My Computer window would silently leave these stale.                                                                                                                                                                             | `fs-explorer.jsx:34-49, 60-64 utility-windows.jsx`                                                                       |
| A8  | Drag-to-reducer-to-DOM bridge: `makeDraggable` dispatches `DRAG_MOVE` on every pointer move; a subscribe callback in `WindowManager._applyDragState` reads the state and writes `el.style.left`. This adds allocations per frame, yet the DOM is still the single source of truth during drag. Drag could either live entirely in the reducer (and be rendered declaratively) or stay entirely imperative. | `dragging.js:44-68`, `window-manager.jsx:469-498`                                                                        |
| A9  | Multiple "interaction command" patterns (`WINDOW_INTERACTION_DISPATCH`, `EXPLORER_CONTEXT_ACTION_DISPATCH`, `NOTEPAD_ACTION_DISPATCH`) use a sequence number + last-seen-seq subscriber pattern to simulate one-shot commands through a store. This is a workaround for the reducer not being a natural fit for imperative actions; a simple event bus or RxJS-like subject would be clearer.              | `app-state.js:159-167, 189-231`, `utility-windows.jsx:189-198`, `fs-explorer.jsx:51-73`                                  |

### 2.2 Correctness & latent bugs

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                        | Location                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| B1  | `ie-window.jsx` loads immediately at module import and calls `setInterval(updateClock, 1000)` that is never cleared, even if the shell is torn down.                                                                                                                                                                                                                           | `ie-window.jsx:190-191`                           |
| B2  | `body_loading(true)` unconditionally schedules a 2000 ms `setTimeout` to remove the class — stacking calls will race. Iframe `load` handler then calls `body_loading(false)`, which is fine, but the timer is still pending.                                                                                                                                                   | `ie-window.jsx:108-115`                           |
| B3  | `scheduleRandomBSOD` / `scheduleRandomError` recurse via `setTimeout` forever; the timers are never cleared. If the shell is unmounted they continue.                                                                                                                                                                                                                          | `bsod.jsx:37-43, 71-81`                           |
| B4  | `app-windows.jsx` postMessage listener trusts any message on the window: `e.data.type === 'winamp-close'` fires a close regardless of `e.origin`. Any cross-origin iframe or opened page can force-close a window.                                                                                                                                                             | `app-windows.jsx:176-199`                         |
| B5  | `closeApp`, `closeWinamp`, `closeMinesweeper`, `closeSolitaire` are defined but never exported or referenced (dead code).                                                                                                                                                                                                                                                      | `app-windows.jsx:50-52, 99-101, 132-134, 165-167` |
| B6  | `deleteSelected` ends with `selectedItemPath = null;` — a no-op on a parameter.                                                                                                                                                                                                                                                                                                | `fs-explorer.jsx:303`                             |
| B7  | `render()` in `fs-explorer.jsx` iterates `entries` and awaits `fs.stat(childPath)` inside the loop — N+1 IndexedDB transactions per folder listing.                                                                                                                                                                                                                            | `fs-explorer.jsx:152-159`                         |
| B8  | `VirtualFS.readdir` and `rm` call `getAll()` on both object stores and filter in memory. This is O(total_entries) per operation, not O(children), and does not scale.                                                                                                                                                                                                          | `virtual-fs.js:230-252, 311-315`                  |
| B9  | `sound.js` wraps every audio call in `try { … } catch(e) {}` with empty catches — errors are completely silent, making audio problems invisible during development.                                                                                                                                                                                                            | `sound.js:14-27, 29-47`                           |
| B10 | `fs-explorer.jsx` `render()` catches every error and prints the same generic `"Error reading directory."` message — real causes are lost.                                                                                                                                                                                                                                      | `fs-explorer.jsx:196-199`                         |
| B11 | `navigate()` in ie-window uses `window.stop()` on Stop button — stops the _host_ page, not just the iframe. Should call `frame.contentWindow.stop()` (or reload about:blank).                                                                                                                                                                                                  | `ie-window.jsx:150-153`                           |
| B12 | `StartMenu.performShutdown` appends the shutdown message to `document.body` imperatively (not via React) and never cleans up, so re-opening the shell in tests can leak it.                                                                                                                                                                                                    | `shell/StartMenu.jsx:119-132`                     |
| B13 | IE `addressInput` accepts any string and `normalizeUrl` will happily return `javascript:alert(1)` if the user types `javascript://x` — the value is assigned to `frame.src`. The iframe has no `sandbox` attribute so same-origin `javascript:` URLs execute in the iframe context.                                                                                            | `ie-window.jsx:70-76, 82-93`                      |
| B14 | `VirtualFS.writeFile` uses `content.length` for size — works for strings but a `Blob` / typed-array-view would miscalculate. Either narrow the parameter or branch on type.                                                                                                                                                                                                    | `virtual-fs.js:176`                               |
| B15 | `VirtualFS.rename` for a directory runs many writes inside one transaction — OK — but delegates to `stores.directories.put({...d, path: newPath})` while still holding `getAll()` results from the same transaction; if the transaction auto-completes between awaits (no await between), this is fine, but it depends on no awaits interleaving. Worth a comment or a helper. | `virtual-fs.js:329-389`                           |

### 2.3 Memory leaks / lifecycle

| #   | Finding                                                                                                                                                                                                                                                                                                                       | Location                           |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| C1  | Module-level `setInterval` / `setTimeout` never cleared (B1, B3) means hot-module-reload in dev creates compounding timers.                                                                                                                                                                                                   | `ie-window.jsx:190`, `bsod.jsx`    |
| C2  | `document.addEventListener('keydown' …)` in `bsod.jsx` is attached at import time with no removal.                                                                                                                                                                                                                            | `bsod.jsx:32-35`                   |
| C3  | `window.addEventListener('message', …)` in `app-windows.jsx` has no teardown.                                                                                                                                                                                                                                                 | `app-windows.jsx:176-199`          |
| C4  | `WindoesApp.state.subscribe(() => WindowManager._bridgeFromState())` never returns its unsubscribe.                                                                                                                                                                                                                           | `window-manager.jsx:533-535`       |
| C5  | `fs-explorer.jsx` wires `oncontextmenu` and `dblclick` directly on elements re-rendered on every `render()` — old listeners on previous DOM nodes are released only because the nodes are replaced, but if `renderInto` reused any node (React reconciliation does), listeners would stack. Use event delegation on `viewEl`. | `fs-explorer.jsx:181-195, 216-226` |

### 2.4 Reactness / DOM anti-patterns

| #   | Finding                                                                                                                                                                                                                                       | Location                                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | `<div>` used with `onClick` for interactive menu items (`context-menu-item`, `submenu-item`, `menu-item`). Should be `<button>` with proper `role="menuitem"` for screen readers / keyboard.                                                  | `shell/StartMenu.jsx:195-235`, `shell/DesktopContextMenu.jsx:98-108`, `shell/ExplorerContextMenu.jsx`, `shell/NotepadDialogs.jsx:185-189` |
| D2  | `renderInto` wraps every update in `flushSync` which forces synchronous re-render on all portals every time any one of them changes. For drag (fired per mousemove), this can stall.                                                          | `react-view.js:37-52`                                                                                                                     |
| D3  | `WindowManager._buildWindowEl` parses `viewStyle` as a CSS text string with a custom regex to convert to a React style object. If any value contains `:` (e.g. `url(data:…)`), this breaks. Prefer accepting a React `style` object directly. | `window-manager.jsx:73-82`                                                                                                                |
| D4  | `StartMenu` computes submenu positions imperatively inside React (`positionSubmenu` reads `getBoundingClientRect`, toggles `visibility`, writes `style.left`). Could be a positioned React node with CSS anchor / `Popper`-style helper.      | `shell/StartMenu.jsx:31-58`                                                                                                               |
| D5  | Nine near-identical `onMouseEnter` handlers are inlined in JSX to close sibling submenus. Extract to a single `closeOtherSubmenus(except)` helper.                                                                                            | `shell/StartMenu.jsx:221-234`                                                                                                             |
| D6  | `shell/StartMenu.jsx` reaches into `WindoesApp.dom.startButton` after first mount and toggles classes on it. Keep state inside the component and render `pressed` via `className`.                                                            | `shell/StartMenu.jsx:154-156, 26-28`                                                                                                      |
| D7  | `desktop.jsx` is an imperative module that calls `document.getElementById('desktopIcons')` + `renderInto` + `querySelectorAll('.icon')` instead of rendering icons through React.                                                             | `desktop.jsx:21-79`                                                                                                                       |

### 2.5 Security

| #   | Finding                                                                                                                                                                                                                                                                                                     | Location                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| E1  | No `sandbox=""` on any iframe (`appFrame`, `winampFrame`, `minesweeperFrame`, `solitaireFrame`, `browserFrame`). The bundled apps are same-origin and have unrestricted access to `parent` and can navigate the top window. Apply `sandbox="allow-scripts allow-same-origin"` (or narrower) as appropriate. | `app-windows.jsx:21, 74, 116, 149`, `ie-window.jsx:44` |
| E2  | `postMessage` receivers do not validate `event.origin` or `event.source`.                                                                                                                                                                                                                                   | `app-windows.jsx:176-199`                              |
| E3  | `alert()` dumps from IE "Favorites" / "History" buttons — not a security issue but a UX regression and uses native alert.                                                                                                                                                                                   | `ie-window.jsx:159-169`                                |
| E4  | IE frame accepts `javascript:` URLs via the address bar (B13).                                                                                                                                                                                                                                              |                                                        |
| E5  | `window.WindoesApp = WindoesApp` exposes internal state + reducer + methods on the global object. Keep for now (iframe bridge) but namespace/freeze the surface used by iframes.                                                                                                                            | `app-state.js:372`                                     |

### 2.6 Performance

| #   | Finding                                                                                                                                                                      | Location                     |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| F1  | `flushSync` in `renderInto` defeats React's batching; used on every drag frame.                                                                                              | `react-view.js:40-42`        |
| F2  | `WindowManager._updateTitlebars()` iterates all windows on every state change, reads `state.windows.byId`, and toggles classes. Could subscribe per-window.                  | `window-manager.jsx:505-526` |
| F3  | `virtual-fs.js` uses IDB `getAll()` + in-memory filter for directory listings (B8). A compound index or `IDBKeyRange.bound(prefix, prefix + '\uffff')` would be O(children). | `virtual-fs.js:230-252`      |
| F4  | `fs-explorer.jsx` `render()` runs a `fs.stat` per entry (N+1). Since `fs.readdir` already visited both stores, surface `type` from `readdir` directly.                       | `fs-explorer.jsx:152-159`    |
| F5  | `ie-window.jsx` re-runs `setInterval(updateClock, 1000)` indefinitely even if the taskbar is hidden. Consider an `on visibilitychange` pause.                                | `ie-window.jsx:190`          |

### 2.7 Testing

| #   | Finding                                                                                                                                                         | Location                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| G1  | Home-rolled test runner (`tests/run-tests.js`) hard-codes test file list; no file pattern, no parallelism, no coverage. Move to Vitest or Node's `node --test`. | `tests/run-tests.js`       |
| G2  | Reducer in `app-state.js` has no direct unit tests — only exercised indirectly by Playwright. Add a focused reducer suite (pure, fast).                         | `app-state.js:78-293`      |
| G3  | `VirtualFS` is tested, but edge cases (rename into own child, concurrent writes, large files) are not covered.                                                  | `tests/test-virtual-fs.js` |
| G4  | Each embedded app has its own npm install (`npm run install:apps` walks four directories). CI will run `npm install` four extra times. Consider npm workspaces. | `package.json:17`          |
| G5  | No CI workflow is checked in under `.github/workflows/` beyond deploy (not verified here); confirm tests run on PRs.                                            | `.github/workflows/`       |

### 2.8 Tooling & conventions

| #   | Finding                                                                                                                                                                                        | Location                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| H1  | No TypeScript. A shell with a strongly-typed reducer + discriminated-union actions would catch most action/name typos. A `tsconfig.json` + `// @ts-check` as a halfway step is also an option. | project-wide                         |
| H2  | No ESLint / Prettier configuration is checked in. Indentation varies (4 spaces in most files, 2 spaces in `virtual-fs.js`), and quote style is inconsistent.                                   | project-wide                         |
| H3  | No pre-commit hooks (husky / lint-staged).                                                                                                                                                     | project-wide                         |
| H4  | No JSDoc on the reducer action shapes or on `WindowManager`'s public methods.                                                                                                                  | `app-state.js`, `window-manager.jsx` |
| H5  | `styles.css` is one 1891-line file. At this size it is worth splitting by concern (boot, windows, start-menu, context-menu, explorer, dialogs) or moving to CSS Modules per component.         | `windoes/styles.css`                 |
| H6  | README mentions a `.github/workflows/` folder and a `CONTRIBUTING` section but there is no `CONTRIBUTING.md`, no `CHANGELOG.md`, no architecture overview beyond the ADR.                      | repo root                            |

### 2.9 Accessibility

| #   | Finding                                                                                                                                                                                  | Location                                                                                                      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| I1  | Menu items are `div`s with click handlers (D1).                                                                                                                                          |                                                                                                               |
| I2  | Context menus / dialogs do not trap focus or restore focus to the trigger element on close.                                                                                              | `RunDialog.jsx`, `ErrorDialog.jsx`, `NotepadDialogs.jsx`, `DesktopContextMenu.jsx`, `ExplorerContextMenu.jsx` |
| I3  | No `aria-expanded` on the Start button; no `role="menu"` / `role="menuitem"` on menus.                                                                                                   | `shell/Taskbar.jsx`, `shell/StartMenu.jsx`                                                                    |
| I4  | Icons use background-image CSS classes with no text alternatives inside the image element — labels are visible, so mostly fine, but `.icon-graphic` has no `role="img"` / `aria-hidden`. | `desktop.jsx:26-30`                                                                                           |
| I5  | Inline `alert()` for IE favorites/history (B/E).                                                                                                                                         |                                                                                                               |

### 2.10 Dead code & small cleanups

| #   | Finding                                                                                                                                                                                                | Location                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| J1  | Stub re-export files (A3).                                                                                                                                                                             |                                                                   |
| J2  | Unused `close*` functions (B5).                                                                                                                                                                        |                                                                   |
| J3  | `selectedItemPath = null` no-op (B6).                                                                                                                                                                  |                                                                   |
| J4  | `truncateTitle` in `ie-window.jsx` doesn't truncate anything — it just appends. Rename or remove.                                                                                                      | `ie-window.jsx:78-80`                                             |
| J5  | Magic numbers scattered (taskbar height 30 / 36, viewBorder 4, z-index base 10, minVisible 60, memTarget 262144). Extract to a `constants.js`.                                                         | `window-manager.jsx`, `dragging.js`, `app-windows.jsx`, `boot.js` |
| J6  | `NotepadDialogs` file-menu logic uses DOM-level `onDocumentClick` that inspects `e.target.closest('#notepadFileMenu')` and manually toggles state — could be React event handlers on the menu element. | `shell/NotepadDialogs.jsx:68-97`                                  |

---

## 3. Roadmap

Each phase is designed to ship on its own PR (or short sequence of PRs) without regressing Playwright tests. **Effort** is a rough estimate assuming one contributor; **risk** tracks behavior-change likelihood.

### Phase 0 — Guardrails (½–1 day, low risk) ✅ Done

Set up the tooling we need before changing code.

- [x] **H2 / H3** Add Prettier + ESLint (flat config) with a minimal ruleset (no-unused-vars, react/jsx-key, no-implicit-globals, consistent-return).
- [x] **G1** Replace `tests/run-tests.js` with Vitest _or_ `node --test` and a single `npm test` entry. Keep the Playwright integration tests but run them through the new runner.
- [x] **G2** Add a pure reducer unit test suite for `app-state.js` (every `case` gets at least one fixture).
- [x] **H3** Add husky + lint-staged running Prettier on staged files.
- [x] **H4** Document the reducer action shapes with JSDoc `@typedef` blocks.

**Exit criteria:** met — `npm test` now runs lint + reducer unit tests + Playwright and passes from a fresh sync.

### Phase 1 — Dead code & quick wins (½ day, low risk) ✅ Done

- [x] **A3 / J1** Delete `windoes/context-menu.jsx`, `windoes/run-dialog.jsx`, `windoes/start-menu.jsx`.
- [x] **B5 / J2** Delete unused `closeApp` / `closeWinamp` / `closeMinesweeper` / `closeSolitaire`.
- [x] **B6 / J3** Remove `selectedItemPath = null;`.
- [x] **J4** Rename or delete `truncateTitle`.
- [x] **A6** Extract `closeStartMenuBoilerplate()` helper and call it from every `open*()`.
- [x] **D5** Extract `closeOtherSubmenus(except)` and deduplicate `onMouseEnter` inline handlers.
- [x] **J5** Introduce `windoes/constants.js` for taskbar height, viewBorder, z-index base, etc.

**Exit criteria:** diff is all deletions/dedup; no behavior change.

### Phase 2 — Correctness & lifecycle fixes (1–2 days, medium risk)

- [x] **B4 / E2** Validate `event.origin` + `event.source` on every `window.addEventListener('message', …)` handler. Reject by default; allow only known iframe contentWindows.
- [x] **E1** Add `sandbox="allow-scripts allow-same-origin"` (tune per iframe) to every iframe.
- [x] **B13 / E4** Reject `javascript:` and `data:` URLs in `normalizeUrl` for the IE address bar.
- [x] **B11** Fix Stop button — target the iframe's contentWindow instead of the host.
- [x] **B12** Render shutdown screen as a React component so it is torn down with the shell.
- [x] **B9** Replace silent `catch(e) {}` blocks in `sound.js` with a single `debugLog`-gated warning; keep the UX quiet but not the logs.
- [x] **B10** `fs-explorer.render()` should surface the error message into the status bar for the dev UI and log via `console.error`.
- [x] **C1–C5** Audit every top-level `setInterval`, `setTimeout`, and `addEventListener`. Add cleanup hooks. Where the module is truly singleton-per-tab, at minimum store timer ids so HMR can clear them.
- [x] **B1 / F5** Move the taskbar clock into `Taskbar.jsx` with a `useEffect` interval and pause on `document.hidden`.

**Exit criteria:** no new lint warnings; Playwright tests unchanged; new reducer tests for shutdown + URL validation pass.

### Phase 3 — Reducer purity & state deduplication (2–4 days, medium/high risk)

Goal: make `WindoesApp.state` the single source of truth for window lifecycle and remove duplicated mutable state in `WindowManager`.

- [x] **A4** Collapse `WindowManager._stack` / `_windows[id].isOpen` / `.isMaximized` into reducer actions (`WINDOW_OPEN`, `WINDOW_CLOSE`, `WINDOW_MINIMIZE`, `WINDOW_RESTORE`, `WINDOW_MAXIMIZE_TOGGLE`, `WINDOW_FOCUS`). Keep `WindowManager` as a view layer that _reads_ state and applies DOM side effects.
- [x] **A8** Either (a) move drag into the reducer and render window position declaratively (bind `style.left`/`style/top` via React), or (b) remove drag from the reducer entirely and keep it imperative. Pick one.
- [x] **A9** Replace the sequence-number "interaction command" pattern with a typed event-emitter (`createEventBus` — 20 lines) or move the logic directly into React components.
- [x] **A2** Remove `bootDone` getter/setter; replace call sites with explicit `state.boot.done` reads or `BOOT_FINISH` dispatches.
- [x] **F2** Fold titlebar active-class updates into a React subscription (`useWindoesState(s => s.windows.byId[id].focused)` per window).

**Exit criteria:** grep `WindowManager._` shows only helper methods; reducer tests cover every window action; Playwright still green.

### Phase 4 — Componentize the shell windows (3–5 days, high risk)

Goal: turn the imperative window registrations into React components and delete `_buildWindowEl`.

- [x] **A5 / D3** Introduce a `<Window>` component that renders chrome (titlebar / menubar / toolbar / status). Convert each existing registration (IE, My Computer, Notepad, Recycle Bin, App, Winamp, Minesweeper, Solitaire) into a component that renders `<Window>` with app-specific children. _Completed incrementally: Recycle Bin + App (slice 1), IE + Notepad (slice 2), My Computer + Minesweeper (slice 3), Solitaire + Winamp headless marker path (slice 4/5)._
- [x] **A1 / A7 / D7** Eliminate `desktop.jsx` + `fs-explorer.jsx`'s module-level DOM refs. `fs-explorer` now exposes React-consumable navigation/view state seams (`useSyncExternalStore` consumers for toolbar + view), My Computer behavior is componentized (`my-computer-toolbar.jsx`, `my-computer-view.jsx`), and legacy `desktop.jsx` has been removed in favor of React-owned desktop icon interactions in `shell/Desktop.jsx`.
- [x] **D1 / I1 / I3** While rewriting, upgrade interactive elements to proper `<button>` / `[role=menuitem]` / `aria-expanded` / `aria-haspopup`.
- [x] **D2** Replace `flushSync` in `renderInto` with async default updates and keep explicit sync wrappers (`renderIntoSync`, `unmountFromSync`) for deterministic call sites/tests.
- [x] **D4** Re-implement start-menu submenu positioning with declarative React state (computed style outputs asserted in integration tests).

**Exit criteria:** met — `window-manager.jsx` is ≤ 200 lines and orchestration-focused, `WindoesApp.dom` bridge is removed, and `document.getElementById` no longer appears in shell feature modules (remaining occurrences are inside embedded `public/applications/*` content/tests).

### Phase 5 — VirtualFS performance & correctness (1 day, low risk)

- [x] **F3 / B8** Use `IDBKeyRange.bound(prefix, prefix + '\uffff')` on the `path` key to fetch only descendants. Add an in-memory cache keyed by directory path, invalidated on writes.
- [x] **F4 / B7** Return `{name, type}` from `VirtualFS.readdir`, skip per-entry `stat` in `fs-explorer`.
- [x] **B14** Tighten `writeFile` size computation and narrow the content type via JSDoc.
- [x] **B15** Document (or add a test for) the single-transaction guarantee in `rename`.
- [x] **G3** Add regression tests for rename-into-own-child, concurrent `writeFile`, recursive delete mid-rename.

**Exit criteria:** met — local Playwright benchmark on cold IDB (`/bench` with 1000 files) measured ~10.2 ms for `readdir`; new tests pass.

### Phase 6 — CSS & tooling (1–2 days, low risk)

- [x] **H5** Split `styles.css` into per-feature partials imported from `styles.css` (implemented under `windoes/styles/*.css`).
- [ ] **H1** Add `tsconfig.json` with `allowJs` / `checkJs` as a first TS step. Migrate `app-state.js` and `virtual-fs.js` to `.ts` — they have the highest type-leverage.
- [ ] **G4** Adopt npm workspaces for embedded apps; remove `install:apps` and collapse duplicate `playwright` dev deps.
- [ ] **H6** Add `CONTRIBUTING.md` (where to run what), `docs/architecture.md` (dataflow diagram), and keep a terse `CHANGELOG.md`.

**Exit criteria:** `npm install` at the root installs everything; `tsc --noEmit` passes on migrated files.

### Phase 7 — Accessibility pass (1 day, low risk)

- [ ] **I1 / D1** Verify all menu items are `<button>` or `[role=menuitem]`.
- [ ] **I2** Implement focus trap + focus restore in each dialog (`RunDialog`, `ErrorDialog`, `NotepadDialogs`, shutdown dialog).
- [ ] **I3** `aria-expanded`, `aria-haspopup`, `aria-controls` on Start button + top-level menubars.
- [ ] **I4** Decorative icons get `aria-hidden="true"`.
- [ ] **E3** Replace `alert()` in IE favorites/history with the existing error-dialog component.
- [ ] Run axe-core (`@axe-core/playwright`) in CI and fail on violations.

**Exit criteria:** axe-core reports 0 serious / critical violations on the booted shell.

---

## 4. Suggested sequencing

The safest merge order is 0 → 1 → 2 → 5 → 6 → 3 → 4 → 7:

- Phases 0–2 are mostly risk-free cleanups.
- Phase 5 (VirtualFS) is independent of the shell rewrite and unlocks a perf improvement.
- Phase 6 (tooling/CSS) reduces churn before Phase 4 rewrites.
- Phases 3–4 are the biggest changes; holding them until the tooling is ready minimizes rework.
- Phase 7 locks in the a11y gains after the component surface is stable.

## 5. What's deliberately out of scope

- Embedded apps under `windoes/public/applications/*` (Solitaire, Minesweeper, ASCII Runner, Winamp Player). Those have their own roadmaps and are only consumed via iframe.
- Visual/retro fidelity changes.
- Any new features (drag-drop between folders, taskbar context menus, etc.). Re-evaluate after Phase 4.
