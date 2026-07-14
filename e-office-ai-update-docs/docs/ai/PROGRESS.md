# Verification Progress

## 2026-07-14 — P2-OPS-019 file storage abstraction

Status: Completed and validated. A stream-based `FileStorage` now backs original-document, attachment, public-download, generated-artifact, and outbox-worker operations.

Files changed: local and S3-compatible storage adapters, runtime driver factory, document/public/PDF/worker reads, safe upload-key generation, Compose/environment examples, [storage operations documentation](../../../docs/operations/file-storage.md), regression tests, and this progress record.

Compatibility and security: new database values are portable `storage/<tenant>/<random-safe-name>` keys; existing relative values retain local-volume compatibility. Keys reject traversal, absolute paths, empty segments, and unsafe names. APIs continue not to expose storage keys or paths. Local deletion is idempotent; cleanup is best-effort.

Configuration: `FILE_STORAGE_DRIVER=local|s3` (default `local`). S3 requires `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and optional `S3_FORCE_PATH_STYLE`; invalid drivers and incomplete S3 config fail startup. Default Docker Compose does not require S3.

Migration impact: none. Tests: local put/get/exists/delete, traversal/missing-file/duplicate-delete behavior, S3 command delegation, invalid-driver validation, public download, and artifact worker. `backend npm test` passed 79/79; backend lint/build and frontend build/typecheck/lint passed (existing frontend warnings only). Docker Compose config and backend/worker image builds passed. A clean Docker PostgreSQL workflow E2E with the outbox worker passed: migration/seed, signing, artifact download (826126 bytes), audit events, and refresh rotation. Live MinIO coverage and normalization of legacy absolute paths remain future follow-up work.

## 2026-07-14 — P1-PERF-016 document permission pagination and N+1 queries

Status: Completed and validated. Document authorization now runs against the
complete tenant-scoped, filtered candidate set before pagination is applied.
The response total and page count therefore describe only records the caller
may view.

Files changed:

- `backend/src/modules/documents/documents.service.ts`
- `backend/src/modules/documents/documentQueries.service.ts`
- `backend/src/modules/documents/documentAccessPagination.ts`
- `backend/tests/documentAccessPagination.policy.test.ts`
- `backend/tests/documentQueries.pagination.test.ts`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Query strategy: the previous paginated path fetched one database page and its
unfiltered count, then called the authorization service once for every item on
that page. The new path loads the tenant-scoped candidates once and uses the
existing batch resolver for user, document-type-policy, approval, signer, CC,
and ACL data. Explicit denies are still evaluated by the same resolver after
allows, and owner/workflow/ACL rules remain unchanged.

Query-count measurement: the old path grows linearly with the number of
documents evaluated because every document invokes the full authorization
resolver. The new paginated path has three query-service boundaries (module
permission, candidate query, batch resolve) for 10, 50, and 100 candidates.
The batch resolver performs a fixed user lookup plus up to five batched
lookups, so its database-query shape is bounded rather than per-document.

Tests added: mixed visibility with owner/workflow/ACL allow and explicit deny;
post-filter totals and page sizes; tenant predicate enforcement; non-paginated
batch authorization; and bounded 10/50/100-candidate query-service calls.

Commands run:

- `cd backend && npm test` — passed, 75/75.
- `cd backend && npm run lint` — passed.
- `cd backend && npm run build` — passed.
- `cd frontend && npm run build`, `npm run typecheck`, and `npm run lint` —
  passed; existing warnings only.
- Isolated Docker PostgreSQL E2E — passed after `prisma migrate deploy` and
  idempotent fixtures: package creation, approval, duplicate-operation
  protection, signing, artifact download, audit events, and refresh rotation.

Known limitations: without a materialized access index this implementation
loads all tenant-scoped filtered candidates before applying access predicates.
It fixes correctness and removes N+1 queries, but very large tenants should be
profiled before adding a future `document_access_index` or SQL-level access
scope.

## 2026-07-14 — P1-PDF-015 Vietnamese Unicode PDF rendering

Status: Completed and validated. Audit-page transliteration was removed and the
runtime Noto path was corrected to the Debian image layout.

Files changed: signed-PDF generator, Unicode generation/failure tests, font
documentation, and this progress entry.

Font: Noto Sans Regular/Bold from Debian `fonts-noto-core`, embedded via
`pdf-lib` and `fontkit`; Noto Sans is licensed under SIL OFL 1.1. No font files
are committed to the repository.

Commands run:

- `cd backend && npm test` — passed, 71/71.
- `cd backend && npm run lint` and `npm run build` — passed.
- `cd frontend && npm run build`, `npm run typecheck`, and `npm run lint` —
  passed; existing lint warnings only.
- `docker compose build backend outbox-worker` — passed.
- Isolated Docker PostgreSQL E2E with outbox worker — passed.
- Docker Noto fixture with all required Vietnamese strings — generated,
  readable by `pdf-lib`, one page, 277,170 bytes.

Known limitation: Watermark configuration still uses the legacy StandardFonts
selector; use image watermarks or ASCII text until that configurable subsystem
is migrated to Unicode fonts in a dedicated task.

## 2026-07-14 — P1-AUTH-011 refresh-session rotation

Status: Completed. Server-side sessions, SHA-256 refresh-token hashes,
single-use rotation, logout revocation, and user/tenant status revocation were
already implemented. This change closes the remaining cookie-boundary gap:
refresh tokens are now emitted only as HttpOnly cookies and never in JSON.

Files changed:

- `backend/src/modules/auth/auth.controller.ts`
- `backend/tests/auth.controller.test.ts`
- `backend/tests/auth.refresh-session.test.ts`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Tests added: cookie-only login/refresh response; persisted rotation and old-token
reuse rejection; logout revocation; expired session rejection; malformed token
rejection. Existing status tests cover disabled-user session revocation and
inactive-tenant refresh rejection.

Commands run:

- `cd backend && npm test` — passed, 69/69.
- `cd backend && npm run lint` and `npm run build` — passed.
- `cd frontend && npm run build`, `npm run typecheck`, and `npm run lint` —
  passed; existing lint warnings only.

Known limitations: Session reuse is rejected at the individual rotated session;
there is no refresh-token family-wide compromise response because the current
schema has no family identifier.

## 2026-07-14 — P1-ARCH-010 phase 1 signed-artifact outbox

Status: Implemented and locally validated, including the isolated Docker
PostgreSQL workflow E2E with API and worker containers.

Files changed: Prisma artifact metadata migration/schema, signing commands,
outbox worker, Docker Compose worker service, worker tests, and
`docs/operations/outbox-worker.md`.

Workflow: `SIGNED_ARTIFACT_REQUESTED` is deduplicated per sign request. The
worker claims events, generates/verifies the PDF outside the transaction,
persists storage key/SHA-256/metadata, and transitions to completed. Failures
record `artifact_failed` and use bounded retry.

Commands run:

- `cd backend && npm test` — passed, 65/65.
- `cd backend && npm run lint` and `npm run build` — passed.
- `cd frontend && npm run lint`, `npm run typecheck`, and `npm run build` —
  passed (existing frontend warnings only).
- `docker compose config --quiet` with fake CI secrets — passed.
- `docker compose build backend outbox-worker` — passed.
- Blank isolated Docker PostgreSQL: `prisma migrate deploy`, `migrate status`,
  and `prisma migrate diff --exit-code` — passed; no schema drift.
- Isolated Docker PostgreSQL workflow E2E — passed: signing wrote one artifact
  event, the worker completed the artifact, and the signed PDF downloaded.

Known limitations: Current outbox polling is intentionally database-based and
single-event sequential per process; email and webhook delivery remain on their
existing event paths and were not migrated in this phase.

## 2026-07-14 — P1-OPS-014 Docker and environment hardening

Status: Implemented and verified; application quality gates, Compose
configuration, full Docker image build, and isolated PostgreSQL workflow E2E
pass without changing workflow business logic.

Files changed:

- `docker-compose.yml` and `docker-compose.dev.yml`
- application and license Dockerfiles
- Compose/backend/license environment examples
- backend runtime environment validation, readiness endpoint, graceful shutdown,
  demo seed, and workflow E2E script
- Docker/E2E documentation and the PostgreSQL E2E workflow fixture environment

Behavior changed:

- The default Compose stack runs only the open-source core; `license-server` is
  an optional `license` profile and license enforcement is disabled by default
  in that demo stack.
- PostgreSQL and Redis remain internal unless the explicit development override
  is included. Backend starts with `prisma migrate deploy`; demo seeds remain
  opt-in and require `DEMO_ADMIN_PASSWORD`.
- Production configuration rejects weak/missing JWT and refresh secrets,
  wildcard/missing CORS configuration, a missing application base URL, enabled
  incomplete SMTP, and rate-limit bypass accounts.
- Readiness checks now include PostgreSQL and Redis; backend handles SIGTERM and
  SIGINT by closing the HTTP server and persistence clients.

Security impact: Removes insecure Compose secret/password defaults, prevents a
default public demo password, eliminates default rate-limit bypass settings, and
keeps database/Redis ports off the host network by default.

Migration impact: None. The startup command uses the existing reviewed
`prisma migrate deploy` baseline. No reset or `db push` is run.

Commands run:

- `cd backend && npm test` — passed, 64/64.
- `cd backend && npm run lint` — passed.
- `cd backend && npm run build` — passed.
- `cd frontend && npm run lint` — passed with existing warnings only.
- `cd frontend && npm run typecheck` — passed.
- `cd frontend && npm run build` — passed with existing warnings only.
- `docker compose config --quiet` plus development and license profile variants
  with fake secrets — passed.
- local production environment validation with a secure configuration — passed;
  weak JWT and wildcard CORS configurations — rejected as expected.
- backend `docker compose build` — passed after switching Prisma runtime to
  Debian slim/OpenSSL; the full Compose build was started but exceeded the
  command time budget while frontend layers built.
- isolated Docker PostgreSQL startup — passed migration, idempotent seed,
  non-root storage write, service health, login, approval and signing setup.
- Docker PostgreSQL E2E — failed at the existing signing-concurrency assertion:
  expected exactly one successful signing request and one rejected duplicate.

Verification update: A subsequent full `docker compose build` passed for both
backend and frontend. A fresh isolated Docker PostgreSQL E2E also passed,
including duplicate approval/signing, rollback, artifact generation, and
refresh-token revocation checks. The earlier failed E2E result was caused by a
missing Debian Noto font path; Compose now supplies that path explicitly.

Known limitations: Legacy one-off development scripts outside the Compose/CI
startup path still contain historical fixture passwords and are not part of the
public-beta bootstrap.

Next recommended issue: Audit and remove historical fixture credentials from
ad-hoc development scripts in a dedicated maintenance task.

## P0 Closure Plan (2026-07-13)

Scope: close only gaps identified in `docs/ai/P0-REVIEW.md`; do not perform
P1/P2 work or unrelated refactors. The worktree is already heavily dirty, so
new changes will be limited to P0 modules, their tests, and P0 documentation.

1. P0-SEC-007: reduce public-signing metadata to the authenticated signer,
   prove invitation/session/reuse behavior with direct tests.
2. P0-SEC-001: revoke an identifiable refresh session when active-status checks
   reject refresh, with persistence-focused tests.
3. P0-SEC-002: add transaction-boundary ownership/rollback tests without
   changing the existing predicate unless a test proves a defect.
4. P0-DATA-006: inject artifact failure and test recoverable state/retry.
5. P0-DATA-008: tighten/document package transaction and compensation evidence.
6. P0-DATA-004/P0-DOM-003: add direct signing order, rollback, and duplicate
   activation tests without broad service refactoring.

Initial task brief: P0 security/data-integrity closure. No schema change is
planned; migration impact is expected to be none. Each priority will run scoped
tests before progress/review status is updated.

## 2026-07-13 22:20 - P0-SEC-007 public metadata minimization

Status: Implemented and unit/build verified; direct HTTP regression remains to
be added before marking the whole acceptance set complete.

Files changed:

- `backend/src/modules/public/publicSign.controller.ts`
- `backend/src/modules/public/publicSigning.response.ts`
- `backend/tests/publicSigning.response.test.ts`
- `backend/tests/signingSession.service.test.ts`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed: The public signing-page response now exposes only the current
signer after OTP verification. It no longer queries/returns other signers,
activity entries with signer identities, or document storage paths. Before OTP,
the response remains limited to OTP-required state and minimal signer/request
metadata.

Security impact: Prevents an external signer from enumerating another signer's
name/email/status through the public signing page and avoids returning internal
storage metadata. Expired, malformed, signer-mismatched, and OTP-consumed
session tokens are rejected by the session validator.

Migration impact: None.

Tests added:

- pre-OTP metadata is minimal
- verified metadata has no signer list, activities, or `file_path`
- expired and OTP-consumed signing sessions are rejected

Commands run:

- targeted ESLint for public signing source/tests - passed
- `cd backend && npm test` - 47 passing
- `cd backend && npm run build` - passed

Result: The public response contract is minimized and its redaction is covered
by direct unit tests.

Known limitations: Existing unit tests validate session semantics; a controller
HTTP regression still needs to assert invitation-only document access is denied,
verified session access succeeds, and session reuse after signing is denied.

Next recommended priority: Complete the P0-SEC-007 HTTP assertions, then move
to P0-SEC-001 refresh-session revocation.

## 2026-07-13 22:28 - P0-SEC-001 inactive refresh-session revocation

Status: Implemented and unit/build verified.

Files changed:

- `backend/src/modules/auth/auth.service.ts`
- `backend/tests/auth.service-status.test.ts`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed: After authenticating a refresh-token payload and resolving its
user, an inactive user or tenant causes the matching active refresh-session row
to be revoked before the existing stable inactive-status error is returned. The
session ID, user ID and tenant ID are derived only from the verified token and
database identity.

Security impact: A disabled account or inactive tenant can no longer retain an
otherwise valid server-side refresh session until expiration. No new access or
refresh token is issued on this path.

Migration impact: None.

Tests added: Disabled-user and inactive-tenant refresh regressions now assert
the exact session revocation request in addition to the stable 403 error code.

Commands run:

- targeted ESLint for auth service/test - passed
- `cd backend && npm test` - 47 passing
- `cd backend && npm run build` - passed

Result: P0-SEC-001 revocation gap is covered at the service persistence-port
boundary. A route-level no-cookie/no-token HTTP regression remains desirable.

Known limitations: The default port uses Prisma in production; this slice does
not yet run a real PostgreSQL assertion for the revoked row.

Next recommended priority: P0-SEC-002 transaction-boundary field ownership

## 2026-07-13 22:36 - P0-SEC-002 transaction-boundary field ownership tests

Status: Implemented and verified with direct `SignRequestFieldValuesService` tests.

Files changed:

- `backend/tests/signRequestFieldValues.service.test.ts`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed: None. The production service already validates every requested
field before its first upsert; the new tests exercise that transaction-scoped
service behavior directly.

Security impact: Regression coverage now proves a signer cannot write another
signer's field or a field belonging to another request, and that a mixed
allowed/forbidden payload writes no field-value rows after `FIELD_ACCESS_DENIED`.

Migration impact: None.

Tests added:

- other-signer field denied with no write;
- other-sign-request field denied with no write;
- shared field in the same request accepted;
- mixed payload rejected before any upsert.

Commands run:

- `cd backend && npm test` — 51 passing;
- `cd backend && npx eslint --ext .ts tests/signRequestFieldValues.service.test.ts` — passed;
- `cd backend && npm run build` — passed.

Result: P0-SEC-002 acceptance criteria 1–5 have direct service-level coverage.

Known limitations: These are transaction-client integration tests using a
controlled Prisma transaction double; a database-backed HTTP test remains a
future hardening layer, not a P0 gap in the ownership implementation.

Next recommended priority: P0-DATA-006 artifact-generation failure handling.

## 2026-07-13 22:48 - P0-SEC-007 public PDF/session boundary completion

Status: Implemented and verified at the public controller boundary.

Files changed:

- `backend/src/modules/public/publicSign.controller.ts`
- `backend/src/modules/public/signingSession.service.ts`
- `backend/tests/publicSign.controller.test.ts`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed:

- expired signing-session JWTs now produce `SIGNING_SESSION_EXPIRED` rather
  than being indistinguishable from malformed or missing sessions;
- invalid OTP submission uses the stable `OTP_INVALID` code;
- original PDF access remains blocked without a bound OTP session and after
  signing is consumed.

Security impact: The invitation token alone cannot retrieve original document
bytes; tests prove session binding, expiry handling, and consumed-signature
protection. The earlier metadata DTO change continues to omit other signers'
emails and storage paths.

Migration impact: None.

Tests added:

- invitation token cannot fetch PDF before OTP;
- verified session can fetch PDF;
- expired session cannot fetch PDF and returns `SIGNING_SESSION_EXPIRED`;
- post-sign session cannot sign again;
- invalid OTP returns `OTP_INVALID`.

Commands run:

- `cd backend && npx eslint --ext .ts src/modules/public/signingSession.service.ts src/modules/public/publicSign.controller.ts tests/publicSign.controller.test.ts` — passed;
- `cd backend && npm test` — 56 passing;
- `cd backend && npm run build` — passed.

Result: P0-SEC-007 has direct controller and response-DTO evidence for all
required public-session and metadata cases.

Known limitations: Tests use controlled Prisma/storage doubles rather than a
full HTTP server backed by PostgreSQL; the production route uses the same
controller methods and session cookie parser.

Next recommended priority: P0-DATA-006 artifact-generation failure handling.

## 2026-07-13 23:02 - P0-DATA-006 artifact failure and retry tests

Status: Implemented and verified with injected PDF-generation failures.

Files changed:

- `backend/tests/artifactFailure.service.test.ts`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed: None. The tests characterize the existing production failure
handling and retry state transitions.

Security impact: None directly; protects workflow integrity by preventing a
failed artifact from being presented as a completed signed document.

Migration impact: None.

Tests added:

- injected signed-PDF failure stores `artifact_failed` for both document and
  sign request and never stores `completed`;
- an `artifact_failed` request can enter retry, emits its retry request event,
  and returns to `artifact_failed` with a retry-failure audit event if PDF
  generation fails again.

Commands run:

- `cd backend && npx eslint --ext .ts tests/artifactFailure.service.test.ts` — passed;
- `cd backend && npm test` — 58 passing;
- `cd backend && npm run build` — passed.

Result: P0-DATA-006 has direct failure-injection evidence for state consistency
and retryability.

Known limitations: The test doubles Prisma's transaction client; it proves the
service invokes the paired workflow transition but is not a PostgreSQL fault-
injection test.

Next recommended priority: P0-DATA-008 document-creation atomicity.

## 2026-07-13 23:19 - P0-DATA-008 document creation compensation boundary

Status: Implemented and verified.

Files changed:

- `backend/src/modules/documents/documents.service.ts`
- `backend/tests/documentCreation.atomicity.test.ts`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed: ACL snapshot/grant, draft workflow package, CC persistence
and attachment persistence now share a compensation boundary after document
creation. A failure removes the document/package records and the primary upload
(when server-created) plus any attachment files already created.

Security impact: Prevents partially provisioned documents from retaining ACL,
sign-request, signer, CC, or attachment records after a later creation failure.

Migration impact: None.

Tests added:

- workflow package failure compensates the document;
- ACL persistence failure compensates the document;
- CC persistence failure after package creation compensates the document package;
- signer creation failure rolls back the draft-package transaction.

Commands run:

- `cd backend && npx eslint --ext .ts src/modules/documents/documents.service.ts tests/documentCreation.atomicity.test.ts` — passed;
- `cd backend && npm test` — 62 passing;
- `cd backend && npm run build` — passed.

Result: P0-DATA-008 now has a minimal safe compensation improvement around
records that cannot share one database transaction with file storage, while the
draft package itself remains transactionally atomic.

Known limitations: File deletion is best-effort because object storage cannot
participate in PostgreSQL transactions. Failed cleanup is intentionally not
allowed to hide the original error; retryable storage reconciliation remains an
operational concern.

Next recommended priority: P0-DATA-004 and P0-DOM-003 command/API tests.

## 2026-07-13 23:42 - P0-DATA-004 and P0-DOM-003 command/API closure

Status: Implemented and verified by unit-command and PostgreSQL Docker E2E tests.

Files changed:

- `backend/src/modules/signRequests/signRequests.service.ts`
- `backend/scripts/e2e-workflow-refactor.js`
- `backend/tests/publicSigningCommand.order.test.ts`
- `backend/tests/signRequests.internalSigningOrder.test.ts`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed:

- internal sequential order violations now use `409 SIGNING_ORDER_VIOLATION`,
  matching the public signing path;
- internal `field_signatures` metadata is now written only inside the central
  signing transaction. A later audit/transaction failure no longer leaves
  `position_data` persisted.

Security impact: Prevents an out-of-order internal signer from bypassing the
consistent conflict API contract and prevents partial signature metadata after
a failed signing command.

Migration impact: None.

Tests added or strengthened:

- external order-two signer receives `SIGNING_ORDER_VIOLATION`;
- internal order-two signer receives `409 SIGNING_ORDER_VIOLATION`;
- runtime E2E forces an audit trigger failure and now asserts signer status,
  request status, audit/outbox rows, and `position_data` all roll back;
- runtime E2E submits duplicate signing requests concurrently and asserts one
  success, one `409`, and exactly one signature audit/outbox effect.

Commands run:

- `cd backend && npx eslint --ext .ts tests/signRequests.internalSigningOrder.test.ts` — passed;
- `cd backend && npm test` — 64 passing;
- `cd backend && npm run build` — passed;
- Docker: copied current build/script, restarted `eoffice-backend`, then
  `docker exec eoffice-backend node scripts/e2e-workflow-refactor.js` — passed.

Result: The command/API acceptance criteria for sequential ordering,
concurrency, and signing-transaction rollback have direct current evidence.

Known limitations: The repository's legacy `signRequests.service.ts` still has
pre-existing global lint findings, so only the new targeted test file was linted;
typecheck, full test suite and build remain green.

Next recommended priority: final P0 evidence review and documentation update.

## 2026-07-13 23:55 - P0 closure validation complete

Status: All P0 items in `P0-REVIEW.md` are marked Done by the current closure
verification update.

Files changed:

- `e-office-ai-update-docs/docs/ai/P0-REVIEW.md`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`
- P0 source/tests listed in the priority records above.

