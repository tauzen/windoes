# Build

> Coordinator-maintained narrative board. TRACK, NEXT, PARKED and DROPPED are coordinator prose: keep them true in the change that moves feature state. NOW and PROVEN are generated from the feature lanes by `limen land`, `limen ticket done` and `limen board --write`; edit the tickets, not those lines.

TRACK at most three bullets. NEXT one clause per ticket. PROVEN names the last ten landed features, then one count line per month.

Status marks are prose only: 🟠 ACTIVE · 🔴 PLANNED · 🟢 PROVEN · ⚪ DROPPED. Nothing in `limen` treats them as workflow state.

## POLICY

- Models: every role (worker, review, GitHub doorbell review, keeper, scout, quality, picture, research, judge) runs `--engine omp --provider anthropic --model claude-opus-5-5 --thinking high`.
- Quota: if the selected model cannot run, preserve the work and ask the owner. Do not substitute a model.
- Publish: one pull request per feature. Independent changes target `main`; use stacked PRs only for true dependencies, after CI runs for PRs targeting feature branches. The coordinator opens PRs after checks (and review, where required) pass; the owner merges. Workers never push. Planning-only commits (changes only under `spec/`) go straight to `main` from `limen/work` after `prettier --check spec` passes; any commit that touches another path needs a PR. Never push code to `main` directly.
- PR handoff: report a PR as ready to the owner only after its current head passes GitHub CI; fix failures before asking for a merge.

## TRACK

- Shell fidelity stretch: bring the Windoes shell close to Windows 98 SE, using our own art and an openly licensed font only. The shared 98 edge rules (F011) have landed; the chrome tickets reuse them.
- Wave: Shut Down backdrop (F017) and boot splash (F019) run in parallel; they touch different files. The pixel UI font (F013) waits on the owner's font choice.

## NOW

<!-- Generated from spec/features/active/ by limen land, limen ticket done and limen board --write. Edit the tickets, not these lines. -->

- `F019-the-boot-splash-fills-the-screen-with-a-scrolling-colour-band` (🟠 ACTIVE): The boot splash fills the screen with a scrolling colour band
- `F017-the-shut-down-dialog-dims-the-screen-and-uses-98-radio-buttons` (🟠 ACTIVE): The Shut Down dialog dims the screen and uses 98 radio buttons

## NEXT

Shell fidelity backlog from `spec/research/windoes-ui-fidelity/report.md`, ranked by visual gain per unit of work.

- `F013-ui-text-renders-in-a-crisp-8-pt-pixel-font` (PLANNED): one openly licensed pixel UI font; waits on owner approval of the font.

## PROVEN

<!-- Generated from spec/features/done/ by limen land, limen ticket done and limen board --write. Edit the tickets, not these lines. -->

- `F021-desktop-icons-can-be-moved` (🟢 PROVEN): Desktop icons can be moved; landed 2026-11-28
- `F020-message-boxes-use-our-own-98-style-icons-and-the-98-layout` (🟢 PROVEN): Message boxes use our own 98-style icons and the 98 layout; landed 2026-11-28
- `F018-the-blue-screen-is-laid-out-like-a-windows-9x-text-mode-screen` (🟢 PROVEN): The blue screen is laid out like a Windows 9x text-mode screen; landed 2026-11-28
- `F016-desktop-icons-behave-like-windows-98-desktop-icons` (🟢 PROVEN): Desktop icons behave like Windows 98 desktop icons; landed 2026-11-28
- `F015-the-start-menu-opens-like-the-windows-98-start-menu` (🟢 PROVEN): The Start menu opens like the Windows 98 Start menu; landed 2026-11-28
- `F014-menus-look-and-behave-like-windows-98-menus` (🟢 PROVEN): Menus look and behave like Windows 98 menus; landed 2026-11-28
- `F012-scrollbars-look-like-windows-98-scrollbars` (🟢 PROVEN): Scrollbars look like Windows 98 scrollbars; landed 2026-11-28
- `F011-every-raised-and-sunken-edge-uses-the-windows-98-bevel` (🟢 PROVEN): Every raised and sunken edge uses the Windows 98 bevel; landed 2026-11-28
- `F010-taskbar-buttons-show-windows-98-active-and-inactive-states` (🟢 PROVEN): Taskbar buttons show Windows 98 active and inactive states; landed 2026-11-28
- `F009-window-title-bars-and-frames-match-windows-98` (🟢 PROVEN): Window title bars and frames match Windows 98; landed 2026-11-28
- 2026-11: 18 landed. spec/features/done/2026-11/
