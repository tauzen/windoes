# Build

> Coordinator-maintained narrative board. TRACK, NEXT, PARKED and DROPPED are coordinator prose: keep them true in the change that moves feature state. NOW and PROVEN are generated from the feature lanes by `limen land`, `limen ticket done` and `limen board --write`; edit the tickets, not those lines.

TRACK at most three bullets. NEXT one clause per ticket. PROVEN names the last ten landed features, then one count line per month.

Status marks are prose only: 🟠 ACTIVE · 🔴 PLANNED · 🟢 PROVEN · ⚪ DROPPED. Nothing in `limen` treats them as workflow state.

## POLICY

- Models: every role runs `--engine omp --provider openai-codex --model gpt-6.1-terra --thinking medium`.
- Quota: if the selected model cannot run, preserve the work and ask the owner. Do not substitute a model.
- Publish: one pull request per feature, from the job's branch rebased on `origin/main`. The coordinator opens it after checks (and review, where required) pass; the owner merges. Workers never push. Planning-only commits (changes only under `spec/`) go straight to `main` from `limen/work` after `prettier --check spec` passes; any commit that touches another path needs a PR. Never push code to `main` directly (a push to `main` deploys GitHub Pages).

## TRACK

- Shell fidelity stretch: bring the Windoes shell close to Windows 98 SE, using our own art and an openly licensed font only. The shared 98 edge rules (F011) have landed; the chrome tickets reuse them.
- F009, F010, F012 and F014 run in parallel. F010 owns `--taskbar-height` and the maximised-window height; F009 and F014 share `windows-ie.css` (caption vs menu bar rules), so the second to merge is rebased.

## NOW

<!-- Generated from spec/features/active/ by limen land, limen ticket done and limen board --write. Edit the tickets, not these lines. -->

## NEXT

Shell fidelity backlog from `spec/research/windoes-ui-fidelity/report.md`, ranked by visual gain per unit of work.

- `F008-taskbar-buttons-have-a-right-click-menu-with-close` (PLANNED): 98 taskbar menu; closes a Winamp window whose page failed to load.
- `F013-ui-text-renders-in-a-crisp-8-pt-pixel-font` (PLANNED): one openly licensed pixel UI font; waits on owner approval of the font.
- `F015-the-start-menu-opens-like-the-windows-98-start-menu` (PLANNED): 98 row sizes, banner and 400 ms submenu delay.
- `F017-the-shut-down-dialog-dims-the-screen-and-uses-98-radio-buttons` (PLANNED): checkerboard backdrop and the 98 dotted radio focus box; after F011.
- `F018-the-blue-screen-is-laid-out-like-a-windows-9x-text-mode-screen` (PLANNED): centred 80-column text page.
- `F019-the-boot-splash-fills-the-screen-with-a-scrolling-colour-band` (PLANNED): full-screen splash, no progress bar.
- `F020-message-boxes-use-our-own-98-style-icons-and-the-98-layout` (PLANNED): our own 32x32 pixel icons, content-fit boxes.

## PROVEN

<!-- Generated from spec/features/done/ by limen land, limen ticket done and limen board --write. Edit the tickets, not these lines. -->

- `F016-desktop-icons-behave-like-windows-98-desktop-icons` (🟢 PROVEN): Desktop icons behave like Windows 98 desktop icons; landed 2026-11-28
- `F014-menus-look-and-behave-like-windows-98-menus` (🟢 PROVEN): Menus look and behave like Windows 98 menus; landed 2026-11-28
- `F012-scrollbars-look-like-windows-98-scrollbars` (🟢 PROVEN): Scrollbars look like Windows 98 scrollbars; landed 2026-11-28
- `F011-every-raised-and-sunken-edge-uses-the-windows-98-bevel` (🟢 PROVEN): Every raised and sunken edge uses the Windows 98 bevel; landed 2026-11-28
- `F010-taskbar-buttons-show-windows-98-active-and-inactive-states` (🟢 PROVEN): Taskbar buttons show Windows 98 active and inactive states; landed 2026-11-28
- `F009-window-title-bars-and-frames-match-windows-98` (🟢 PROVEN): Window title bars and frames match Windows 98; landed 2026-11-28
- `F007-winamp-title-bar-buttons-work-inside-the-shell` (🟢 PROVEN): Winamp title-bar buttons work inside the shell; landed 2026-11-28
- `F006-winamp-keeps-the-eq-preamp-boost-when-the-volume-changes` (🟢 PROVEN): Winamp keeps the EQ preamp boost when the volume changes; landed 2026-11-28
- `F005-winamp-matches-the-classic-2-x-skin-pixel-for-pixel` (🟢 PROVEN): Winamp matches the classic 2.x skin pixel for pixel; landed 2026-11-27
- `F004-app-code-is-covered-by-lint-and-type-checks` (🟢 PROVEN): App code is covered by lint and type checks; landed 2026-11-23
- 2026-11: 13 landed. spec/features/done/2026-11/
