---
opened: 2026-11-22
landed: 2026-11-22
---

# F001 · CI blocks untested changes before merge and deploy

## Outcome

Today a pull request gets no test run, CI never runs lint, typecheck or a format check, and a push to `main` deploys to GitHub Pages without running any test. After this, every pull request and every deploy is gated by the same checks a developer runs locally, so a broken change cannot reach the live site unnoticed.

## Scope

- Start at `.github/workflows/test.yml`: run on `pull_request` to `main` as well as branch pushes.
- The test workflow runs `npm run lint`, `npm run typecheck`, `npx prettier --check .` and `npm run test:all`.
- `deploy.yml` deploys only after the same checks pass on that commit (reuse the test workflow, for example with `workflow_call`, rather than copying its steps).
- Fix the files that fail `prettier --check` today (`.omp/extensions/limen.ts`, `.pi/extensions/limen.ts`), or ignore them in `.prettierignore` if they are tool-owned.

## Out of scope

- Turning on new ESLint rules or widening `tsconfig.json`.
- Branch protection settings on GitHub (repository settings, not code).
- Changing what `test:all` runs.

## Acceptance

- `test.yml` triggers on `pull_request` targeting `main`.
- The test job runs lint, typecheck, `prettier --check .` and `test:all`, in that order.
- In `deploy.yml`, the deploy job depends on a passing test job.
- `npx prettier --check .` exits 0 on the branch.
- `actionlint` (or a YAML parse) reports no errors on both workflow files.
