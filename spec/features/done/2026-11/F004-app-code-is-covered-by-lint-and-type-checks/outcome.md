# Outcome

The inline scripts of all five apps (Winamp, Paint, Minesweeper, Solitaire, Minecraft) now live in `<app>/app.js`, which one ESLint block and the strict `tsconfig.json` glob cover; no app `index.html` has an inline script. Merged in PRs #133–#137 (last merge `75481ab`). The loader is a classic `<script src="app.js">`, because the app suites open `index.html` over `file://`, where Chromium blocks module scripts. Not verified: F2 for New Game inside the shell frame (Solitaire, PR #136); it works at top level in old and new code.
