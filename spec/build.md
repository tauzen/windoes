# Build

> Coordinator-maintained narrative board. TRACK, NEXT, PARKED and DROPPED are coordinator prose: keep them true in the change that moves feature state. NOW and PROVEN are generated from the feature lanes by `limen land`, `limen ticket done` and `limen board --write`; edit the tickets, not those lines.

TRACK at most three bullets. NEXT one clause per ticket. PROVEN names the last ten landed features, then one count line per month.

Status marks are prose only: 🟠 ACTIVE · 🔴 PLANNED · 🟢 PROVEN · ⚪ DROPPED. Nothing in `limen` treats them as workflow state.

## POLICY

- Models: every role (worker, review, GitHub doorbell review, keeper, scout, quality, picture, research, judge) runs `--engine omp --provider anthropic --model claude-opus-5-5 --thinking high`. This seat has only an Anthropic login; never use the package default `openai-codex/gpt-6-astra` or another provider.
- Quota: if the Anthropic model cannot run, preserve the work and ask the owner. Do not substitute a model.
- Publish: one pull request per feature, from the job's branch rebased on `origin/main`. The coordinator opens it after checks (and review, where required) pass; the owner merges. Workers never push. Planning-only commits (changes only under `spec/`) go straight to `main` from `limen/work` after `prettier --check spec` passes; any commit that touches another path needs a PR. Never push code to `main` directly (a push to `main` deploys GitHub Pages).

## TRACK

- The code-quality stretch (F001–F004) and the classic-skin Winamp redesign (F005) are complete. Next direction waits on the owner; `spec/vision.md` is still empty.

## NOW

<!-- Generated from spec/features/active/ by limen land, limen ticket done and limen board --write. Edit the tickets, not these lines. -->

- `F007-winamp-title-bar-buttons-work-inside-the-shell` (🟠 ACTIVE): Winamp title-bar buttons work inside the shell
- `F006-winamp-keeps-the-eq-preamp-boost-when-the-volume-changes` (🟠 ACTIVE): Winamp keeps the EQ preamp boost when the volume changes

## NEXT

- `F008-taskbar-buttons-have-a-right-click-menu-with-close` (PLANNED): Windows 98 taskbar menu; closes a Winamp window whose page failed to load (F007 review finding). Merge with the UI fidelity backlog.

## PROVEN

<!-- Generated from spec/features/done/ by limen land, limen ticket done and limen board --write. Edit the tickets, not these lines. -->

- `F005-winamp-matches-the-classic-2-x-skin-pixel-for-pixel` (🟢 PROVEN): Winamp matches the classic 2.x skin pixel for pixel; landed 2026-11-27
- `F004-app-code-is-covered-by-lint-and-type-checks` (🟢 PROVEN): App code is covered by lint and type checks; landed 2026-11-23
- `F003-embedded-apps-run-in-a-real-sandbox` (🟢 PROVEN): Embedded apps run in a real sandbox; landed 2026-11-22
- `F002-paint-reads-and-writes-only-files-the-user-picked` (🟢 PROVEN): Paint reads and writes only files the user picked; landed 2026-11-22
- `F001-ci-blocks-untested-changes-before-merge-and-deploy` (🟢 PROVEN): CI blocks untested changes before merge and deploy; landed 2026-11-22
- 2026-11: 5 landed. spec/features/done/2026-11/
