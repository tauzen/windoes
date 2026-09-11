# Windoes

A Windows 98-inspired desktop simulator built with HTML/CSS and modular JavaScript, bundled with Vite.

Windoes recreates a retro desktop UX with draggable windows, taskbar behavior, Start menu interactions, desktop icons, and built-in mini apps. The simulator now runs from a single React root (`#app`) and uses a portal registry (`renderInto`) so shell visuals render through one React application, while bundled applications remain standalone under `windoes/public/applications/`.

## Live demo

https://tauzen.github.io/windoes/

## What is included

- Boot flow + retro dialogs (`boot.js`, `bsod.jsx`, `utility-windows.jsx`)
- Desktop shell and taskbar (`desktop.jsx`, `shell/StartMenu.jsx`, `window-manager.jsx`)
- Windowed app launching (`app-windows.jsx`, `ie-window.jsx`, `shell/RunDialog.jsx`)
- Virtual file system and explorer-style navigation (`virtual-fs.ts`, `fs-explorer.jsx`)
- Built-in applications under `windoes/public/applications/`:
  - ASCII Runner
  - Minecraft
  - Minesweeper
  - Solitaire
  - VirtualBoks (boots a real guest OS in an emulated PC)
  - Winamp Player

## Project structure

```text
windoes/
  main.js                app entrypoint
  index.html             shell markup
  styles.css             global styles
  react-view.js          React root mounting helper (renderInto)
  window-manager.jsx     shell window rendering + lifecycle
  desktop.jsx            desktop icon rendering/events
  shell/StartMenu.jsx    Start menu rendering/events
  simulator.config.js    app/window configuration
  public/
    icons/               desktop/start menu icon assets
    img/                 boot screen assets
    applications/        embedded app bundles + app-level tests
scripts/                 build-time asset staging
tests/                   top-level simulator test suite
.github/workflows/       CI + deploy workflows
```

## VirtualBoks

VirtualBoks boots a real operating system inside the desktop. It embeds the
[v86](https://github.com/copy/v86) x86 emulator, so the guest kernel executes on
an emulated CPU in the page — nothing runs on a server, and nothing is recorded.

The emulator core and its firmware are staged into
`windoes/public/applications/virtualboks/vendor/` by
`scripts/fetch-vm-assets.mjs`, which runs automatically from `postinstall`. That
directory is git-ignored; re-stage it at any time with:

```bash
npm run assets:vm
```

Guest disk images are far too large to ship here, so a machine points at one of
two things:

- **A URL.** The built-in machines use the image host the v86 project documents
  for its own demos, and any other URL can be entered under **New**. The host has
  to allow cross-origin requests; if it does not, the download fails and the
  status bar says so.
- **A file on your computer.** Pick any ISO, floppy or disk image under **New >
  Media from > File**. Nothing is uploaded. Files chosen this way are not
  remembered between sessions, so re-attach them via **Settings** before
  starting.

The built-in **Self-Test** machine boots a boot sector assembled in the page and
downloads nothing, which makes it a quick way to confirm the emulator itself is
working.

Booting needs a real HTTP origin, because the emulator fetches its WebAssembly
core — `npm run dev` or a built deployment both work, opening `index.html` from
the filesystem does not.

## Architecture contract (React shell migration)

Windoes uses a single canonical shell state contract during migration, centered on:

- `boot`
- `menus`
- `dialogs`
- `windows`
- `selection`
- `drag`

See `docs/adr-react-shell-state-contract.md` for the complete contract and compatibility-layer boundaries.

`WindoesApp` should be treated as a temporary bridge for legacy integration only. New shell behavior should be implemented as reducer actions + React component handlers instead of new global imperative handles.

## Local development

Requirements:

- Node.js 18+
- npm

Install dependencies:

```bash
npm ci
```

Start the dev server:

```bash
npm run dev
```

Then open the local URL shown by Vite (usually `http://localhost:5173`).

## Build and preview

```bash
npm run build
npm run preview
```

## Tests

Run simulator tests:

```bash
npm test
```

Simulator tests launch a Vite dev server using the project `vite.config.js` (so JSX/React transforms match normal local development).

Run embedded app tests:

```bash
npm run test:apps
```

The VirtualBoks suite boots a guest on the emulated CPU and asserts it reaches
the emulated screen. It needs the staged emulator assets, so run `npm ci` (or
`npm run assets:vm`) first.

Run everything:

```bash
npm run test:all
```

## Contributing

- Create a feature branch from `main`
- Keep commits focused and descriptive
- Run `npm run test:all` before opening a PR (`npm run typecheck` + simulator + embedded app tests)
