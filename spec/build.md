# Build

> Coordinator-maintained narrative board. TRACK, NEXT, PARKED and DROPPED are coordinator prose: keep them true in the change that moves feature state. NOW and PROVEN are generated from the feature lanes by `limen land`, `limen ticket done` and `limen board --write`; edit the tickets, not those lines.

TRACK at most three bullets. NEXT one clause per ticket. PROVEN names the last ten landed features, then one count line per month.

Status marks are prose only: 🟠 ACTIVE · 🔴 PLANNED · 🟢 PROVEN · ⚪ DROPPED. Nothing in `limen` treats them as workflow state.

## POLICY

- Models: every role (worker, review, GitHub doorbell review, keeper, scout, quality, picture, research, judge) runs `--engine omp --provider anthropic --model claude-opus-5-5 --thinking high`. This seat has only an Anthropic login; never use the package default `openai-codex/gpt-6-astra` or another provider.
- Quota: if the Anthropic model cannot run, preserve the work and ask the owner. Do not substitute a model.
- Publish: one pull request per feature, from the job's branch rebased on `origin/main`. The coordinator opens it after checks (and review, where required) pass; the owner merges. Workers never push. Planning-only commits (board, tickets, outcomes) go from `limen/work` in their own small PR. Never push to `main` directly (a push to `main` deploys GitHub Pages).

## TRACK

- Code-quality fixes from the issue #127 analysis: gate CI and deploy, then close the app sandbox holes. Changes must keep every app suite in `test:all` green.
- F003 starts as a survey (`notes.md`, no code); its code change also closes the same-origin bypass of the Paint path grants.

## NOW

<!-- Generated from spec/features/active/ by limen land, limen ticket done and limen board --write. Edit the tickets, not these lines. -->

- `F003-embedded-apps-run-in-a-real-sandbox` (🟠 ACTIVE): Embedded apps run in a real sandbox

## NEXT

- `F004-app-code-is-covered-by-lint-and-type-checks` (PLANNED): moves inline app scripts into checked modules; waits for F003's sandbox design.

## PROVEN

<!-- Generated from spec/features/done/ by limen land, limen ticket done and limen board --write. Edit the tickets, not these lines. -->

- `F002-paint-reads-and-writes-only-files-the-user-picked` (🟢 PROVEN): Paint reads and writes only files the user picked; landed 2026-11-22
- `F001-ci-blocks-untested-changes-before-merge-and-deploy` (🟢 PROVEN): CI blocks untested changes before merge and deploy; landed 2026-11-22
- 2026-11: 2 landed. spec/features/done/2026-11/
