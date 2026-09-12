# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Added

- VirtualBoks now reports a guest image it cannot fetch instead of hanging.
  v86 treats every failed download as retryable and backs off forever without
  surfacing anything, so a blocked or missing image left the window stuck on
  "Starting...". The manager now probes the image URL itself before starting
  the emulator and names the likely cause (unreachable host, a missing
  `Access-Control-Allow-Origin` header, or an HTTP error), and a watchdog
  catches a download that stalls part-way through. A start that never reaches a
  running guest is also torn down properly: the machine returns to powered off
  with **Start** and **Remove** usable again, and is flagged in the machine
  list rather than appearing to still be running.

- **VirtualBoks**, a virtual machine manager that boots a real guest operating
  system inside the desktop. It wraps the [v86](https://github.com/copy/v86)
  x86 emulator: an emulated PC runs in the application iframe, executing an
  actual kernel on an emulated CPU rather than replaying a recording. The
  manager lists machines VirtualBox-style with a details pane (memory, attached
  media, guest), and **New**/**Settings**/**Remove** manage machines that
  persist in local storage. **Start**, **Power Off**, **Reset**,
  **Ctrl+Alt+Del** and **Screenshot** drive a running guest, whose output shows
  in a console pane with **Display** (VGA) and **Serial** tabs and a download
  progress bar in the status bar. Built-in machines cover Linux 2.6, Buildroot
  6.8, Tiny Core 11 and FreeDOS; guest images are fetched from the host the v86
  project documents, or a disk image can be attached from your own computer.
  A built-in **Self-Test** machine boots a boot sector assembled in the page, so
  the emulator can be exercised with no download at all. Launches from the
  desktop icon, **Programs > VirtualBoks**, or `virtualboks` in the Run dialog.
  Covered by `tests/test-virtualboks-launch.js` and the application's own suite,
  which boots a guest and asserts it reaches the emulated screen.
- `scripts/fetch-vm-assets.mjs` (run from `postinstall`, or `npm run assets:vm`)
  stages the v86 emulator core from npm and its SeaBIOS/VGABIOS firmware from
  upstream into `windoes/public/applications/virtualboks/vendor/`, which is
  git-ignored. The firmware is pinned by SHA-256. A failure here never breaks
  `npm ci`: VirtualBoks explains how to retry instead of booting.
- HTML file support: files ending in `.html`/`.htm` are treated as web pages
  and open in Internet Explorer, which renders VirtualFS documents in its
  content frame (local documents render sandboxed without `allow-same-origin`).
  The address bar shows the Windows-style path (`C:\My Documents\page.html`),
  which can also be typed directly, and Back/Forward/Refresh work across local
  pages. In the explorer, HTML files get an IE document icon, and their context
  menu — right-click on desktop, long-press on touch devices — offers **Open**
  (Internet Explorer) plus **Open With > Notepad** to view and edit the source.
  Notepad's Open/Save dialogs now accept `.html`/`.htm` alongside `.txt`, and a
  sample `Welcome.html` is seeded into `My Documents` on first boot. Covered by
  `tests/test-html-file-open.js`.
- The file chooser now warns before overwriting in Save mode. When the chosen
  name (or a typed name) matches an existing file, a confirmation dialog appears
  explaining that the file will be replaced, with **Cancel** (return to the
  chooser without resolving) and **Replace** (proceed with the overwrite)
  buttons. Covered by `tests/test-file-chooser-overwrite.js`.
- A shared file chooser dialog (`windoes/shell/FileChooserDialog.jsx`) used for
  opening and saving files. It browses the VirtualFS, lists folders and files
  (filtered by type), lets you navigate into folders and back up a level, type a
  file name at the chosen location, and — in Save mode — create new folders. It
  is driven imperatively via `WindoesApp.fileChooser.open(options)`, which
  resolves to the chosen absolute path (or `null` on cancel). Notepad now uses it
  for Save / Save As and gains an "Open..." menu entry (Ctrl+O); Paint routes its
  Open and Save As through the same dialog via the iframe message bridge (falling
  back to its built-in prompt only when run standalone).
- Access rights for the virtual filesystem: files and directories can be flagged
  as protected "system" entries that cannot be deleted or renamed. `VirtualFS`
  gains a `{ system }` option on `mkdir`/`writeFile`, `setSystem`/`isSystem`
  helpers, a `system` field on `stat`/`readdir` results, and a new
  `PermissionDeniedError` thrown by `rm` (including recursive deletes whose
  subtree contains a protected child) and `rename`. The shipped `/C:`,
  `/C:/My Documents`, and `Hello.txt` paths are now protected on first boot, and
  the explorer context menu disables Rename/Delete for protected items.

### Changed

- Code-quality Phase 4 (item 10): decomposed the 629-line `StartMenu.jsx` into a
  data-driven menu model (`windoes/shell/start-menu-config.js`) plus small
  presentational components (`windoes/shell/MenuItems.jsx` — `MenuItem`,
  `Submenu`). The cascading submenus and their items now render by mapping over
  config, and the family of near-duplicate `onXEnter`/`onXLeave` hover handlers
  collapses into a single rule derived from each panel's `chain` of ancestor
  submenus. DOM ids, classes, ARIA attributes, and hover/leave behaviour are
  unchanged; added `tests/node/start-menu-config.test.js` to lock the model's
  structural invariants.
- Code-quality Phase 3 (item 8): the Internet Explorer and generic app windows
  now render their title, status-bar text, and task-button label reactively from
  new `browser`/`app` reducer state (`BROWSER_SET_PAGE`/`BROWSER_SET_STATUS`,
  `APP_SET_PAGE`/`APP_SET_STATUS`), removing the imperative `textContent`
  writes in `ie-window.jsx` and `app-windows.jsx`.
- Code-quality Phase 3 (item 8): the window maximize-button glyph (`□`/`⧉`) is
  now rendered reactively from the reducer's `maximized` flag in the React
  titlebar, removing the imperative `updateMaxBtn` DOM writer. The button also
  exposes `aria-label="Restore"` while maximized.
- Code-quality Phase 3: migrated Start-menu and submenu open state into the
  canonical `menus` reducer slice (`START_MENU_TOGGLE`/`START_MENU_CLOSE`/
  `MENU_SUBMENUS_KEEP`), removing the `startMenuOpen` prop-drilling, the
  `submenuOpen` local component state, and the entire `WindoesApp.startMenu.*`
  imperative bridge (consumed by the taskbar, Run dialog, and launch helpers).
- Code-quality Phase 3: unified the paint/explorer/notepad VirtualFS-init
  guards behind a single tested single-flight memoizer (`windoes/once.mjs`),
  removing three module-level `let` flags (`paintFsInitPromise`,
  `fsInitialized`, `fsReady`) and fixing a latent concurrent-init race in the
  explorer's `initFS`.
- Code-quality Phase 3: migrated Notepad's current-document path off the
  `textarea.dataset.filePath` DOM-as-state into a `notepad.currentFilePath`
  reducer field (`NOTEPAD_SET_FILE_PATH`). The titlebar now renders from state
  via a `NotepadTitleText` component instead of `#notepadTitle.textContent`
  mutations, and the window menubar `aria-label` no longer breaks when a window
  uses a reactive (non-string) title.
- Code-quality Phase 3: migrated Internet Explorer history off module-level
  `historyStack`/`historyIndex` variables into a canonical `browser` reducer
  slice (`BROWSER_NAVIGATE`/`BROWSER_BACK`/`BROWSER_FORWARD`/
  `BROWSER_HISTORY_RESET`), with unit tests. `ie-window.jsx` now reads/writes
  history through `WindoesApp.state`, the first imperative subsystem retired
  per the migration roadmap.
- Code-quality Phase 2: brought the embedded apps under ESLint (removed the
  `windoes/public/applications/**` ignore) and cleared the dead code it
  surfaced (`game.js` unused effect/touch state, an unused test binding).
- Code-quality Phase 2: enabled TypeScript `strict` mode for the checked
  modules, adding `@types/react`/`@types/react-dom` and tightening
  `virtual-fs.ts`, `listener-set.mjs`, and `app-state.ts` to satisfy it.
- Code-quality Phase 2: replaced the loose reducer action `@typedef` with a
  discriminated `WindoesAction` union plus explicit `State` typedefs in
  `app-state-reducer.mjs`, and removed the `as never` dispatch cast in
  `app-state.ts`.
- Code-quality Phase 1: promoted `no-unused-vars`, `react/jsx-key`, and
  `no-implicit-globals` ESLint rules from `warn` to `error`, and added
  `eslint-plugin-react-hooks` (`rules-of-hooks: error`, `exhaustive-deps: warn`).
- Code-quality Phase 1: extracted magic constants (boot delay, IE loading
  timeout, taskbar-label truncation budgets, default Notepad save path) into
  `windoes/constants.js`.
- Phase 6 H5: split `windoes/styles.css` into feature partials under `windoes/styles/*.css`.
- Phase 6 H1: added TypeScript bootstrap (`tsconfig.json`) and migrated core modules to `.ts`:
  - `windoes/app-state.ts`
  - `windoes/virtual-fs.ts`
- Phase 6 G4: adopted npm workspaces for embedded apps and removed per-app install workflow.
- Added root `typecheck` script and included typecheck in `npm run test:all`.

### Added

- `CONTRIBUTING.md`
- `docs/architecture.md`
- `docs/adr-react-shell-state-contract.md` (the state contract referenced by the README)
