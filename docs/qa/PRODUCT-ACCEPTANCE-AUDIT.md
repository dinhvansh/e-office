# Product Acceptance & Permission Audit

**Run date:** 2026-07-16 (Asia/Saigon)  
**Repository:** `D:\e-office-remediated-candidate`  
**Release/tag action:** none; `v0.1.0-alpha` was not tagged or released.

## Environment and dataset

The completed runtime evidence used clean ephemeral Docker Compose projects with PostgreSQL 16, Redis, the real backend, and the outbox worker. The S3 variant also used isolated MinIO. Each Docker E2E run created and removed its own database, volumes, and network. A separate persistent `eoffice-uat` PostgreSQL-backed backend/outbox stack was brought up successfully (`GET /health` returned `success: true, status: ok`) for browser verification.

The deterministic E2E dataset used `admin@acme.local`, an approval+signing workflow, a mapped document type, a generated PDF, signing field, and an internal signer. It is not a complete two-tenant/persona dataset from `01-UAT-TEST-DATA-SETUP.md`.

## Phase results

| Phase | Result | Verified evidence / limitation |
|---|---|---|
| Clean UAT environment | PASS | Fresh Compose databases/volumes for local and S3 runs. |
| Master Data | PARTIAL | Real UAT browser flows created numbered document `010/2026` from the accessible document-type list and completed Department, Position, External Organization, Document Type, and Tenant/Company lifecycles. Tenant onboarding creates isolated admins; the Settings UI persists company name/domain changes, rejects a duplicate name, and unauthenticated contexts redirect to login. A second tenant cannot see or fetch the first tenant's Department, External Organization, or Document Type in UI/API. External Organization mapping persists on a real draft external signer. Document Type default-workflow mapping persists, inactive types are excluded from the document-upload chooser, and inactive Department/Position records are excluded from User assignment dropdowns. Duplicate department/position/org codes and external-contact email are rejected; Department/Position disable/re-enable is verified. Deleting a Department with a referenced User is safely denied with `DEPARTMENT_HAS_USERS`; once the User is deleted, Department and Position delete cleanly. PostgreSQL confirms `departments.is_active` migration and document-type persistence. The authorization matrix passed Admin create/update for departments, positions, document types and external organizations, plus Viewer/User/Manager negative master-data checks including Viewer denial for tenant-profile update. Tenant disable/re-enable and its session behavior remain unverified. |
| Users / Roles / Permissions | PARTIAL | Admin real-browser lifecycles create a User with Department, Position, and Role assignments and create a custom Role; both persist through the API. Duplicate Role names are rejected and unused roles/users delete. Fresh PostgreSQL API matrix verifies Viewer can read role metadata but cannot create Roles; broader persona/role matrix remains unrun. |
| RBAC / ACL / Tenant Isolation | PARTIAL | Fresh PostgreSQL API matrix verified role denies and cross-tenant document denial; authenticated direct navigation, refresh, and same-session new-tab persistence are verified for the seeded Admin. Viewer direct URLs for Roles and Workflows render read-only UI with mutation controls absent, while their direct create APIs return 403. Full tampering matrix remains unverified. |
| Workflow Setup & document-type mapping | PARTIAL | Browser UAT Admin creates, reads back, and deletes a Workflow; Viewer direct `/workflows` access has no create control and direct API create returns 403. Document-type mapping runtime E2E passed; workflow-step assignee/reorder UI coverage remains unrun. |
| Request creation | PASS (runtime subset) | Package rollback, atomic document/sign-request creation, duplicate protection verified. |
| Approval | PASS (runtime subset) | UAT PostgreSQL runtime verifies submit → `AWAITING_APPROVAL`, assigned pending approval, exactly one accepted concurrent approval, one workflow-completion outbox event, and transition to signing. |
| Internal signing | PASS (runtime subset) | UAT runtime configures internal signer/field, forces an audit-write rollback to verify transactional safety, rejects duplicate concurrent signing without duplicate audit/outbox events, then completes the artifact path. |
| Sequential signing | PARTIAL | Backend regression suite (104/104) verifies order-two internal and public signers receive `SIGNING_ORDER_VIOLATION` before order one, same-order parallel behavior, and next-order activation. A real two-internal-signer browser/UAT flow remains unrun. |
| External signing | PARTIAL | Backend regression suite (104/104) verifies OTP/session lifecycle, minimal pre-OTP metadata, expiry/consumption denial, and public signing-order enforcement. Clean UAT Playwright now creates a real external signer, sends the request through Mailpit, opens the issued public link, extracts the delivered OTP, and verifies it in the browser. Final external signature and artifact completion remain unexecuted. |
| Workflow state machine | PARTIAL | Backend 104/104 verifies valid approval-only/artifact transitions and invalid terminal-state denial; UAT runtime traversed `AWAITING_APPROVAL` → `AWAITING_SIGNATURES` → `COMPLETED`. Full transition matrix remains unexecuted. |
| Artifact / completion | PASS (runtime subset) | Latest UAT PostgreSQL request is `completed` with a persisted signed artifact and hash; runtime downloaded the local artifact. MinIO source/artifact, delete behavior, and failure/retry policies are also verified. |
| Notification / Email / Webhook | PARTIAL | UAT PostgreSQL flow persisted approval-request, sign-request, and workflow-completed notifications plus processed approval/signature/artifact outbox events. Worker/outbox policy tests pass; no live email/webhook recipient or browser My Tasks check. |
| Permission escalation / negative tests | PARTIAL | Disabled account/session, field ownership, signing order, cross-tenant S3 document access, and admin-policy tests passed; full ID tampering matrix remains unverified. |
| Golden Path 1 | PARTIAL | Approval + internal signer + local artifact passed by real backend/PostgreSQL; browser requirement blocked. |
| Golden Path 2 | PARTIAL | Clean PostgreSQL flow verified `min_n=2` approval, internal signing, async worker artifact completion; two sequential internal signers remain unverified. |
| Golden Path 3 | PARTIAL | The UAT overlay provisions Mailpit; real backend SMTP delivery and the public browser OTP verification flow pass. The final external signature and artifact flow remain unexecuted. |
| Final gates | PARTIAL | All listed command gates passed except Playwright browser business-flow E2E was not run because no browser surface was available. |

