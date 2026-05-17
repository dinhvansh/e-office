# Project Cleanup Notes

This repo contains production code plus many historical debug scripts and session documents. Cleanup should preserve useful recovery tools while preventing generated artifacts from being committed.

## 1. Kept Intentionally

- `backend/scripts/seed*.js`: database setup and demo data.
- `backend/scripts/test-authorization-matrix.js`: official authorization regression.
- `backend/scripts/e2e-workflow-refactor.js`: official workflow E2E.
- Historical debug scripts under `backend/scripts`: kept for now because several target specific production-like records and can be useful during manual recovery.
- `docs/dev/*`: kept as implementation history and technical handoff material.

## 2. Removed or Ignored

- `frontend/test-results/`: Playwright runtime output.
- `frontend/playwright-report/`: generated HTML report.
- `frontend/blob-report/`: generated Playwright blob report.

These outputs should be regenerated locally or in CI, not stored as source.

## 3. Official Commands

Use root scripts for repeatable checks:

```bash
npm run ci:build
npm run e2e:auth
npm run e2e:workflow
npm run e2e:smoke
```

Use frontend scripts when browser UI verification is needed:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run e2e:ui:smoke
```

## 4. Future Cleanup Candidates

Before deleting old scripts, classify each file into one of these buckets:

- Seed/setup script.
- One-time migration or repair script.
- Debug query script.
- Official regression test.
- Obsolete duplicate.

Only remove a script after confirming it is not referenced by docs, README, CI, Docker init, deployment scripts, or support runbooks.
