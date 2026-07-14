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

### PostgreSQL workflow E2E (local and CI)

The workflow E2E command is `npm run e2e:workflow`. It needs a running backend,
PostgreSQL, Redis, and the synthetic seeded admin account. For the Docker stack,
start the services with fake local-only values, then run the command from the
host:

```bash
export POSTGRES_PASSWORD=eoffice-local-test-password
export JWT_SECRET=local-only-jwt-secret-with-at-least-thirty-two-characters
export REFRESH_TOKEN_SECRET=local-only-refresh-secret-with-at-least-thirty-two-characters
export LICENSE_SIGNING_SECRET=local-only-license-secret-with-at-least-thirty-two-characters
export DEMO_ADMIN_PASSWORD=local-only-demo-password-not-for-production
export E2E_ADMIN_PASSWORD=local-only-demo-password-not-for-production
export DATABASE_URL=postgresql://eoffice:eoffice-local-test-password@db:5432/eoffice_db
docker compose up -d --build
docker compose exec backend npx prisma migrate deploy
docker compose exec backend node scripts/seed.js
docker compose exec backend node scripts/seed-rbac.js
docker compose exec backend node scripts/seed-document-types.js
docker compose exec backend node scripts/seed-workflows-simple.js
docker compose exec backend node scripts/e2e-workflow-refactor.js
```

GitHub Actions runs the equivalent command in
`.github/workflows/e2e-postgres.yml`. It starts PostgreSQL 16 and Redis 7 as
service containers, runs `prisma migrate deploy`, seeds the existing synthetic
baseline (`seed.js`, RBAC, document types, and workflows), starts the backend,
then runs `npm run test:e2e:workflow`. The job installs Noto fonts because
signed-artifact generation
requires Unicode font files. CI uses only fixed fake test credentials; do not
supply production SMTP, JWT, database, or license secrets.

The E2E script reads `DATABASE_URL`, `REDIS_URL`, `E2E_API_BASE`,
`E2E_PUBLIC_BASE`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, and
`E2E_INTERNAL_SIGNER_EMAIL`. The documented defaults are suitable for the
synthetic local/CI seed. When running a host-side script against Compose, set
`E2E_USE_LOCAL_DB=1` to translate the Compose `@db:` hostname to `@localhost:`.

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
- `prisma migrate deploy` fails: use a new disposable PostgreSQL database and
  check the migration history; do not use production data for this workflow.
- CI backend health timeout: inspect the `eoffice-backend.log` printed by the
  failing workflow, then verify the fake `DATABASE_URL`, `JWT_SECRET`, and
  `REFRESH_TOKEN_SECRET` are present.
- CI E2E login fails: confirm the baseline seed steps ran in order and retain
  `admin@acme.local` / `secret123` only as synthetic CI fixture credentials.