Behavior changed: No additional behavior beyond the completed P0 changes.

Security impact: Public document access, inactive refresh-session revocation,
field ownership and signing atomicity now have direct regression/runtime
evidence.

Migration impact: None. No schema or migration was added by this closure work.

Commands run:

- `cd backend && npm test` — 64 passing;
- `cd backend && npm run build` — passed;
- `cd backend && npm run lint` — failed with 157 pre-existing global lint
  findings outside this P0 scope; targeted lint for new tests and modified
  document service passed;
- Docker PostgreSQL E2E workflow script — passed after restart with the current
  compiled auth/signing services.

Result: P0 closure is complete. No commit was created because the worktree
contains substantial unrelated pre-existing P1/P2 changes.

Known limitations: Global lint debt and best-effort object-storage compensation
remain non-P0 operational risks. The Docker E2E is not yet CI-run.

Next recommended priority: Address the separately tracked repository-wide lint
debt or add the Docker E2E to CI; do not mix either task into this P0 closure.
integration coverage.

## 2026-07-13 20:26 — P0-SEC-001

Status: Verified in the current backend source.

Files changed:

- `backend/src/modules/auth/auth.service.ts`
- `backend/tests/auth.service-status.test.ts`

Behavior changed: `AuthService` accepts a repository port for focused tests; runtime behavior and public API are unchanged. Login rejects pending, rejected, disabled, and inactive users; login and refresh reject inactive tenants; refresh rejects inactive users before reading or rotating a refresh-session record.

