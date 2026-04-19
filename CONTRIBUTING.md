# Contributing to Windoes

Thanks for contributing.

## Prerequisites

- Node.js 18+
- npm

## Setup

```bash
npm ci
```

The root workspace install also covers embedded apps under `windoes/public/applications/*`.

## Local development

```bash
npm run dev
```

## Validation before PR

Run the full gate:

```bash
npm run test:all
```

This runs:

- `npm run typecheck`
- `npm test` (lint + unit + integration)
- `npm run test:apps` (embedded app suites)

## Branching and commits

- Branch from `main`
- Keep commits small and reviewable
- Use clear conventional commit messages (`feat:`, `fix:`, `refactor:`, `docs:`)

## Scope guardrails

- Main shell source: `windoes/`
- Embedded apps: `windoes/public/applications/*`

Unless the task explicitly calls for embedded app changes, keep work scoped to shell code.

## Pull requests

Please include:

- What changed
- Why it changed
- Validation evidence (commands and pass/fail)
