---
opened: 2026-11-22
---

# F004 · App code is covered by lint and type checks

## Outcome

About 5,400 lines of app logic live in inline `<script>` blocks in the `index.html` files of minecraft, minesweeper, paint, solitaire and winamp-player. ESLint and the type check never see them. After this, that code lives in `.js` modules that `npm run lint` checks and `checkJs` type-checks.

## Scope

- One app per slice; start with the smallest file and record the pattern in `notes.md` here.
- Move the inline script into module files beside the app's `index.html`; behavior stays the same.
- Add the new files to the ESLint globs and to `tsconfig.json` with `checkJs`, fixing or narrowly suppressing the errors that surface.

## Out of scope

- Turning on `js.configs.recommended` for the whole repository.
- Rewriting app logic or UI.
- The iframe sandbox and origin change.

## Acceptance

- Each migrated app's `index.html` has no inline script beyond one external `<script src="app.js">` tag.
- `npm run lint` and `npm run typecheck` cover the new files (seen in `tsc --listFilesOnly` and an ESLint run on one file).
- Each migrated app's suite passes unchanged.
- `npm run build` exits 0 and the built app loads.

## Notes

The loader is a classic script, not a module: the app suites open `index.html` over `file://`, where Chromium blocks module scripts. Module tags wait until the suites stop using `file://`.