Security impact: Authentication remains fail-closed for unknown/null statuses, with stable `ACCOUNT_NOT_ACTIVE` and `TENANT_NOT_ACTIVE` codes.

Migration impact: None.

Tests added: Service regression coverage for inactive-user and inactive-tenant login/refresh paths.

Commands run:

- `cd backend && npm test` — 41 passing
- `cd backend && npm run build` — passed

Result: P0-SEC-001 acceptance is covered at the policy and service boundaries. `authGuard` applies the same policy after resolving a bearer/API token.

Known limitations: No fresh HTTP/Docker E2E was run in this entry; `docker compose ps` requires the deployment secrets to be supplied before Compose interpolation succeeds.

Next recommended issue: P0-SEC-002 — verify field ownership and its transaction boundary against current source/tests.

## 2026-07-13 20:26 — P0-SEC-002

Status: Verified in the current backend source.

Files changed: `e-office-ai-update-docs/docs/ai/PROGRESS.md`.

Behavior changed: None; this was an evidence audit.

Security impact: `saveFieldValuesInTransaction` loads the signer and restricts the field query to its sign request plus either its assigned signer ID or a shared assignment. The authorization check and field-value upserts share the same Prisma transaction.

Migration impact: None.

Tests added: None; the existing policy regression suite covers own field, guessed other-signer field, guessed other-request field, and shared field.

Commands run:

- `cd backend && npm test` — 41 passing, including signing-field access tests
- `cd backend && npm run build` — passed

Result: P0-SEC-002 acceptance is verified from the transaction-scoped command and regression coverage.

Known limitations: The field-value DTO still contains legacy broad JSON typing outside the authorization boundary; it should be narrowed independently without changing P0 access semantics.

Next recommended issue: P0-DOM-003 — verify shared sequential-signing policy and duplicate activation handling.

## 2026-07-13 20:26 — P0-DOM-003

Status: In progress.

Files changed:

- `backend/src/modules/signRequests/signRequests.service.ts`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed: Internal sequential signing now evaluates and activates the next waiting order inside the command transaction even when no workflow completion configuration exists. It uses the shared lowest-waiting-order policy and a conditional `updateMany` activation.

Security impact: None directly; this improves workflow integrity and prevents a later sequential signer from being activated outside the signing command transaction.

Migration impact: None.

Tests added: None in this entry; existing sequential-order policy tests were exercised.

Commands run:

- `cd backend && npm test` — 41 passing
- `cd backend && npm run build` — passed

Result: The transaction path is corrected. The legacy post-transaction activation block remains in the service and must be removed rather than suppressed, and the command still needs focused command/concurrency coverage before this issue can be marked complete.

Known limitations: The legacy block contains external side effects and an adjacent-PDF flow; removing it safely requires separating the post-commit artifact/notification handling from the command body.

Next recommended issue: Complete P0-DOM-003 by removing the legacy activation path and adding a command-level regression test.

## 2026-07-13 20:26 — P0-DATA-004

Status: In progress.

Files changed:

- `backend/src/modules/signRequests/signRequests.service.ts`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed: Internal progressive-artifact and retry verification now read artifact bytes through the configured object-storage adapter. The redundant post-transaction `in_progress` update was removed; the state-machine transition inside the signing transaction remains authoritative.

Security impact: No absolute artifact filesystem path is used by these internal completion paths.

Migration impact: None.

Tests added: None in this entry.

Commands run:

- `cd backend && npm test` — 41 passing
- `cd backend && npm run build` — passed

