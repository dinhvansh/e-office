# Implementation Progress

## 2026-07-15 — Final alpha publication remediation

- Committed clean-clone source fixes, then removed private backup data,
  obsolete token helpers, stale example secrets, and LibreSign fixture keys
  from Git history in a controlled filter-repo mirror.
- Full-ref Gitleaks scan now passes with zero findings. `.gitleaks.toml` has
  narrow, commented exceptions only for CI/demo placeholders.
- A fresh clone passed lockfile installs, migrations, backend tests/lint/build,
  frontend lint/typecheck/build, local Docker E2E, and MinIO/S3 E2E.
- Technical publication blockers are clear. Fair-Code/legal review remains a
  separate non-technical publication approval before any public tag or release.

## 2026-07-15 — Public source alpha packaging

- Added a draft Fair-Code/source-available license package, commercial
  licensing and trademark notices. It is explicitly not OSI open source and
  requires legal review before publication.
- Public onboarding now requires explicit demo passwords and documents that
  signing is not automatically qualified PKI/PAdES signing.
- Public scan found historical Public Workspace/Example Organization absolute documentation links and
  debug artifacts; exclude or remediate them before publishing the full docs
  archive.

## 2026-07-15 — Security cleanup (in progress)

- Added refresh-token family replay revocation, webhook SSRF blocking and
  Unicode-safe watermark rendering. Next 16/React 19 migration now passes
  frontend lint, typecheck and webpack production build. Backend tests (101),
  lint, build, Docker E2E and MinIO/S3 E2E all pass. Playwright remains
  unverified because this sandbox denies local port binding (`EACCES`). See
  `FINAL-SECURITY-REVIEW.md`.
- Credential cleanup parameterized all active/manual account and seed scripts
  through `DEMO_ADMIN_PASSWORD`. The final scan has no weak credential usable
  by runtime, CI, dev seeds or manual admin commands; residual literals are
  test/debug fixtures, docs, or weak-secret deny-lists.

## 2026-07-15 — Outbox Phase 2 delivery foundation

- Email templates and webhook delivery now run through the existing outbox
  worker; signed-artifact processing remains an isolated event handler.
- Outbox failures use bounded retry and stale-lock recovery. Webhook network/5xx
  failures retry, while destination 4xx failures are terminal and errors are
  sanitized. See `OUTBOX-WORKER-ARCHITECTURE.md`.
- Verified backend tests, local Docker workflow E2E and MinIO/S3 workflow E2E.

## 2026-07-15 — MinIO/S3 FileStorage E2E

- Added a test-only MinIO Compose overlay with health-gated one-shot bucket
  initialization. Local filesystem storage remains the production default;
  backend and outbox worker switch to S3 only for `npm run e2e:s3`.
- The real workflow verifies portable object keys, source-object existence,
  missing-object behavior, application-level cross-tenant denial, signed
  artifact upload/download, persisted hash/metadata and idempotent deletion.
  The existing forced artifact failure confirms completion is not falsely
  recorded before artifact storage succeeds.
- Docker CI now runs the shared local and MinIO/S3 helpers without repository
  secrets and retains diagnostics only on failure. Verified locally:
  `npm run e2e:s3`.

## 2026-07-15 — Reproducible Docker PostgreSQL E2E

- The missing `POSTGRES_PASSWORD` blocker is resolved for local/CI E2E through a test-only Compose overlay, ignored local env names and a helper that materializes `.env.test.example` only in a temporary directory. Production Compose still requires explicit secrets.
- GitHub Actions now calls the same `npm run e2e:docker` entry point, retains the isolated Compose stack only for failure diagnostics, and always removes test containers/volumes afterward.

## 2026-07-15 — Document-service responsibility split

- **P2-CODE-018:** retained `documents.service.ts` as the controller compatibility facade and moved document file retrieval/watermarking plus archive/cancel lifecycle commands into focused services. Existing query/access filtering remains in `documentQueries.service.ts`; tenant/ACL checks stay before file reads and lifecycle commands.
- Backend verification passed: `npm test` (90 tests), `npm run lint`, and `npm run build`. Docker PostgreSQL E2E remains unavailable because Compose requires an unset `POSTGRES_PASSWORD`; no runtime Compose env file is present.

## 2026-07-15 — Sign-request service responsibility split

- **P2-CODE-017:** split sign-request queries, draft creation, signer management, lifecycle commands, signing-progress rules and the atomic internal-signing command out of `signRequests.service.ts`. The facade retains controller-facing authorization, audit boundaries and response contracts.
- Backend verification passed: `npm test` (89 tests), `npm run lint`, and `npm run build`. Docker PostgreSQL E2E could not start because Docker Compose requires an unset `POSTGRES_PASSWORD`; no compose environment file is present in the workspace.

## 2026-07-15 — Final accessibility and responsive pass

- **UX-010 fixed:** resolved all project-owned frontend lint warnings with dependency-safe callbacks/memoization and accessible image handling. Chromium verification covered keyboard signing, dialog Escape/focus return, responsive desktop/768px/375px states, async retry and duplicate-submit protection. No known UI/UX debt remains from the current audit backlog.

