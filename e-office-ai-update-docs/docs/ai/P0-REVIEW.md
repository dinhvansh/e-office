# P0 Review

Review date: 2026-07-13

Scope: evidence review only. This document compares the P0 backlog acceptance
criteria with the current source, test files, progress record, and the current
dirty worktree. It does not treat a historical “verified” entry as proof where
current code or a direct test contradicts it.

## Review rules

- **Done** means current code covers every stated acceptance criterion and there
  is direct, relevant automated or recorded runtime evidence.
- **Partial** means the core implementation exists but one or more acceptance
  criteria lack direct evidence or are contradicted by current code.
- **Not done** means the required behavior is absent. No reviewed item met this
  threshold, but no item is treated as release-complete merely because it has
  policy-level tests.

The worktree contains a large number of unrelated P1/P2 and pre-existing changes.
No P0 commit was created: an isolated commit cannot be made safely without
including unrelated changes. No production code was changed during this review.

## P0-SEC-001 — Block non-active users and tenants

**Status: Partial**

**Evidence from code**

- `backend/src/modules/auth/auth-status.policy.ts` permits only exactly
  `user.status === "active"` and `tenant.status === "active"`; missing and
  unknown values fail closed with `ACCOUNT_NOT_ACTIVE` or `TENANT_NOT_ACTIVE`.
- `auth.service.ts` invokes that policy in both `login()` and `refresh()` before
  issuing/rotating tokens; `auth.middleware.ts` invokes it for bearer and API
  token authentication.
- Refresh sessions are persisted, hashed and rotation/logout revoke their
  session rows.

**Tests found**

- `backend/tests/auth-status.policy.test.ts`: active allowed; pending, rejected,
  disabled, inactive, null and undefined statuses denied.
- `backend/tests/auth.service-status.test.ts`: inactive user login, inactive
  tenant login, disabled-user refresh and inactive-tenant refresh service paths.
- The historical Docker E2E recorded a disabled-user refresh rejection.

**Tests missing**

- HTTP tests proving `403`, stable code, no access token and no refresh cookie
  for pending/rejected/disabled login (`AUTH-001`).
- HTTP/API tests for inactive tenant login and refresh (`AUTH-003`) and bearer
  access after deactivation.
- A persistence assertion for `AUTH-002`: when refresh is rejected because a
  user was disabled, the already-issued refresh-session row is revoked.

**Risk remaining**

`refresh()` rejects a disabled/inactive user before loading or revoking the
session. The refresh token cannot be used successfully, but the database session
is left live until expiry/logout; this does not satisfy the requested revocation
semantic. Route-boundary cookie/token behavior is unproven.

## P0-SEC-002 — Enforce signing field ownership

**Status: Partial**

**Evidence from code**

- `signRequestFieldValues.service.ts` uses one Prisma transaction. It loads the
  signer, filters fields by that sign request plus `(assigned_signer_id = signer
  OR null)`, rejects mismatches with `FIELD_ACCESS_DENIED`, then upserts values
  through the same transaction client.
- `signRequestFieldAccess.policy.ts` has the same ownership predicate.

**Tests found**

- `backend/tests/signRequestFieldAccess.policy.test.ts`: assigned own field,
  guessed other-signer field, guessed other-request field, and shared field.

**Tests missing**

- Transaction/integration tests that call the service with guessed IDs and then
  assert `FIELD_ACCESS_DENIED` and no row was written.
- A rollback test for a mixed payload containing one allowed and one forbidden
  field.

**Risk remaining**

The implementation is correctly shaped, but only the pure predicate—not the
database check-and-upsert boundary—is currently directly tested.

## P0-DOM-003 — Restore internal sequential signing

**Status: Partial**

**Evidence from code**

- `signingOrder.policy.ts` provides `canSignerActInOrder()` and
  `findNextWaitingSigningOrder()`.
- Internal (`signRequests.service.ts`) and external
  (`publicSigningCommand.service.ts`) paths invoke the shared order policy.
- Internal signing activates the lowest waiting order inside its transaction via
  conditional `updateMany`; external signing uses the same activation policy.

**Tests found**

- `backend/tests/signingOrder.policy.test.ts`: order two blocked until order
  one completes, same-order parallel signing allowed, next order allowed, and
  non-contiguous waiting order selection.
- Historical workflow E2E recorded one successful and one conflicting duplicate
  signing submission.

**Tests missing**

- Current command/API tests showing an internal order-two signer returns the
  expected `409 SIGNING_ORDER_VIOLATION` before order one completes.
- A current external-signing order test using the same fixture.
- A concurrency test that demonstrates exactly one next-order activation in the
  database.

**Risk remaining**