Result: The core internal signing transaction contains signer conditional update, next activation, state transition, audit event, and outbox events. Rollback and duplicate-request behavior still require a fresh current-source command/integration test before P0-DATA-004 can be marked complete.

Known limitations: The running Docker backend is not proof of this source revision because it was started before the current edits and cannot be rebuilt without the deployment secret configuration.

Next recommended issue: Add/execute a current-source command-level rollback and concurrent duplicate-signing test for P0-DATA-004.

## 2026-07-13 20:26 — Runtime verification update

Status: Incomplete; no P0 item was marked complete from this run.

Files changed:

- `backend/src/modules/signRequests/signRequests.service.ts`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed: The running backend test container was refreshed with the current compiled backend and Prisma schema, then restored to healthy state.

Security impact: None.

Migration impact: None; the container used `prisma db push` as part of its existing development startup command and this was not used as a production migration.

Tests added: None.

Commands run:

- Docker backend restart and health check — healthy
- `docker exec eoffice-backend node scripts/e2e-workflow-refactor.js` — failed

Result: Runtime login and document/sign-request creation succeeded. The E2E fixture failed at `Expected internal signer to be present`. A direct Prisma create/read check for the same sign request then created and read the signer successfully, so this fixture failure is not evidence of a signing-command transaction failure.

Known limitations: The E2E script needs a deterministic fixture repair or a dedicated command-level test before it can prove rollback and duplicate-concurrency acceptance.

Next recommended issue: Repair/replace the E2E signing fixture, then rerun current-source rollback and concurrency verification.

## 2026-07-13 20:26 — P0-DOM-003 and P0-DATA-004 verification

Status: Verified in current-source Docker runtime.

Files changed:

- `backend/scripts/e2e-workflow-refactor.js`
- `backend/src/modules/signRequests/signRequests.service.ts`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed: The E2E fixture now verifies persistence of its internal signer before using the detail API. Internal sequential activation is transaction-owned and uses the lowest waiting order; duplicate signing uses a conditional update and emits one audit/outbox outcome.

Security impact: None directly; signing state integrity and idempotency are now runtime-verified.

Migration impact: None.

Tests added: Improved deterministic signer-fixture validation in the workflow E2E.

Commands run:

- `cd backend && npm test` — 41 passing
- `cd backend && npm run build` — passed
- Docker backend refresh and health check — healthy
- `docker exec eoffice-backend node scripts/e2e-workflow-refactor.js` — passed

Result: The E2E verified package rollback with no orphans, concurrent approval handling, signing rollback when audit insert fails, one successful plus one `409` duplicate signing outcome with one audit/outbox event, signed artifact generation/download, and refresh rejection after user deactivation.

Known limitations: The test container needed `font-noto` installed at runtime because its pre-existing image lacked the package; the Dockerfile/image build must remain the durable source of that dependency.

Next recommended issue: P0-DATA-005/P0-DATA-006 audit, then update the canonical implementation-progress checklist to remove stale contradictory entries.

## 2026-07-13 20:26 — P1-ARCH-009

Status: In progress.

Files changed:

- `backend/src/modules/public/publicSign.controller.ts`
- `backend/src/modules/signers/signers.service.ts`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed: The public signing controller delegates next-pending-signer notification and external OTP issuance to `SignersService`; it no longer updates a signer to `otp_sent` directly.

Security impact: OTP state is now owned by a service command rather than an HTTP controller.

Migration impact: None.

Tests added: None; existing workflow-state transition tests were exercised.

Commands run:

- `cd backend && npm test` — 41 passing
- `cd backend && npm run build` — passed

Result: One direct controller state-transition path was removed. Remaining controller state mutations must still be audited before P1-ARCH-009 is complete.

Known limitations: Notification/OTP delivery is still a synchronous post-command side effect; a complete P1 outbox migration should move it to worker dispatch.

Next recommended issue: Finish P1-ARCH-009 controller audit, then P1-ARCH-010 outbox/worker verification.

## 2026-07-13 20:26 — P1-ARCH-010 and P1-FE-013 audit

Status: In progress.

Files changed: `e-office-ai-update-docs/docs/ai/PROGRESS.md`.

Behavior changed: None; this was an evidence audit.

Security impact: None.

Migration impact: None.

Tests added: None.

Commands run:

- `cd backend && npm run lint` — failed with 293 legacy errors
- Targeted public signing controller lint — passed after replacing legacy bcrypt requires

Result: The outbox worker has claim, status, retry, capped-backoff, and failure handling, with a retry-delay unit test. The lint gate is enabled but P1-FE-013 remains incomplete because the full repository lint gate is red.

Known limitations: A current-source worker dispatch E2E and systematic remediation of the 293 lint findings are required before these P1 items can be marked complete.

Next recommended issue: Add worker dispatch E2E coverage, then address lint debt in bounded module slices without weakening rules.

## 2026-07-13 20:26 — Frontend validation update

Status: Verified.

Files changed: `e-office-ai-update-docs/docs/ai/PROGRESS.md`.

Behavior changed: None.

Security impact: None.

Migration impact: None.

Tests added: None.

Commands run:

- `cd frontend && npm run build` — passed; compile, lint, type validation, and static generation completed.

Result: The frontend build gate is green. This does not close P1-FE-013 because backend `npm run lint` remains red with 293 findings.

Known limitations: Backend lint remediation remains required.

Next recommended issue: Fix backend lint debt in bounded module slices while continuing the P1 architecture audit.

## 2026-07-13 — P1-CODE-012 shared Prisma client

Status: Completed for the backend application runtime.

Files changed: `backend/src/modules/workflows/workflowState.service.ts`,
`backend/src/modules/documents/documentWorkflowOrchestrator.service.ts`, and
`e-office-ai-update-docs/docs/ai/PROGRESS.md`.

Behavior changed: None. The two transaction-aware services now import the shared
`DbClient` type from `config/prisma` rather than duplicating its
`PrismaClient | Prisma.TransactionClient` definition. All audited interactive
transactions pass their callback `tx` into the nested state/field services that
write inside the transaction.

Security impact: One Prisma client per backend application process avoids
request-scoped connection pools and preserves transaction context.

Migration impact: None.

Tests added: None; the change is type-only and covered by the existing
workflow/signing transaction tests.

Commands run:

- `rg -n --glob "*.ts" "\\bPrismaClient\\b|new\\s+PrismaClient" backend/src` — one
  instantiation, in `backend/src/config/prisma.ts` only.
- `rg -l "new\\s+PrismaClient\\s*\\(" backend --glob "!node_modules/**" --glob
  "!dist/**" --glob "!*package-lock.json"` — 314 files: the central runtime
  configuration plus 313 standalone maintenance/seed/test CLI scripts under
  `backend/scripts`.
- `cd backend && npm test` — passed, 64/64.
- `cd backend && npm run build` — passed.

Result: Runtime service code uses the central singleton and the shared `DbClient`
type. The 313 script occurrences remain intentionally separate: each is a
standalone Node process, so it cannot share the application process's client;
moving them to the application config would force unrelated JWT/SMTP environment
validation and change established maintenance-script startup behavior.

Known limitations: The maintenance scripts retain one client per script process;
they should be modernized under a separately scoped tooling change if a shared
script runner is introduced.

Next recommended issue: Continue P1 architecture/controller audit and bounded backend lint remediation.

## 2026-07-13 — PostgreSQL workflow E2E in GitHub Actions

Status: Implemented and locally verified against disposable PostgreSQL and Redis
containers.

Files changed:

- `.github/workflows/e2e-postgres.yml`
- `docs/dev/E2E-TEST-MATRIX.md`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Workflow added: `PostgreSQL E2E` runs on pull requests to `main`, pushes to
`main`, and manual `workflow_dispatch`. It installs Node 20 dependencies with
`npm ci`, starts PostgreSQL 16 and Redis 7 service containers, applies Prisma
migrations, synchronizes the disposable schema, seeds synthetic baseline data,
installs Unicode PDF fonts, starts the backend, and runs
`npm run test:e2e:workflow`. Backend and service logs are printed on failure;
the job removes its service containers at completion.

Behavior changed: No product behavior changed. The CI-specific schema
synchronization is necessary because the legacy migration chain has no initial
baseline migration; `prisma migrate deploy` alone leaves a new database without
the base application tables.

Security impact: CI uses only fixed fake database credentials, fake JWT/refresh
secrets, synthetic seeded users, and `DISABLE_LICENSE_CHECK=true`. It does not
read repository-local `.env` files or require SMTP, production license, or real
document credentials.

Migration impact: None for deployed environments. `prisma db push` runs only
against the new disposable CI database after `prisma migrate deploy`.

Tests added: No new application test; the existing workflow E2E is now an
automatic GitHub Actions gate.

Commands run:

- `docker exec eoffice-backend node scripts/e2e-workflow-refactor.js` — passed
  against the current Docker PostgreSQL stack.
- `npm run test:e2e:workflow` with disposable PostgreSQL/Redis and a backend on
  port 4100 — passed. It verified package rollback, duplicate approval/signing,
  signing rollback, artifact download, refresh rotation/logout, and disabled
  refresh-session revocation.
