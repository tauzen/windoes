# Windoes

A Windows 98-inspired desktop experiment built with vanilla HTML, CSS, and JavaScript.

It includes a working desktop with draggable windows, taskbar, Start menu, and embedded apps (Winamp, Minesweeper, ASCII Runner), plus retro boot sequence/BSOD/error popups.

## Live demo

https://tauzen.github.io/windoes/

## Project structure

```text
windoes/          simulator source (deployed to GitHub Pages)
  applications/   embedded apps (minesweeper, winamp, ascii-runner)
  icons/          desktop icons
tests/            end-to-end tests (Playwright)
```

## Local development

```bash
npm ci
```

Open `windoes/index.html` in a browser (or run any static file server from the repo root).

## Running tests

```bash
npx playwright install chromium
npm test
```

## Contribution guidelines

When Kermit contributes to this repo:

- Always create a new branch (never commit feature work directly on `main`)
- Push the branch to GitHub when ready
- Share a PR creation link so Tauzen can open the PR manually

Reason: deploy-key access can push branches, but cannot create PRs directly.
