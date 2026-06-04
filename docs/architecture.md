# Windoes architecture

A Windows-98-inspired desktop simulator built with React 19 + Vite. This
document is a map of how the pieces fit together. For the state-management
contract specifically, see
[`adr-react-shell-state-contract.md`](./adr-react-shell-state-contract.md).

## High-level shape

```text
index.html ──> main.js ──> <ShellApp/> mounted into #app (single React root)
                  │
                  ├─ dynamically imports feature modules (sound, window-manager,
                  │  boot, bsod, ie-window, app-windows, utility-windows)
                  │
                  └─ schedules runBootSequence() after BOOT_SEQUENCE_DELAY_MS

WindoesApp (window-global)
   ├─ state  ── useSyncExternalStore store over app-state-reducer.mjs
   ├─ events ── typed one-shot event buses (window/explorer/notepad)
   ├─ config ── simulator.config.js (overridable for tests)
   └─ open/bsod/ui/browser/... ── legacy imperative service handles (bridge)

Embedded apps (standalone, in iframes)
   public/applications/{ascii-runner,minesweeper,solitaire,paint,winamp-player}
   communicate with the shell via postMessage (origin- + source-checked).
```

## Entry & boot

- `windoes/main.js` is the entrypoint. It mounts a single React root
  (`#app`) with `<ShellApp/>`, then dynamically imports the feature modules and
  kicks off the boot sequence after `BOOT_SEQUENCE_DELAY_MS`.
- `windoes/boot.js` drives the BIOS POST + splash animation by dispatching
  `BOOT_*` actions; `windoes/bsod.jsx` provides the error/blue-screen dialogs.

## Shell state

- **Store:** `windoes/app-state.ts` (`useSyncExternalStore`), exposed as
  `WindoesApp.state` (`get` / `dispatch` / `subscribe` / `use`).
- **Reducer:** `windoes/app-state-reducer.mjs` — a pure `switch`-based reducer
  with immutable updates and helper combinators (`withWindowState`,
  `recomputeWindowMeta`, `withDialogs`, `withNotepad`). Unit-tested in
  `tests/node/reducer.test.js`.
- The canonical state slices are `boot`, `menus`, `dialogs`, `windows`,
  `selection`, `explorer`, `notepad`. See the ADR for the full contract.

## Windowing

- `windoes/window-manager.jsx` and `windoes/window-manager/` render and manage
  shell windows. Window records live in the `windows` slice (`stack`,
  `focusedId`, `byId`); focus and z-index are derived from stack order.
- `windoes/dragging.js` implements pointer-driven window dragging, clamped to
  keep a window above the taskbar (`TASKBAR_DRAG_RESERVE_PX`) and partly
  on-screen (`DRAG_MIN_VISIBLE_PX`).

## Built-in apps (windowed shell features)

- `windoes/app-windows.jsx` — generic app frame plus Winamp, Minesweeper,
  Solitaire, and Paint windows. Owns the cross-iframe `message` listener and
  the Paint VirtualFS save/load bridge.
- `windoes/ie-window.jsx` — Internet Explorer window (address bar, history,
  navigation) on top of `browser-url.mjs`.
- `windoes/utility-windows.jsx` — My Computer explorer, Notepad, and Recycle
  Bin windows.
- `windoes/fs-explorer.jsx`, `my-computer-view.jsx`, `my-computer-toolbar.jsx`,
  `explorer-navigation.mjs` — explorer rendering and navigation.

## Virtual filesystem

- `windoes/virtual-fs.ts` is a sandboxed, IndexedDB-backed filesystem with
  typed error classes (`FileNotFoundError`, `FileExistsError`, …), atomic
  `rename`/`rm`, `readdir` caching with cross-tab `BroadcastChannel`
  invalidation, and a defensive `normalizePath`. It is **not** a host
  filesystem — `..` resolves within the virtual tree only.

## Embedded applications

Apps under `windoes/public/applications/` are standalone bundles loaded in
sandboxed iframes and managed as an npm workspace. They talk to the shell via
`postMessage`; the shell validates both `event.origin` and `event.source`
before acting (`app-windows.jsx`). These apps are now covered by the shared
ESLint config (the former `public/applications/**` ignore was removed); they
remain outside the TypeScript configuration (tracked in the code-quality
roadmap).

## Shared constants

Magic numbers and shared literals (timeouts, sizing, the default Notepad save
path, taskbar-label truncation budgets, …) live in `windoes/constants.js` so
they have one named home instead of being scattered across modules.

## Tooling & tests

- **Lint/format:** ESLint flat config (`eslint.config.mjs`) + Prettier, with
  Husky + `lint-staged` enforcing formatting on commit.
- **Type-checking:** `tsc --noEmit` over the two `.ts` modules plus `checkJs`.
- **Tests:** Node reducer/util unit tests and Playwright integration tests
  under `tests/`, axe-core accessibility check, and per-app smoke tests. Run
  everything with `npm run test:all`.
- **CI:** `.github/workflows/test.yml` runs the full matrix on non-`main`
  pushes.