- `cd backend && npm test` — passed, 64/64.
- `cd backend && npm run build` — passed after stopping the disposable backend
  process that had temporarily locked Prisma's Windows engine.
- `npx prettier@3.2.5 --check .github/workflows/e2e-postgres.yml
  docs/dev/E2E-TEST-MATRIX.md` — passed; validates the workflow YAML parser and
  formatting.

Result: The previously manual Docker/PostgreSQL workflow E2E command now has a
dedicated CI workflow with service readiness, schema/seed order, failure logs,
and cleanup.

Known limitations: The CI test database needs `prisma db push` until a baseline
initial migration exists. The workflow validates backend API/Persistence E2E;
it does not run browser Playwright E2E or legacy full-repository lint.

Next recommended issue: Add a reviewed baseline Prisma migration so CI can rely
on `prisma migrate deploy` alone, or continue the separately scoped backend lint
remediation.

## 2026-07-13 20:26 — P1-OPS-014 and P1-PDF-015 verification

Status: Verified from Docker configuration and current runtime workflow test.

Files changed: `e-office-ai-update-docs/docs/ai/PROGRESS.md`.

Behavior changed: None.

Security impact: Compose requires secrets rather than accepting insecure defaults; application images run as non-root and expose health checks. Backend runtime image source installs `font-noto`.

Migration impact: None.

Tests added: None.

Commands run:

- `docker compose config --quiet` with process-local generated test secrets — passed
- Current-source Docker workflow E2E — passed with Vietnamese-font runtime package available

Result: Compose configuration validates when required secrets are supplied, and the backend Dockerfile declares the approved Noto font dependency in production.

Known limitations: The existing running test container initially used an older image without `font-noto`; durable release verification still requires a clean backend image build from the current Dockerfile.

Next recommended issue: Clean-image Docker build verification, then continue backend lint remediation and P1 architecture work.

## 2026-07-13 20:31 â€” P1-PDF-015 clean-image verification

Status: Verified in a clean Docker image.

Files changed:

- `e-office-ai-update-docs/docs/ai/20-IMPLEMENTATION-PROGRESS.md`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed: None; this is final verification of the existing Unicode PDF font implementation.

Security impact: The release image remains configured to run as the unprivileged `app` user, which can read the required public font assets.

Migration impact: None.

Tests added: None.

Commands run:

- `docker build --tag eoffice-backend-verified --file backend/Dockerfile backend` â€” passed
- `docker image inspect eoffice-backend-verified` â€” configured user is `app`
- `docker run --rm --entrypoint sh eoffice-backend-verified ...` â€” passed; `app` can read Noto Sans Regular and Bold

Result: The current Dockerfile reproducibly builds the backend image with `font-noto`; both configured Unicode font paths are readable without root privileges.

Known limitations: This verifies image construction and font availability. Repository-wide backend ESLint debt remains outside P1-PDF-015 and is still not green.

Next recommended issue: Reconcile the remaining P1 architecture and quality-gate claims with current source evidence, then remediate the unresolved bounded gap.

## 2026-07-13 20:34 â€” P1-ARCH-009 public-signing command extraction

Status: In progress.

Files changed:

- `backend/src/modules/public/publicSign.controller.ts`
- `backend/src/modules/public/publicSigningCommand.service.ts`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed: The public signing HTTP endpoint keeps its request/response contract but delegates OTP/session validation, sequential-order validation, the signing transaction, workflow transitions, artifact completion, and post-commit notifications to `PublicSigningCommandService`.

Security impact: The controller no longer owns direct signer/status/outbox writes. Session binding, OTP verification, ownership-checked field values, conditional signer transition, and artifact-failure state remain inside the command boundary.

Migration impact: None.

Tests added: None in this extraction; existing signing-order, field-ownership, session, artifact-state, and workflow transition tests were rerun.

Commands run:

- `cd backend && npm run build` â€” passed
- `cd backend && npm test` â€” 41 passing
- targeted ESLint for public controller and command service â€” passed
- controller status-write scan â€” no matches

Result: Public external-signing state writes are now service-owned and the extracted command preserves the existing state-machine and transaction path.

Known limitations: The public signed-artifact download controller still persists a missing `signed_file_path` after generating it; this is not a status transition, but should be moved to a service in a later controller-thinning pass. The new command needs a dedicated service/HTTP regression test before P1-ARCH-009 can be closed.

Next recommended issue: Add focused external-signing command regression coverage, then complete the P1-ARCH-009 acceptance audit.

## 2026-07-13 20:37 â€” P0-SEC-007 public signing-session cookie scope

Status: Verified regression fix.

Files changed:

- `backend/src/modules/public/signingSession.service.ts`
- `backend/src/modules/public/publicSign.controller.ts`
- `backend/tests/signingSession.service.test.ts`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed: OTP verification now issues the HttpOnly signing-session cookie with `Path=/public/sign`, matching the mounted public signing routes. The cookie-path constant is shared with the signing-session module.

Security impact: A verified external signer can present its intended short-lived, HttpOnly session to document and signing endpoints; the invitation token alone still cannot bypass session validation.

Migration impact: None.

Tests added: A regression test asserts that the signing-session cookie is scoped to the public signing route.

Commands run:

- targeted ESLint for public signing/session modules â€” passed
- `cd backend && npm run build` â€” passed
- `cd backend && npm test` â€” 42 passing

Result: The browser cookie scope now matches the actual Express mount (`/public/sign`) and cannot silently prevent the post-OTP session from reaching the protected public-signing endpoints.

Known limitations: This unit regression covers the route contract; a full browser/HTTP external-signing E2E remains desirable alongside the current internal signing E2E.

Next recommended issue: Add an external-signing HTTP smoke test to the Docker workflow fixture, then finish the P1 architecture acceptance audit.

## 2026-07-13 20:40 â€” P0-SEC-007 Docker HTTP session smoke test

Status: Verified in the current-source Docker runtime.

Files changed:

- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed: None; this validates the public signing-session cookie scope fix.

Security impact: The smoke test proved the invitation route must first verify OTP, then supplies the short-lived HttpOnly session to access the protected original PDF. The temporary external signer fixture was removed after the test.

Migration impact: None.

Tests added: None; this was runtime verification in addition to the unit regression.

Commands run:

- refreshed the Docker backend with the current compiled source and waited for health check â€” healthy
- public OTP verification HTTP request â€” `200`
- cookie-store assertion â€” `esign_signing_session` stored with `Path=/public/sign`
- protected public document request with the stored session â€” `200`, 549 bytes
- temporary signer-fixture cleanup â€” passed

Result: The complete post-OTP browser session path works in the running backend: session issuance, browser-compatible cookie storage, and protected document retrieval.

Known limitations: The smoke test exercises OTP verification and protected document access, not a complete external signature submission/artifact lifecycle.

Next recommended issue: Add external signature-submission coverage to the Docker workflow fixture or close the P1 controller-state audit from the already validated service boundary.

## 2026-07-13 20:42 â€” P1-FE-013 backend lint baseline refresh

Status: In progress; gate remains enabled and failing.

Files changed:

- `backend/src/modules/signRequests/pdfGeneration.service.ts`
- `backend/src/modules/settings/settings.service.ts`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed: Only ESLint's safe mechanical fixes were applied: a non-reassigned local was made `const`, and a redundant Boolean coercion was removed. No lint rule, test, type check, or build bypass was changed.

Security impact: None.

Migration impact: None.

Tests added: None.

Commands run:

- `cd backend && npm run lint` â€” initially 287 errors
- `cd backend && npx eslint --fix --ext .ts src` â€” applied 2 safe fixes
- `cd backend && npm run lint` â€” 285 errors remain

Result: The lint gate is active. Remaining findings are mainly legacy explicit `any` annotations and are distributed across many modules; they are not hidden or downgraded.

Known limitations: P1-FE-013 cannot be marked complete until the repository-wide backend lint findings are remediated. The frontend build gate remains green from prior verification.

Next recommended issue: Remediate lint debt in bounded, behavior-tested module slices, starting with low-risk controllers/repositories.

## 2026-07-13 20:45 â€” P1-FE-013 core lint remediation slice

Status: In progress; repository-wide gate remains enabled and failing.

Files changed:

- `backend/src/config/email.ts`
- `backend/src/core/middlewares/errorHandler.ts`
- `backend/src/core/utils/sanitizer.ts`
- `backend/src/middleware/tenant-isolation.ts`
- `backend/tests/sanitizer.test.ts`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed: Tenant SMTP JSON configuration and tenant-filter helper now accept unknown values safely rather than using `any`. SQL escaping keeps its previous escaping behavior via an explicit character map instead of a control-character regex.

Security impact: The change preserves XSS sanitization, SQL special-character escaping, and tenant-filter behavior while preventing untyped configuration values from being used without a shape check.

Migration impact: None.

Tests added: Sanitizer regression tests for control-character/SQL punctuation escaping and recursive object sanitization.

Commands run:

- targeted ESLint for all modified core files and the new test â€” passed
- `cd backend && npm run build` â€” passed
- `cd backend && npm test` â€” 44 passing
- `cd backend && npm run lint` â€” 278 errors remain, down from 285

Result: This bounded core slice is lint-clean and regression-tested. The full lint gate remains active; its remaining errors are legacy findings in other modules.

