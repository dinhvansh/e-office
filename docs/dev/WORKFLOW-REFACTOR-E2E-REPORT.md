# E2E Test Report - Workflow Refactor

Date: 2026-05-16
Environment: Docker Compose local
Frontend: http://localhost:3000
Backend API: http://localhost:4000/api/v1

## Latest Verification - 2026-05-17
Environment: Docker Compose local

1. Backend build
- Command: `cd backend && npm run build`
- Result: PASS

2. Frontend build
- Command: `cd frontend && npm run build`
- Result: PASS

3. Authorization matrix regression
- Command: `npm run e2e:auth`
- Result: PASS
- Verified 14 cases, including cross-tenant document deny.

4. Full workflow refactor E2E
- Command: `npm run e2e:workflow`
- Result: PASS
- Verified:
  - Login as seeded admin
  - Create document draft
  - Configure signer and signature field
  - Submit -> `AWAITING_APPROVAL`
  - Approve -> `AWAITING_SIGNATURES`
  - Internal signing -> `COMPLETED`
  - Signed artifact download success
  - Audit logs recorded

5. Playwright UI smoke
- Command: `PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run e2e:ui:smoke`
- Result: PASS
- Verified login and Documents page render.

6. Playwright API smoke
- Command: `PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_API_BASE_URL=http://localhost:4000/api/v1 PLAYWRIGHT_EMAIL=admin@acme.local PLAYWRIGHT_PASSWORD=secret123 npm run e2e:api:smoke`
- Result: PASS
- Verified document upload API and sign request creation API.

## Executed Tests
1. Playwright UI smoke
- Command: `PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e -- tests/ui-simple.spec.ts`
- Result: PASS (1/1)
- Verified:
  - Login succeeds with seeded admin account
  - Documents page renders
  - Main UI blocks load without crash

2. Playwright API smoke
- Command: `PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_API_BASE_URL=http://localhost:4000/api/v1 PLAYWRIGHT_EMAIL=admin@acme.local PLAYWRIGHT_PASSWORD=secret123 npm run test:e2e -- tests/e2e.spec.ts --grep "API can upload a document and create sign request"`
- Result: PASS (1/1)
- Verified:
  - Auth token issuance
  - Document upload API
  - Create sign request API

3. Backend flow-state contract E2E (custom runtime script)
- Result: PASS
- Verified output:
  - `status: pending`
  - `flow_state: AWAITING_SIGNATURES`
  - `next_action: WAIT_FOR_SIGNING`
  - `flow_counters` present and populated

4. Authorization matrix regression
- Command: `cd backend && npm run test:auth-matrix`
- Result: PASS
- Verified:
  - Admin can create department
  - Viewer cannot create document
  - Manager can create document
  - User can create document
  - Viewer can read documents list

5. Full workflow refactor E2E
- Command: `cd backend && npm run test:e2e:workflow`
- Result: PASS
- Verified:
  - Create draft document
  - Configure signer and signature field
  - Submit -> `AWAITING_APPROVAL`
  - Approve -> `AWAITING_SIGNATURES`
  - Internal signer signs -> `COMPLETED`
  - Signed artifact download success
  - Audit logs recorded

## Notes
- Playwright config has been updated to avoid hard dependency on system Chrome channel.
- Root CI-friendly commands added:
  - `npm run ci:build`
  - `npm run ci:smoke:e2e`