## Commands and outcomes

| Gate | Outcome |
|---|---|
| `backend/npm test` | PASS — 102 tests after UAT regressions |
| `backend/npm run lint` | PASS |
| `backend/npm run build` | PASS |
| `frontend/npm run lint` | PASS |
| `frontend/npm run typecheck` | PASS |
| `frontend/npm run build` | PASS — warning: Next cache write ENOSPC; build still exited 0 |
| `npm run e2e:docker` | PASS — rerun after UAT fixes with real PostgreSQL/backend/outbox; final artifact downloaded |
| `npm run e2e:s3` | PASS — rerun after UAT fixes with real PostgreSQL/backend/outbox/MinIO; artifact object/hash and cross-tenant check verified |
| `e2e-workflow-assignee.js` (`min_n=2`) | PASS — clean PostgreSQL multi-approval, signing, and worker completion |
| Playwright business-flow E2E | BLOCKED — no browser surface available |

## Bugs and fixes

| Severity | Open | Fixed in this run |
|---|---:|---:|
| Critical | 0 open | 0 |
| High | 0 open | 0 |
| Medium | 1 acceptance blocker: browser surface unavailable | 5 |
| Low | 2 environment warnings: stale Browserslist data; build-cache ENOSPC warning | 0 |

Fixed UAT defects:

1. `BUG-UAT-001` — Docker image excluded the authorization-matrix executable. Fixed by retaining that script in the Docker build context.
2. `BUG-UAT-002` — The authorization matrix rewrote the in-container PostgreSQL host to localhost. Fixed by making that rewrite explicit local-only behavior.
3. `BUG-UAT-003` — Fresh RBAC seed omitted all `document_types:*` permissions, causing Admin document-type management to return 403. Fixed by seeding the four catalog permissions.
4. `BUG-UAT-004` — Email outbox deduplication raised repeated unique-constraint errors instead of making repeated delivery requests safe. Fixed by treating the dedupe unique-key conflict as a no-op.
5. `BUG-UAT-005` — Multi-approval E2E asserted synchronous completion while artifact generation is asynchronous. Fixed by polling for the terminal completed state.
6. `BUG-UAT-007` — Departments showed a status in the UI but did not have persisted status data or an enable/disable operation. Fixed with a PostgreSQL migration, authenticated status update endpoint support, and an accessible UI toggle; browser regression verifies the full lifecycle.
7. `BUG-UAT-008` — External Organizations accepted duplicate contact email addresses in the same tenant. Fixed with tenant-scoped create/update validation and a UAT regression covering create, duplicate-code/email rejection, update, and delete.
8. `BUG-UAT-009` — An unused numbered Document Type could not be deleted because its numbering rule remained as a foreign-key dependency. Fixed by deleting tenant-scoped numbering rules and the unused type atomically; Document Type lifecycle regression passes.
9. `BUG-UAT-010` — Inactive Departments and Positions could still be selected while assigning a user, allowing disabled master data to flow downstream. Fixed by filtering active records in User and Workflow assignment selectors; browser UAT regression verifies the User form.
10. `BUG-UAT-011` — The Tenant/Company Settings UI sent `PUT /tenants/me`, but the backend exposed no such route, so every edit failed with 404. Fixed with tenant-scoped `settings:update` authorization, validated persisted profile updates, and duplicate name/domain rejection. Browser UAT verifies two isolated tenant admins, onboarding, edit/read-back, duplicate rejection, foreign-Department UI/API denial, and isolated-session redirect; the authorization matrix verifies Viewer denial.
11. `BUG-UAT-012` — A Viewer with read-only Role access could open `/roles` and see create/edit/delete permission controls. The API correctly returned 403, but the UI implied unavailable administrative actions. Fixed by gating Role mutation controls on `roles:create`, `roles:update`, and `roles:delete`; real Viewer direct-URL/UI/API regression passes.
12. `BUG-UAT-013` — A Viewer could directly open `/workflows` and see the create-workflow control although `POST /workflows` returned 403. Fixed by gating Workflow creation controls on `workflows:create`; Admin lifecycle and Viewer direct-URL/API regression pass.

Regression coverage: four checks in `backend/tests/dockerE2eScripts.policy.test.ts` and the duplicate-email outbox test; backend suite passed 103/103. The clean PostgreSQL authorization matrix, full local/S3 Docker business flows, and multi-approval artifact flow were rerun successfully. Fix commits: `e7ebf22` (`fix(uat): run authorization matrix in clean Docker stack`) and `9c68b12` (`fix(outbox): make duplicate email enqueues idempotent`).

## Permission and tenant-isolation results

Verified: disabled/inactive user and tenant rejection, refresh-token rotation/revocation, assigned approval scoping, field ownership denial, sequential signer denial, minimal pre-OTP metadata, expired/consumed session denial, and S3 E2E cross-tenant document denial.

Unverified: all matrix cells through UI, direct URL, and direct API; all required ID/tenant/owner/workflow/request/signer/field/artifact tampering; complete two-tenant persona dataset; ACL precedence/removal; external revoke and expiry in browser.

### Auth-session direct-route regression â€” PASS (2026-07-16)

Clean Docker UAT verified that the seeded Admin session is synchronously durable before the login redirect. `frontend/tests/auth-session-persistence.spec.ts` passed three sequential runs covering login and immediate redirect, direct `/documents` navigation, browser refresh, a same-browser new tab, and an isolated browser context (which correctly redirects to login). The prior direct-URL session-loss regression is closed.

### Document UI smoke authentication â€” PASS (2026-07-16)