Known limitations: P1-FE-013 remains open until all 278 repository-wide backend lint errors are fixed.

Next recommended issue: Continue with a low-risk controller/repository module slice, preserving each module's API and test coverage.

## 2026-07-13 20:48 â€” Tenant-scoped repository write hardening and lint slice

Status: Verified in source and targeted checks.

Files changed:

- `backend/src/modules/audit/audit.service.ts`
- `backend/src/modules/external-orgs/external-orgs.repository.ts`
- `backend/src/modules/positions/positions.repository.ts`
- `backend/src/modules/positions/positions.service.ts`
- `backend/src/modules/webhooks/webhooks.repository.ts`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed: External-organization and webhook update/delete now condition on both `id` and `tenant_id` at the mutation itself. A record that is removed or belongs to another tenant produces the existing stable not-found code rather than updating/deleting by guessed ID. Repository query inputs were narrowed to Prisma types.

Security impact: Eliminates cross-tenant update/delete race windows in these repository methods; caller-derived tenant context remains part of every mutation predicate.

Migration impact: None.

Tests added: None; this was a narrow persistence hardening change validated by TypeScript/build and targeted lint. A database integration test for cross-tenant conditional-write rejection remains recommended.

Commands run:

- targeted ESLint for modified audit/external-orgs/positions/webhooks modules â€” passed
- `cd backend && npm run build` â€” passed
- `cd backend && npm test` â€” 44 passing
- `cd backend && npm run lint` â€” 271 errors remain, down from 278

Result: The changed repository slice is lint-clean, build-safe, and tenant scoped at the actual write boundary. The full lint gate remains enabled and red due to legacy findings elsewhere.

Known limitations: No dedicated PostgreSQL cross-tenant mutation test exists yet for these two repository methods.

Next recommended issue: Add repository-level cross-tenant mutation integration coverage, then continue bounded lint remediation.

## 2026-07-13 20:51 â€” P1-FE-013 positions controller lint remediation

Status: In progress; repository-wide gate remains enabled and failing.

Files changed:

- `backend/src/modules/positions/positions.controller.ts`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed: Position controller now reads the existing authenticated request context directly, parses its supported `is_active` query filter explicitly, and handles unknown errors without untyped casts. HTTP success/error status behavior is unchanged.

Security impact: Removes unsafe request casts while continuing to derive tenant identity only from `req.auth`, not a browser-provided tenant value.

Migration impact: None.

Tests added: None; no position-controller test harness currently exists.

Commands run:

- targeted ESLint for positions controller/repository/service â€” passed
- `cd backend && npm run build` â€” passed
- `cd backend && npm test` â€” 44 passing
- `cd backend && npm run lint` â€” 259 errors remain, down from 271

Result: The positions slice is lint-clean. The full gate remains active and red because of legacy findings in other modules.

Known limitations: Position CRUD does not yet have HTTP integration coverage.

Next recommended issue: Continue another small CRUD controller/repository slice and add integration coverage where the project test harness supports it.

## 2026-07-13 20:54 â€” P1-FE-013 notification and document-flow controller lint slice

Status: In progress; repository-wide gate remains enabled and failing.

Files changed:

- `backend/src/modules/notifications/notifications.controller.ts`
- `backend/src/modules/documentFlow/documentFlow.controller.ts`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed: Controller error handling now safely narrows unknown errors before inspecting messages, and the document-flow success helper is generic rather than `any`. Existing HTTP response shapes and status behavior are preserved.

Security impact: No authorization or workflow transition behavior changed; unknown thrown values are no longer assumed to contain a `message` property.

Migration impact: None.

Tests added: None.

Commands run:

- targeted ESLint for notification and document-flow controllers â€” passed
- `cd backend && npm run build` â€” passed
- `cd backend && npm test` â€” 44 passing
- `cd backend && npm run lint` â€” 255 errors remain, down from 259

Result: This controller slice is lint-clean. The full lint gate remains active and red due to legacy findings elsewhere.

Known limitations: P1-FE-013 is not complete until all 255 full-backend lint findings are fixed.

Next recommended issue: Continue bounded lint remediation, avoiding high-risk RBAC/workflow modules without focused characterization coverage.

## 2026-07-13 20:57 â€” P1-FE-013 numbering controller lint slice

Status: In progress; repository-wide gate remains enabled and failing.

Files changed:

- `backend/src/modules/numbering/numbering.controller.ts`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed: Numbering controller now obtains tenant identity from the typed auth context and safely narrows unknown failures before returning its existing response status/message shapes.

Security impact: No client-provided tenant value is used. This change does not alter numbering rules or their increment transaction.

Migration impact: None.

Tests added: None.

Commands run:

- targeted ESLint for numbering controller â€” passed
- `cd backend && npm run build` â€” passed
- `cd backend && npm test` â€” 44 passing
- `cd backend && npm run lint` â€” 244 errors remain, down from 255

Result: The numbering controller is lint-clean; the repository-wide lint gate remains active and red due to legacy findings elsewhere.

Known limitations: The numbering repository's tenant-scoped mutation/concurrency audit is deliberately outside this typing-only slice.

Next recommended issue: Audit and harden numbering repository mutations separately, then continue lint remediation.

## 2026-07-13 21:00 â€” Numbering repository tenant-write hardening

Status: Verified in source and targeted checks.

Files changed:

- `backend/src/modules/numbering/numbering.repository.ts`
- `backend/src/modules/numbering/numbering.service.ts`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed: Numbering-rule update and increment operations now receive the authenticated tenant ID and include it in the database mutation predicate. A missing or cross-tenant rule returns stable `NUMBERING_RULE_NOT_FOUND` instead of writing by ID alone.

Security impact: Prevents a guessed numbering-rule ID from being updated or incremented across tenant boundaries, including after a pre-check race.

Migration impact: None.

Tests added: None; existing unit suite and TypeScript build were run. A PostgreSQL cross-tenant mutation regression remains recommended.

Commands run:

- targeted ESLint for numbering controller/repository/service â€” passed
- `cd backend && npm run build` â€” passed
- `cd backend && npm test` â€” 44 passing
- `cd backend && npm run lint` â€” 242 errors remain, down from 244

Result: Numbering mutations are now tenant scoped at the persistence boundary and the changed module is lint-clean.

Known limitations: The existing number allocation algorithm still needs a dedicated concurrent allocation test/serialization review; this change does not claim to solve duplicate-number races.

Next recommended issue: Add PostgreSQL tenant-isolation and concurrent-numbering tests, then continue bounded lint remediation.

## 2026-07-13 21:03 â€” Departments tenant-write hardening and lint remediation

Status: Verified in source and targeted checks.

Files changed:

- `backend/src/modules/departments/departments.controller.ts`
- `backend/src/modules/departments/departments.repository.ts`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed: Department update/delete now condition on `id` and authenticated `tenant_id` at the persistence boundary. The controller uses typed auth context/unknown error narrowing, and the returned hierarchy has a recursive typed tree instead of untyped maps/arrays.

Security impact: Prevents guessed department IDs from mutating or deleting another tenant's department, including after a pre-check race. Department deletion's user/child safeguards remain unchanged.

Migration impact: None.

Tests added: None; existing unit suite and TypeScript build were run. A PostgreSQL cross-tenant mutation regression remains recommended.

Commands run:

- targeted ESLint for departments controller/repository/service â€” passed
- `cd backend && npm run build` â€” passed
- `cd backend && npm test` â€” 44 passing
- `cd backend && npm run lint` â€” 224 errors remain, down from 242

Result: The departments slice is lint-clean and tenant-scoped at actual update/delete writes. The full lint gate remains active and red because of legacy findings elsewhere.

Known limitations: No dedicated HTTP/database department CRUD tenant-isolation integration test currently exists.

Next recommended issue: Add cross-tenant mutation regression coverage, then continue bounded lint remediation.

## 2026-07-13 21:07 â€” Document-types shared-client and tenant-write hardening

Status: Verified in source and targeted checks.

Files changed:

- `backend/src/modules/documentTypes/documentTypes.controller.ts`
- `backend/src/modules/documentTypes/documentTypes.repository.ts`
- `backend/src/modules/documentTypes/documentTypes.service.ts`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed: Document-type update/delete now condition on both record ID and authenticated tenant ID at the write boundary. Request-time `prisma.$disconnect()` calls after numbering-rule create/upsert were removed so the shared process Prisma client remains available for later requests. Controller typing no longer uses auth/error `any` casts.

Security impact: Prevents cross-tenant document-type mutation by guessed ID and avoids an availability failure where one document-type request could disconnect the shared database client.

Migration impact: None.

Tests added: None; existing suite and TypeScript build were run. Database integration tests for cross-tenant document-type mutation and shared-client continuity remain recommended.

Commands run:

- targeted ESLint for document-type controller/repository/service â€” passed
- `cd backend && npm run build` â€” passed
- `cd backend && npm test` â€” 44 passing
- `cd backend && npm run lint` â€” 207 errors remain, down from 224

Result: The document-types slice is lint-clean, its tenant-owned writes are scoped, and request handlers no longer disconnect the shared Prisma client.

Known limitations: Full-backend lint remains active and red because of 207 legacy findings outside this slice.