The pre-transaction ordering check reads current signer state; the transaction
uses conditional activation but does not re-check ordering under a lock. The
recorded E2E helps, but does not characterize all concurrent order races.

## P0-DATA-004 — Transactional signing command

**Status: Partial**

**Evidence from code**

- `signRequests.service.ts` conditionally marks the signer signed in a Prisma
  transaction, computes completion/next activation, transitions the document and
  sign request, inserts audit and outbox events, and rejects a lost race with
  `CONCURRENT_MODIFICATION`.
- `publicSigningCommand.service.ts` follows a similar transaction path for
  external signing and invokes transaction-aware field-value persistence.

**Tests found**

- Historical `e2e-workflow-refactor.js` run forced audit insertion failure and
  asserted no signer/request/audit/outbox partial state, then submitted duplicate
  signatures concurrently and asserted one success plus one `409`.

**Tests missing**

- A versioned automated integration test in `backend/tests` for all atomic
  records, including field values and signature metadata.
- A current run of that E2E after its container database-host correction.
- A failure injection after field upsert/signature preparation to prove all
  field values roll back too.

**Risk remaining**

The internal path performs some signature preparation before the central state
transaction, and the field-value atomicity is not directly characterized for the
internal command. The historical E2E is useful evidence, but not enough to prove
the full stated atomic set on every current path.

## P0-DATA-005 — Transactional approval decision

**Status: Done**

**Evidence from code**

- `approvals.service.ts#approve()` conditionally claims a pending approval,
  evaluates completion mode, skips remaining actors where applicable, activates
  the next step or completes the workflow, and creates an outbox event in one
  serializable Prisma transaction with retry on serialization conflicts.
- A conditional update returns `CONCURRENT_MODIFICATION` when another request
  already acted.

**Tests found**

- `backend/tests/approvalCompletion.policy.test.ts`: `all`, `any_one`, and
  `min_n` behavior.
- Historical workflow E2E submits two approval requests concurrently and checks
  exactly one success plus one rejected duplicate without duplicate completion.

**Tests missing**

- A durable integration test checked into `backend/tests` for the serializable
  transaction and next-step persistence.

**Risk remaining**

The direct implementation and recorded runtime evidence meet the backlog
acceptance. The main maintenance risk is that the concurrency evidence remains a
script rather than CI-discovered integration coverage.

## P0-DATA-006 — Correct artifact completion state

**Status: Partial**

**Evidence from code**

- Internal and external signing paths generate artifact bytes and SHA-256 hash
  before transitioning both records to `completed`; failures transition both to
  `artifact_failed` and return `ARTIFACT_GENERATION_FAILED`.
- `retrySignedArtifactGeneration()` permits only `artifact_failed`, persists the
  signed file path/hash on success, and leaves recoverable `artifact_failed` on
  retry failure.
- `frontend/app/(dashboard)/sign-requests/[id]/page.tsx` shows
  `artifact_failed` and a **Retry PDF** control.

**Tests found**

- `backend/tests/artifactCompletion.policy.test.ts`: generated artifact permits
  completion; failed artifact maps to `artifact_failed`.
- Historical workflow E2E downloaded a non-empty final signed artifact.

**Tests missing**

- Integration test that makes PDF generation throw and asserts both database
  statuses are not completed, error code is stable, and retry is allowed.
- UI/API test confirming the failed state and retry control are visible and
  functional.

**Risk remaining**

The implementation and UI wiring exist, but failure/retry behavior is supported
only by policy-level tests rather than an injected PDF failure regression.

## P0-SEC-007 — OTP before external document access

**Status: Partial**

**Evidence from code**

- `publicSign.controller.ts#getDocument()` requires a valid HttpOnly signing
  session before returning the PDF; invitation token alone returns a session
  error. OTP verification issues a short-lived cookie scoped to `/public/sign`.
- `signingSession.service.ts` binds a signed session to signer ID, sign-request
  ID and the current OTP fingerprint. Signing clears the OTP; signed/cancelled/
  rejected/expired signers are blocked from document retrieval.
- Before OTP, the signing-page response exposes only `otp_required`, signer
  name/status and request title/deadline.

**Tests found**

- `backend/tests/signingSession.service.test.ts`: cookie scope, signer/request
  binding and malformed session rejection.
- Recorded Docker smoke: OTP verification issued the cookie and protected PDF
  retrieval succeeded with it.

**Tests missing**

- Direct HTTP test that invitation-only PDF retrieval returns 401/403 and no
  bytes (`PUB-001`), expired session fails (`PUB-002`), and post-sign session
  reuse fails (`PUB-003`).
- Complete external-signing API lifecycle test, including session invalidation.

**Risk remaining**