`frontend/tests/ui-simple.spec.ts` now reads the seeded UAT account from `PLAYWRIGHT_EMAIL` and `PLAYWRIGHT_PASSWORD` rather than an obsolete hard-coded password. It passes with the real clean-stack Admin, alongside the direct-route persistence and master-data UI regressions.

### External signer OTP browser regression — PASS (2026-07-16)

`frontend/tests/e2e.spec.ts` now covers the current real UAT path: API creates and sends an external signing request, Mailpit receives the one-time code, and Chromium opens the issued public link and verifies that code. This confirms token generation at request dispatch and public OTP/session hydration; signing submission and completed-artifact verification remain separate outstanding coverage.

### Startup configuration fallback â€” PASS (2026-07-16)

The configured UAT stack renders its normal login and protected-route flows. In a separate server process with API URL variables removed, UX-011 verifies that both `/login` and `/settings/system` render the accessible safe-unavailable guard without exposing configuration details. The isolated server now explicitly uses webpack, matching the application's Next configuration.

## Remaining product debt / blockers

1. Restore an available browser surface and execute screenshot-backed Playwright/business-path checks against the live UAT stack.
2. Complete Golden Paths 2 and 3 on clean deterministic tenant data, including two sequential internal signers and the external signature/artifact terminal path.
3. Complete `03-PERMISSION-MATRIX.md` at UI, URL, and API layers, including all tampering tests.
4. Execute complete master-data CRUD, notification/email/webhook delivery, and state-machine transition matrices.
5. Resolve the frontend build-cache disk-space warning before CI/release hardening.
6. Replace or modernize the stale `test-external-sign-direct.js` harness before it can be used as clean UAT evidence; it currently hard-codes obsolete credentials, IDs, public API shape, and direct database mutations.

## Additional UAT rerun (2026-07-16)

`BUG-UAT-006` (Medium) was reproduced on a clean Docker UI/backend stack: the frontend was built with its production-default API endpoint (`:4000`) while the E2E backend is exposed at `:4010`, so browser login showed `Failed to fetch`. `.env.test.example` now explicitly aligns the frontend API values, UI port (`3010`), and CORS origin. A static regression check was added to `backend/tests/dockerE2eScripts.policy.test.ts`.

After the fix, the clean-stack Playwright smoke passed 2/2: UI login reaches the dashboard and API upload creates a sign request. The backend suite passed 104/104. This is automated browser coverage only; it does not satisfy the outstanding in-app interactive browser verification or the full business-flow suite.

## Browser automation rerun (2026-07-16)

Playwright CLI 1.61.1 and its pinned Chromium v1228 are available and launch successfully. A clean Docker UAT stack was executed through `http://127.0.0.1:3010` with the real PostgreSQL backend at `http://127.0.0.1:4010`. The clean-stack smoke passed: UI login/dashboard plus API upload-to-sign-request (2/2).

The full legacy frontend suite ran with Chromium (47 tests): 16 passed and 31 failed. The failures are evidence that this gate is not yet acceptable for release. Reproduced harness problems include concurrent login rate limiting against one seeded account (HTTP 429), stale password/port assumptions, and UI suites that assert obsolete native `<select>` controls or mock response contracts rather than current UI behavior. The dedicated E2E environment now uses 127.0.0.1 endpoints and bypasses login throttling only for deterministic E2E seed accounts. `SelectWithIcon` now exposes listbox/option accessibility semantics. The remaining legacy UAT suites must be converted to current real-data flows before they can prove the required Golden Paths.

## Release recommendation

**NOT READY.** Required acceptance phases and two Golden Paths are incomplete. The strict READY criteria have not been met, even though no Critical or High product bug was reproduced in the executed coverage.

## Diagram handoff status

The requested Mermaid drafts and handoff documents are created as **provisional, partially verified** artifacts. They must be updated after the outstanding browser, permission-matrix, state-machine, and Golden Path work is complete.

**NOT READY — BUSINESS FLOW STILL UNSTABLE**