Next recommended issue: Add integration coverage for tenant-scoped document-type writes and shared client continuity, then continue bounded lint remediation.

## 2026-07-13 21:10 â€” P1-FE-013 password-reset controller lint slice

Status: In progress; repository-wide gate remains enabled and failing.

Files changed:

- `backend/src/modules/auth/passwordReset.controller.ts`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed: Password-reset controller now identifies Zod failures via `instanceof z.ZodError` and narrows unknown errors before inspecting messages. It preserves validation, rate-limit, reset, and HTTP response behavior; an unused schema was removed.

Security impact: No reset-token semantics changed. Validation errors are typed rather than relying on arbitrary thrown object properties.

Migration impact: None.

Tests added: None.

Commands run:

- targeted ESLint for password-reset controller â€” passed
- `cd backend && npm run build` â€” passed
- `cd backend && npm test` â€” 44 passing
- `cd backend && npm run lint` â€” 203 errors remain, down from 207

Result: The password-reset controller is lint-clean. The full gate remains active and red due to legacy findings in other modules.

Known limitations: Reset-token verification/consumption still needs a separate concurrency/atomicity audit; this controller-only slice does not claim to address it.

Next recommended issue: Audit reset-token consumption or continue bounded lint remediation in a low-risk module.

## 2026-07-13 21:13 â€” Password-reset token atomic consumption

Status: Implemented and source-verified; concurrent database regression remains pending.

Files changed:

- `backend/src/modules/auth/passwordReset.service.ts`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed: Reset-token validation, conditional one-time token claim, and password-hash update now commit in a single Prisma transaction. Exactly one request can claim an unused, unexpired token; confirmation email remains post-commit.

Security impact: Prevents concurrent reset requests from both consuming the same token and updating the account password. An expired or previously consumed token now fails before any password change is committed.

Migration impact: None.

Tests added: None; a concurrent PostgreSQL reset-token regression test is still required.

Commands run:

- targeted ESLint for password-reset service/controller â€” passed
- `cd backend && npm run build` â€” passed
- `cd backend && npm test` â€” 44 passing

Result: The source now has an atomic reset-token command with a conditional claim. Existing test/build gates remain green for the changed code.

Known limitations: No database-level concurrent reset request test has yet proved the conditional-claim path against PostgreSQL scheduling.

Next recommended issue: Add that concurrent reset-token integration test, then continue the remaining P1 lint remediation.

## 2026-07-13 21:16 â€” P1-FE-013 settings controller lint slice

Status: In progress; repository-wide gate remains enabled and failing.

Files changed:

- `backend/src/modules/settings/settings.controller.ts`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed: Settings controller now safely narrows unknown errors before returning the existing response status/message shapes. Tenant identity and document-type policy validation are unchanged.

Security impact: No settings authorization/persistence behavior changed; this removes unsafe assumptions about thrown values.

Migration impact: None.

Tests added: None.

Commands run:

- targeted ESLint for settings controller â€” passed
- `cd backend && npm run build` â€” passed
- `cd backend && npm test` â€” 44 passing
- `cd backend && npm run lint` â€” 194 errors remain, down from 203

Result: The settings controller is lint-clean. The full lint gate remains active and red because of remaining legacy findings elsewhere.

Known limitations: P1-FE-013 remains open until all 194 full-backend findings are remediated.

Next recommended issue: Continue bounded lint remediation in a low-risk module or add the reset-token concurrency integration test.

## 2026-07-13 21:19 â€” P1-FE-013 workflow-controller contract typing

Status: In progress; repository-wide gate remains enabled.

Files changed:

- `backend/src/modules/workflows/workflows.controller.ts`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed: Runtime Zod validation is unchanged. Parsed create-workflow, create-step, and reorder-step payloads are now asserted to explicit post-validation service contracts instead of using `any`.

Security impact: No workflow state transition or authorization behavior changed; this improves typed controller/service boundaries.

Migration impact: None.

Tests added: None.

Commands run:

- targeted ESLint for workflows controller â€” passed
- `cd backend && npm run build` â€” passed
- `cd backend && npm test` â€” 44 passing

Result: The workflow controller is lint-clean and service payload contracts are explicit.

Known limitations: Repository-wide backend lint remains unresolved outside this module; no workflow behavior was changed in this typing slice.

Next recommended issue: Continue remaining lint remediation or add reset-token/database concurrency coverage.

## 2026-07-13 21:22 â€” P1-FE-013 document-flow helper typing

Status: In progress; full lint gate remains enabled.

Files changed:

- `backend/src/modules/documentFlow/documentFlow.service.ts`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed: Approval and signing eligibility helpers use explicit minimal input shapes instead of `any`; their predicates and return behavior are unchanged.

Security impact: No authorization, data access, or state-transition logic changed.

Migration impact: None.

Tests added: None.

Commands run:

- targeted ESLint for document-flow service â€” passed
- `cd backend && npm run build` â€” passed
- `cd backend && npm test` â€” 44 passing
- full backend lint baseline after this slice â€” 187 errors remain

Result: The changed helper slice is lint-clean and verified by the backend build/test suite.

Known limitations: The repository-wide lint gate remains red outside this slice.

Next recommended issue: Continue bounded lint remediation or add outstanding database concurrency coverage.

## 2026-07-13 21:36 - Password-reset concurrency and Docker bootstrap correction

Status: Implemented and runtime-verified.

Files changed:

- `backend/scripts/init-db.js`
- `README.md`
- `e-office-ai-update-docs/docs/ai/20-IMPLEMENTATION-PROGRESS.md`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed: `init-db.js` now treats `AUTO_INIT_DB` as opt-in when invoked
outside Compose; absent configuration skips destructive `prisma db push` and demo
seeding. Root setup guidance now accurately describes the explicit demo-only
bootstrap path.

Security impact: A backend restart no longer defaults to applying schema changes
with `--accept-data-loss` or inserting demo accounts. A PostgreSQL/API smoke test
also proved that two concurrent password-reset submissions can claim a token only
once; the losing request was rejected, and all synthetic fixtures were deleted.

Migration impact: None. `AUTO_INIT_DB=true` remains available only for isolated
disposable demo databases; production deployments should use reviewed Prisma
migrations.

Tests added: No new automated test file; real Docker/PostgreSQL concurrency smoke
used a synthetic user and one-time token, then removed the fixture.

Commands run:

- rebuilt backend TypeScript and refreshed the running Docker backend
- concurrent `POST /api/v1/auth/reset-password` API smoke - HTTP `500, 400`
  because the winning post-commit confirmation email lacks SMTP in the local
  stack; database evidence showed exactly one claimed token and one password
  update before fixture cleanup
- `AUTO_INIT_DB=false node scripts/init-db.js` - passed, no initialization
- `docker compose config --quiet` with synthetic required environment values - passed
- `cd backend && npm test` - 44 passing
- `cd backend && npm run build` - passed

Result: The reset-token atomic-claim path is now proven against PostgreSQL
concurrency. Docker bootstrap behavior matches the production-safe documented
default.

Known limitations: The reset endpoint reports HTTP 500 if the post-commit email
delivery fails, even though the password change has committed. This pre-existing
response-semantics issue should be handled through an outbox/durable notification
path; it does not weaken token single-use protection.

Next recommended issue: Continue P1-FE-013 repository-wide lint remediation,
starting with a bounded low-risk module.

## 2026-07-13 21:44 - P1-FE-013 roles typing and tenant-scoped mutations

Status: In progress; full lint gate remains enabled.

Files changed:

- `backend/src/modules/roles/roles.controller.ts`
- `backend/src/modules/roles/roles.repository.ts`
- `backend/src/modules/roles/roles.service.ts`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed: Role controller now uses the authenticated request context and
narrows unknown errors. Repository updates/deletes and permission changes require
the role tenant, and role-user listing verifies role ownership first.

Security impact: Removes direct role mutation by unscoped ID within this module;
cross-tenant role update/delete/permission mutation now fails rather than
affecting the other tenant.

Migration impact: None.

Tests added: None; this was a bounded typing and isolation remediation.

Commands run:

- targeted ESLint for `src/modules/roles` - passed
- `cd backend && npm run build` - passed
- `cd backend && npm test` - 44 passing
- `cd backend && npm run lint` - 168 errors remain, down from 187

Result: Roles module is lint-clean, compiled, and its tenant-scoped persistence
paths are explicit. The global lint gate is still red outside this module.

Known limitations: No dedicated cross-tenant role API regression test has been
added yet; P1-FE-013 cannot close until the remaining 168 findings are fixed.

Next recommended issue: Continue bounded lint remediation in a low-risk module,
or add the cross-tenant role API regression.

## 2026-07-13 21:53 - P1-FE-013 authorization middleware/document-access typing

Status: In progress; full lint gate remains enabled.

Files changed:

- `backend/src/middleware/permission.ts`
- `backend/src/modules/documents/documents.access.ts`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed: Authorization middleware reads the typed authenticated request
context and maps unknown errors safely. Document-access checks use the shared
Prisma client import and the generated user/document fields rather than dynamic
`require` and `any` casts; access predicates are unchanged.

Security impact: Preserves deny-on-missing-auth behavior and removes unsafe
dynamic persistence loading from a document authorization helper.

