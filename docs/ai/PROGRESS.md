# Implementation Progress

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