## 2026-07-14 — Critical signing and approval blockers

## 2026-07-15 — Workflow status and next action

## 2026-07-15 — Guided sign-request creation

## 2026-07-15 — Accessible PDF signing

- **UX-003 fixed:** signing PDF fields now have an accessible field list, progress announcement and keyboard-operable overlay targets. The established Radix signature dialog supplies typed/upload alternatives and focus-safe interaction. Chromium replay verified OTP, keyboard entry, typed signature and Escape at desktop/mobile; evidence: `docs/ux/evidence/ux003-*.png`.

- **UX-005 fixed:** `/sign-requests/create` now has a four-step retained-state flow for document, workflow, participants and final review. Inline validation prevents incomplete progression; browser verification covered keyboard progression, back/next retention, duplicate-submit protection and desktop/tablet/mobile evidence in `docs/ux/evidence/ux005-*.png`.

- **UX-007 fixed:** backend detail contracts now return a role-safe workflow status summary. The shared Vietnamese panel explains status, current responsible role, next action, progress, deadline and eligible PDF-artifact retry without revealing private participant data. Sign-request, document-flow, approval detail and My Tasks now use this context; Chromium verified failure/retry and expiry at desktop, tablet and mobile widths. Evidence: `docs/ux/evidence/ux007-*.png`.

- **UX-013 fixed:** public OTP verification creates a signing session; verified metadata is refreshed before the PDF signing surface is shown. Missing document/request metadata displays a Vietnamese retry state. Playwright covered valid, missing-data, invalid and expired OTP responses.
- **Approval and My Tasks fixed:** approval queries now constrain both `approver_user_id` and document tenant; signing tasks are tenant-scoped. List failures render a retryable error rather than an endless loading state.
- **UX-014 fixed:** PDF field placement uses the rendered canvas bounds and retains normalized coordinates through persistence, reload and signer rendering. Coordinate tests cover three non-edge positions.

Verification evidence is stored in `docs/ux/evidence/`.

## 2026-07-14 — Authentication and OTP recovery

- **UX-002 / UX-018 fixed:** OTP input supports numeric keyboards, browser one-time-code autofill and sanitized six-digit paste. Resend now shows an expiry countdown, cooldown, accessible live feedback and localized recovery for delivery, expiry and attempts errors.
- **UX-011 fixed and browser verified:** the frontend uses one public API base setting and a localized configuration guard prevents blank routes or exposed configuration names. An isolated Playwright server with all API URL variables removed verified `/login` and `/settings/system` at desktop and 375 px.
- **UX-012 fixed:** login maps account and workspace activation codes to localized, non-enumerating recovery guidance.

## Role-aware navigation — 2026-07-14

- **UX-004 / UX-015 fixed and browser verified:** desktop sidebar and mobile navigation use the same permission-filtered groups. `super_admin` sees all configured admin destinations, restricted requester/approver/signer sessions do not see unauthorized entries, and mobile exposes permitted overflow through a keyboard-accessible “Thêm” menu. Chromium passed at desktop, 768 px and 375 px; unauthenticated `/users` still redirects to `/login`.

## Destructive confirmations — 2026-07-14

- **UX-006 fixed and browser verified:** a single Radix-based confirmation provider now replaces all native confirmation prompts across users, roles, documents, positions, external organizations, sign requests, document types and signer management. It provides Vietnamese action/target copy, pending duplicate protection, safe inline retry errors, Escape/focus behavior and responsive Chromium coverage.

## Public legal pages — 2026-07-15

- **UX-001 fixed and browser verified:** registration now links to public `/terms` and `/privacy` pages using centralized versions/effective date. Pages deliberately state that legal review is pending, work at 375 px and preserve registration values on return. Registration persistence currently records acceptance as a boolean only; recording policy versions remains a backend/schema follow-up.

## Workflow preview localization — 2026-07-15

- **UX-016 fixed and browser verified:** the default approval-workflow preview now renders centralized Vietnamese Unicode labels for the title, step count, approver type, duration and missing approver. Chromium Playwright used a realistic two-step workflow at desktop and 375 px; evidence is stored in `docs/ux/evidence/`.

## Async recovery states — 2026-07-15

## 2026-07-15 — Notification history

- **UX-008 fixed:** added the authenticated `/notifications` history route with server-backed pagination, read/read-all/delete actions, safe authorized navigation, persistent retryable errors and accessible feedback. Existing notification API already scopes data and mutations to the authenticated user and tenant. Chromium verified desktop, tablet and mobile; evidence: `docs/ux/evidence/ux008-*.png`.

- **UX-009 fixed and browser verified:** shared async-state primitives now standardize loading, empty, persistent error/retry, success and `aria-live` feedback across dashboard, documents, sign requests, approvals, My Tasks, notifications, external signing loading and create-request submission. The create form keeps values after failure and blocks duplicate concurrent submissions. Chromium Playwright passed desktop, 768 px and 375 px recovery scenarios; evidence is stored in `docs/ux/evidence/`.
