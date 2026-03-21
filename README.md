# Windoes

A Windows ME desktop simulator built with vanilla HTML, CSS, and JavaScript.

Features a working desktop with draggable windows, taskbar, Start menu, and embedded apps including Winamp player, Minesweeper, and ASCII Runner. Authentic boot sequence, BSOD, and random error popups included.

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

```bash
npm ci
npx playwright install --with-deps chromium
npm test
```