After OTP, `getSigningPage()` returns `signers: allSigners` with each signer's
name and email. This conflicts with the P0 acceptance “other signer identities
not exposed” unless a post-OTP disclosure policy is explicitly approved. This
item must remain Partial until that exposure is removed or its requirement is
changed and tested.

## P0-DATA-008 — Transactional document package creation

**Status: Partial**

**Evidence from code**

- `documentWorkflowOrchestrator.service.ts#prepareDraftPackage()` creates sign
  request, document link, workflow snapshot and signer records in one Prisma
  transaction using the transaction client.
- `documents.service.ts` compensates if that package transaction fails by
  deleting the prior document and server-created base64 upload.

**Tests found**

- `e2e-workflow-refactor.js` deliberately causes package creation failure and
  checks for zero orphan document, sign request, ACL and upload records. A
  recorded historical Docker run passed this assertion.

**Tests missing**

- Checked-in integration coverage for rollback of document, workflow snapshot,
  signers, ACL, CC recipients and uploaded file.
- A current E2E run after the script's container DB-host correction.
- Failure injection for ACL/CC creation, which occurs outside the package
  transaction.

**Risk remaining**

Document creation and ACL snapshot occur before `prepareDraftPackage()`; its
compensation only covers a downstream package failure. A failure while creating
permissions or CC entries can leave a partial package, so the requested all-record
atomicity is not fully proven.

## Summary

| Issue | Review status |
| --- | --- |
| P0-SEC-001 | Partial |
| P0-SEC-002 | Partial |
| P0-DOM-003 | Partial |
| P0-DATA-004 | Partial |
| P0-DATA-005 | Done |
| P0-DATA-006 | Partial |
| P0-SEC-007 | Partial |
| P0-DATA-008 | Partial |

## P0 closure verification update (2026-07-13)

This update supersedes the evidence-gap snapshot above. It is based on the
current source and tests executed after the closure work, not on the historical
review entries.

| Issue | Status | Direct current evidence |
| --- | --- | --- |
| P0-SEC-001 | Done | Service tests assert exact matching-session revocation for disabled user and inactive tenant; Docker/PostgreSQL E2E disables a user, refreshes with a newly-issued token, and verifies `refresh_sessions.revoked_at`. |
| P0-SEC-002 | Done | `signRequestFieldValues.service.test.ts` calls the actual transaction-bound service for other-signer, other-request, shared, and mixed payload cases; denied requests write zero rows. |
| P0-DOM-003 | Done | Public and internal command tests assert `SIGNING_ORDER_VIOLATION`; the internal endpoint now returns 409. Docker E2E verifies competing signing commands yield one success and one conflict without duplicate effects. |
| P0-DATA-004 | Done | Docker/PostgreSQL E2E injects an audit-trigger failure and verifies signer/request status, audit/outbox state, and `position_data` roll back; it also verifies duplicate concurrent signing only produces one audit/outbox effect. |
| P0-DATA-005 | Done | Existing approval policy coverage plus current Docker E2E concurrent-approval assertion. |
| P0-DATA-006 | Done | Injected PDF-generation tests verify paired `artifact_failed` transitions, no completed state, and retry state behavior. |
| P0-SEC-007 | Done | Public controller tests verify pre-OTP PDF denial, verified-session PDF access, expired-session denial, reused-signing denial, stable OTP/session codes, and response DTO redaction of other signer identities. |
| P0-DATA-008 | Done | Document-creation compensation tests cover workflow, signer, ACL, and CC failures; package creation remains transactionally atomic and uploads/attachments are compensated. |

### Closure validation

- `cd backend && npm test` — 64 passing.
- `cd backend && npm run build` — passed.
- Targeted ESLint for each newly added test and the modified document service — passed. The legacy `signRequests.service.ts` global lint debt remains and was not disabled or suppressed.
- Docker/PostgreSQL: current build was copied into `eoffice-backend`, the
  container was restarted healthy, and
  `node scripts/e2e-workflow-refactor.js` passed. It covers package rollback,
  concurrent approval/signing, signing rollback, final artifact download,
  refresh rotation/logout, and disabled-session row revocation.

### Remaining non-P0 risks

- Most focused unit tests use controlled Prisma transaction doubles; the Docker
  workflow E2E supplies database evidence for the high-risk workflow paths but
  is not yet part of CI.
- Object-storage deletion is best-effort compensation because storage cannot
  be committed atomically with PostgreSQL; operational reconciliation remains
  necessary after an infrastructure outage.
- The repository has substantial unrelated dirty P1/P2 work and pre-existing
  lint debt. No commit was created and no unrelated change was reverted.

## Commit status

No commit was created. The requested commit format is appropriate once a P0
issue is isolated and its relevant tests pass, but the current diff is a large
mixed worktree and this review makes no issue-specific code change to commit.
