# Outcome

Pull requests to `main` now run lint, typecheck, `prettier --check .` and `test:all`, and `deploy.yml` deploys only after that same test workflow passes (via `workflow_call`). Deploy permissions moved to the deploy job only. Limen's own loader files are in `.prettierignore`. Landed in `7f25934`. The worker printed passing lint, typecheck, prettier and actionlint runs but kept no logs; the first real pull request run is the proof.