Migration impact: None.

Tests added: None.

Commands run:

- targeted ESLint for permission middleware and document-access helper - passed
- `cd backend && npm run build` - passed
- `cd backend && npm test` - 44 passing
- `cd backend && npm run lint` - 161 errors remain, down from 168

Result: Both changed authorization slices are lint-clean and regression-tested.
The global lint gate remains red in other legacy modules.

Known limitations: P1-FE-013 remains open until all 161 findings are remediated.

Next recommended issue: Continue bounded lint remediation, prioritizing typed
document repositories or the registration module.

## 2026-07-13 22:05 - P0-SEC-001 read-only auth audit

Status: Inspection complete; no product code was modified for this audit.

### 1. Current repo understanding

E-Office is an Express/TypeScript backend using Prisma/PostgreSQL, mounted under
`/api/v1`, with a Next.js frontend. Authentication uses access JWTs plus
server-side persisted, hashed refresh sessions. Public registration creates a
pending user; privileged user creation and tenant onboarding create active
accounts intentionally. The authorization boundary derives the tenant from the
validated identity rather than browser-provided tenant IDs.

### 2. Auth-related files found

- `backend/src/modules/auth/auth.routes.ts` and `auth.controller.ts`: login,
  refresh, logout, cookie handling, and public registration route.
- `backend/src/modules/auth/auth.service.ts`, `auth.repository.ts`,
  `auth-status.policy.ts`, and `auth.middleware.ts`: credential validation,
  JWT/session rotation, user/tenant lookup, status policy, and bearer/API-token
  enforcement.
- `backend/src/modules/auth/registration.controller.ts` and
  `registration.service.ts`: public pending-registration and approve/reject
  lifecycle.
- `backend/src/modules/tenants/tenants.service.ts` and
  `backend/src/modules/users/users.service.ts`: active tenant/admin onboarding
  and tenant-scoped user lifecycle.
- `backend/src/middleware/tenant-isolation.ts`, `backend/src/types/express.d.ts`,
  and `backend/prisma/schema.prisma`: authenticated tenant propagation and the
  `users`, `tenants`, and `refresh_sessions` persistence models.
- `backend/tests/auth-status.policy.test.ts` and
  `backend/tests/auth.service-status.test.ts`: existing status regressions.

### 3. Current risks for P0-SEC-001

The core policy is fail-closed: every user or tenant status other than exactly
`active` is rejected with `ACCOUNT_NOT_ACTIVE` or `TENANT_NOT_ACTIVE`; login,
refresh, and `authGuard` call it. The remaining evidence gap is HTTP/integration
coverage proving the same codes and absence of cookies/tokens at the route
boundary, including a refresh session that is revoked after a user becomes
disabled. Public registration deliberately creates an active tenant when
`create_tenant` is requested but leaves the registering user `pending`; this
product decision needs an explicit authorization regression before treating it
as release-ready.

### 4. Proposed implementation plan

1. Add route-level characterization tests for login and refresh with synthetic
   active/pending/rejected/disabled users and active/inactive tenants.
2. Verify login performs the status decision before issuing cookies/tokens and
   refresh performs it before session rotation; retain the existing stable codes.
3. Exercise `authGuard` with a valid access token after user or tenant
   deactivation, then ensure it returns the same fail-closed error.
4. If any path differs, make the smallest shared-policy fix in the auth service,
   repository, or middleware; do not trust request tenant/user values.
5. Update security documentation and this progress record with actual command
   results.

### 5. Test plan

- Pending, rejected, disabled, inactive, null, and unknown user statuses cannot
  login and do not receive a refresh cookie.
- Active user in inactive/disabled/pending tenant cannot login or refresh and
  receives `TENANT_NOT_ACTIVE`.
- Disable a user after creating a refresh session: refresh and bearer-token
  access fail, and the stored session is revoked where required.
- Valid active user/tenant login and rotated refresh session still succeed.
- Public registration remains pending and cannot authenticate before approval.

### 6. Commands to run later

- `cd backend && npm test`
- `cd backend && npm run build`
- targeted ESLint for auth modules and middleware
- focused HTTP/API auth regression command or a Docker smoke test with synthetic
  users and tenants
- `cd backend && npm run lint` (reported truthfully if legacy findings remain)

Files changed: `e-office-ai-update-docs/docs/ai/PROGRESS.md` only.

Security impact: Documentation/audit only; no runtime behavior changed.

Migration impact: None.

Next recommended issue: Implement the P0-SEC-001 HTTP-level characterization
coverage described above, after review of this audit.

## 2026-07-13 — Prisma migration baseline

Status: Implemented and verified on a fresh disposable PostgreSQL database.

Files changed:

- `backend/prisma/migrations/0_init/migration.sql`
- `backend/prisma/migrations/migration_lock.toml`
- `backend/prisma/migrations_archive/` (historical incremental migrations)
- `backend/scripts/init-db.js`
- `.github/workflows/ci.yml`
- `.github/workflows/e2e-postgres.yml`
- Docker/E2E migration documentation and `docs/database-migrations.md`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Behavior changed: No application business behavior or Prisma schema changed.
The active Prisma history is now a reviewed `0_init` baseline generated from
the current schema. New/empty databases use `prisma migrate deploy`; CI and
Docker bootstrap/E2E no longer use `prisma db push`.

SQL review: `0_init` was generated with `prisma migrate diff --from-empty
--to-schema-datamodel prisma/schema.prisma --script`. It creates 35 tables,
their indexes, and foreign keys; it contains no `DROP`, `INSERT`, `UPDATE`,
`DELETE`, or `TRUNCATE` statements. Seed data remains in separate idempotent
seed scripts.

Security and migration impact: The baseline does not run against populated
databases. Existing deployments must back up first, prove zero schema drift,
then use `prisma migrate resolve --applied 0_init` only when the schema matches.
The adoption runbook is in `docs/database-migrations.md`.

Commands run:

- `npx prisma migrate diff --from-empty --to-schema-datamodel
  prisma/schema.prisma --script` — generated baseline SQL.
- Fresh disposable PostgreSQL: `npx prisma migrate deploy`, `npx prisma migrate
  status`, and `npx prisma migrate diff --from-url ... --to-schema-datamodel
  prisma/schema.prisma --exit-code` — passed; no schema drift.
- `docker exec eoffice-backend node scripts/e2e-workflow-refactor.js` — passed.
- `cd backend && npm test` — passed, 64/64.
- `cd backend && npm run build` — passed.

Result: A blank PostgreSQL database now initializes through `migrate deploy`
alone, while existing populated databases receive an explicit, non-destructive
adoption path.

Known limitations: Historical migrations are archived rather than active.
Operators must manually verify a backup and zero schema drift before marking
the baseline applied on an existing database; this task deliberately does not
alter any developer or deployment database.

Next recommended issue: Create future schema changes with reviewed migrations
after `0_init`; do not reintroduce `prisma db push` into CI or deployment flows.
## 2026-07-13 — P1-FE-013 lint and typecheck gates

Status: Implemented and verified.

Files changed: frontend lint/typecheck configuration, React 18 type alignment,
frontend test typing, quality-only backend type fixes, and
`LINT-TYPECHECK-REPORT.md`.

Results:

- backend lint: 157 errors to 0;
- backend build: passed;
- backend tests: 64/64 passed;
- frontend lint: 0 errors (legacy warnings remain visible);
- frontend direct typecheck and production build: passed.

No build/lint suppression, ignore flag, or `ts-ignore` was added. Remaining
frontend warnings need separate UI/behavior review, especially hook dependency
warnings in approval and signing screens.

## 2026-07-14 — Frontend UI/UX audit

Status: Completed as a documentation-only, source-informed audit; no production
or backend code changed.

Files changed:

- `docs/ux/UI-UX-AUDIT.md`
- `docs/ux/UI-UX-BACKLOG.md`
- `e-office-ai-update-docs/docs/ai/PROGRESS.md`

Coverage: Login/entry, dashboard/navigation, sign-request creation, approval
and tasks, internal/external signing, status tracking, notifications,
administration/settings and responsive/accessibility sources were inspected.
The local login endpoint and backend health endpoint returned HTTP 200.

Key finding: User-facing Vietnamese text is mojibake in the dashboard shell,
sidebar/mobile navigation, external OTP flow, notification dropdown and PDF
signing components. This is recorded as release-blocking UX-001. The audit also
prioritizes accessible OTP/PDF signing, permission-consistent mobile navigation,
guided request creation and standardized destructive confirmations.

Validation limitation: Browser automation had no available browser session in
this environment, so screenshots, authenticated workflows, real OTP delivery,
and responsive viewport replay must be completed during the first UX fix PR.

Commands run:

- `cd frontend && npm run lint` — passed with existing warnings (React hook
  dependencies, unoptimized images, and one missing image alt text).
- `cd frontend && npm run typecheck` — passed.
- `cd frontend && npm run build` — passed with the same existing warnings.

Security impact: Documentation only. UX fixes must preserve current tenant and
authorization checks, OTP controls and signing policies.

Migration impact: None.

Next recommended issue: UX-001 — normalize frontend user-facing text to UTF-8
and add a regression check before changing interaction design.
