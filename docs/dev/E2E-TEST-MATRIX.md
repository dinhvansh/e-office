# E2E Test Matrix

This matrix lists the current product-grade smoke and regression tests. Run these after backend, frontend, database, and Redis are up.

## 1. Environment

Default local URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- API base: `http://localhost:4000/api/v1`

Docker startup:

```bash
docker compose up -d --build
```

Useful health checks:

```bash
docker compose ps
curl http://localhost:4000/health
```

## 2. Test Commands

| Area | Command | Expected Result |
|---|---|---|
| Backend build | `cd backend && npm run build` | TypeScript build passes |
| Authorization matrix | `npm run e2e:auth` | RBAC and tenant isolation cases pass |
| Workflow E2E | `npm run e2e:workflow` | Draft -> approval -> signing -> completed passes |
| UI login smoke | `PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run e2e:ui:smoke` | Login and documents page render |
| API upload smoke | `PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_API_BASE_URL=http://localhost:4000/api/v1 PLAYWRIGHT_EMAIL=admin@acme.local PLAYWRIGHT_PASSWORD=secret123 npm run e2e:api:smoke` | API upload and sign request creation pass |
| Core smoke | `npm run e2e:smoke` | Auth matrix and workflow E2E pass |

PowerShell equivalent for UI/API smoke:

```powershell
$env:PLAYWRIGHT_BASE_URL='http://localhost:3000'
npm run e2e:ui:smoke

$env:PLAYWRIGHT_BASE_URL='http://localhost:3000'
$env:PLAYWRIGHT_API_BASE_URL='http://localhost:4000/api/v1'
$env:PLAYWRIGHT_EMAIL='admin@acme.local'
$env:PLAYWRIGHT_PASSWORD='secret123'
npm run e2e:api:smoke
```

## 3. Authorization Matrix Coverage

Script: `backend/scripts/test-authorization-matrix.js`

Covered items:

- Admin can create administrative records.
- Viewer cannot create documents.
- Manager can create documents.
- User can create documents.
- Viewer can read allowed document list.
- Cross-tenant user cannot access another tenant document.
- Update/delete checks are tenant-scoped and permission-gated.

## 4. Workflow Coverage

Script: `backend/scripts/e2e-workflow-refactor.js`

Covered items:

- Login with seeded admin.
- Create deterministic approval workflow and document type.
- Create document draft.
- Create or attach sign request.
- Configure signer and signature field.
- Submit request.
- Verify `AWAITING_APPROVAL`.
- Approve document.
- Verify `AWAITING_SIGNATURES`.
- Complete internal signing.
- Verify `COMPLETED`.
- Download signed artifact.
- Verify audit logs exist.

## 5. Manual Product Walkthrough

Run after automated smoke passes:

1. Login as admin.
2. Open Documents and Sign Requests.
3. Create a document.
4. Open editor and add a signer.
5. Add a signature field.
6. Submit.
7. Approve if required.
8. Sign.
9. Download signed document.
10. Review audit logs.

## 6. Failure Triage

- `ECONNREFUSED`: backend is not running or port mapping is wrong.
- Login fails: seed data missing or admin password changed.
- Prisma connection error: check `DATABASE_URL`.
- Workflow stuck in approval: verify workflow step approver exists and has active user status.
- Signing fails: verify signer assignment, field assignment, and request `flow_state`.
