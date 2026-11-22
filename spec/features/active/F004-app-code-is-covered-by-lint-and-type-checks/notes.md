# F004 notes

## Order

Inline `<script>` lines in each app's `index.html` before the move, measured 2026-11-22. Slices go smallest first:

| App           | Lines |
| ------------- | ----- |
| winamp-player | 899   |
| paint         | 1020  |
| minesweeper   | 1109  |
| solitaire     | 1190  |
| minecraft     | 1206  |

## Pattern

- The app's code moves to one file, `windoes/public/applications/<app>/app.js`. `index.html` loads it with `<script src="app.js"></script>` at the place the inline script was.
- No new config per app. `eslint.config.mjs` has a block for `windoes/public/applications/*/app.js` that sets `sourceType: 'script'`, so `no-implicit-globals` flags top-level names; globals stay those of the general block (browser and node). `tsconfig.json` has the same glob in `include`. A new `app.js` is linted and type-checked under `strict` as soon as it exists.
- Check coverage with `npx tsc --listFilesOnly | grep applications` and `npx eslint windoes/public/applications/<app>/app.js`.

## Why a classic script, not `type="module"`

- The app suites open `index.html` over `file://`. Chromium blocks module scripts from `file://` (CORS), so a module would break the suite. A classic script loads from `file://` and from the opaque-origin frame (no CORS check).
- Inside the shell the frame has an opaque origin, so a module fetch is cross-origin. The dev and preview servers and GitHub Pages send `Access-Control-Allow-Origin: *` for `applications/` (`appsCorsPlugin` in `vite.config.js`), so a module would load there. If a later slice wants modules, the suites must move off `file://` first.
- A classic script keeps the moved code's semantics: the IIFE keeps names private, code after it stays sloppy mode, and inline `onclick` attributes (Winamp's `closeAbout()`) still reach the `window` functions the script sets.
- Because `app.js` is a global script to TypeScript, keep all top-level names inside the IIFE. Two `app.js` files with top-level declarations of the same name would collide in the type check.

## Typing the moved code

- `byId(id, HTMLInputElement)` returns the element with that id and throws if it is missing or of another kind. Use it in place of `document.getElementById` for elements the markup always has.
- `required(value, what)` throws on `null`/`undefined`, for `getContext('2d')`, `parentElement`, `querySelector` results that the markup guarantees.
- Prefer the captured element over `e.target` in listeners; set `input.value` with a string (`String(n)`), read it with `Number(...)` / `parseFloat(...)`.
- Narrow casts (`/** @type {NodeListOf<HTMLInputElement>} */ (...)`) only for `querySelectorAll` results and vendor-prefixed globals.
- Apps that use `../shared/app-storage.js` (minesweeper, solitaire, paint, ascii-runner) read a global it sets. Their slice must declare that global's type for the type check; winamp-player does not use it.

## Proof that the app still loads in the shell

- `node tests/test-app-sandbox.js` opens Winamp in the shell on the dev server, loads `tracks.json` from the opaque origin and plays a track.
- For the built app: `npm run build`, `npx vite preview --port 4179`, open the shell, call `WindoesApp.open.winamp()`, and check in `#winampFrame` that `self.origin` is `"null"`, `app.js` answered 200, the EQ and playlist rendered, and the console has no errors.
