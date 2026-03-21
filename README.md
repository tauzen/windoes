# Windoes

A Windows 98 inspired desktop experiment built with vanilla HTML, CSS, and JavaScript.

Features a working desktop with draggable windows, taskbar, Start menu, and embedded apps including Winamp player, Minesweeper, and ASCII Runner. Complete with boot sequence, BSOD, and random error popups.

## Live demo

https://tauzen.github.io/windoes/

## Project structure

```
windoes/          — simulator source (deployed to GitHub Pages)
  applications/   — embedded apps (minesweeper, winamp, ascii-runner)
  icons/          — desktop icons
tests/            — Playwright e2e tests
```

## Running tests locally

> Note: quick README update commit to verify deploy-key push access from OpenClaw.

## Contribution guidelines

When Kermit implements work in this repo:

- Always create a new branch (never commit feature work directly on `main`)
- Push that branch to GitHub when the change is ready
- Share a PR creation link (`compare` URL) so Tauzen can open the PR manually

Reason: deploy-key based access can push branches, but cannot open PRs directly.

```bash
npm ci
npx playwright install --with-deps chromium
npm test
```
