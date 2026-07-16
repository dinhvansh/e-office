# Playwright failure triage

**Baseline:** Chromium headless, clean Docker UAT (`127.0.0.1:3010` frontend, real backend/PostgreSQL at `127.0.0.1:4010`), 2026-07-16. The legacy suite produced **16 passed / 31 failed**. This is a triage record, not a claim that every listed assertion is a product defect.

## Classification legend

* **A — Obsolete test/harness:** a selector, static UI assumption, mock contract, route, or fixture no longer represents verified product behavior.
* **B — Test infrastructure issue:** readiness, shared session, test data, rate-limit, or UAT configuration issue.
* **C — Real UI regression** / **D — Real business-logic bug** / **E — Real permission/security bug:** only used after a failure is reproduced against the real UAT flow.

## Failure inventory

| Test | Class | Root cause / evidence | Required action | Severity | Status |
|---|---|---|---|---|---|
| UX-009 notifications loading/error/retry | A | Mocked API response and hard-coded browser endpoint; not a real notification flow. | Rebuild using current response contract; retain safe-error assertions. | Low | obsolete/open |
| UX-009 dashboard/documents retry | A | Mock-only test assumes old response shapes. | Update mock contract after current UI contract inspection. | Low | obsolete/open |
| UX-009 My Tasks retry | A | Mock-only test uses fixed payload and stale text. | Replace with current task fixture. | Low | obsolete/open |
| UX-009 approvals/sign requests retry | A | Mock-only response shapes do not match current fetch layer. | Update fixture and use stable roles. | Low | obsolete/open |
| UX-009 create-request retry | A | Depends on old create flow controls/mocked payload. | Rewrite as isolated UI test; do not use for Golden Path. | Low | obsolete/open |
| UX-009 tablet dashboard retry | A | Mock-only stale endpoint/contract. | Update after shared async-state fixture exists. | Low | obsolete/open |
| UX-006 destructive cancel/Escape | A | Legacy mock route/dialog assumptions. | Rebind to current destructive-confirmation provider. | Low | obsolete/open |
| UX-006 destructive pending | A | Legacy mock request assertion. | Update to current action endpoint and dedupe behavior. | Low | obsolete/open |
| UX-006 destructive retry | A | Legacy inline error fixture. | Update fixture and preserve retry assertion. | Low | obsolete/open |
| UX-006 responsive destructive dialog | A | Depends on same obsolete dialog fixture. | Update after base destructive test. | Low | obsolete/open |
| Document Types UI dropdown | A | Reproduced: test expects a native `<select>` before file selection; current UI correctly reveals `SelectWithIcon` after file selection. | Replace selector with accessible listbox/option flow. | Medium | obsolete/open |
| Document Types UI upload/number | A | Reproduced: same native-select assumption. | Rewrite around file-first flow and assert persisted document number. | Medium | obsolete/open |
| Full UI document type flow | B | Uses stale deterministic credentials/old UI assumptions and was affected by shared login throttling. | Update E2E fixture; rerun against real UAT data. | Medium | open |
| Guided sign request | A | Legacy guided controls and fixture do not match current request wizard. | Rebuild against current page and real API seed. | Medium | obsolete/open |
| /terms public page | A | Exact legal copy assertion is stale. | Verify current legal copy/accessibility and update selector. | Low | obsolete/open |
| /privacy public page | A | Exact legal copy assertion is stale. | Verify current legal copy/accessibility and update selector. | Low | obsolete/open |
| UX-001 registration/legal navigation | A | Assumes old exact link labels and back-navigation retention behavior. | Update with current accessible names. | Low | obsolete/open |
| UX-008 notification history | A | Mock-only stale response contract. | Update isolated fixture. | Low | obsolete/open |
| UX-008 notification retry/error | A | Mock-only stale response contract. | Update isolated fixture. | Low | obsolete/open |
| Role nav: super_admin | A | Synthetic `super_admin` local-storage role does not map to clean RBAC seed roles. | Use seeded role/persona fixture. | Medium | obsolete/open |
| Role nav: requester | A | Synthetic role/permissions not current role model. | Use seeded User persona and API-authenticated session. | Medium | obsolete/open |
| Role nav: approver | A | Synthetic role/permissions not current role model. | Use seeded Manager/persona fixture. | Medium | obsolete/open |
| Role nav: signer | A | Synthetic role/permissions not current role model. | Use seeded internal signer persona. | Medium | obsolete/open |
| Role nav mobile overflow | A | Same synthetic super_admin assumption. | Rebuild from real Admin fixture. | Medium | obsolete/open |
| UI simple documents | A (resolved) | Legacy spec hard-coded `secret123`; clean UAT uses credentials supplied through `PLAYWRIGHT_EMAIL` and `PLAYWRIGHT_PASSWORD`. The spec now uses those variables and passes against the seeded Admin. | Keep credentials environment-provided; replace diagnostic-only assertions only when the document UI smoke is formally redesigned. | Medium | resolved |
| UX-011 config guard /login | B (resolved) | The configuration guard remains the intended missing-API-URL fallback. The isolated harness failed to start because Next 16 selected Turbopack while the app has a webpack configuration. | Start the isolated server with `next dev --webpack`; UAT configured startup remains covered by real auth/UI tests. | Low | resolved |
| UX-011 config guard protected route | B (resolved) | Same isolated-harness startup incompatibility. The missing-config guard passes for this protected route once the harness explicitly uses webpack. | Retain both safe-failure assertions. | Low | resolved |
| UX-016 workflow preview localization | A | Fixed mock route/fixture uses stale workflow shape. | Rebuild with clean workflow seed data. | Medium | obsolete/open |
| UX-007 workflow status/retry | A | Fixed request ID and mock state contract; not a real assigned actor flow. | Move to real workflow UAT suite. | Medium | obsolete/open |
| UX-007 workflow unauthorized retry | A | Same fixed-ID/mock assumption. | Cover with real Viewer/tenant-negative test. | Medium | obsolete/open |
| UX-007 workflow state localization | A | Same mock state contract. | Cover in real state-machine UAT suite. | Medium | obsolete/open |

## Confirmed infrastructure remediation

`10c5f57` makes the clean UAT browser stack deterministic: all service URLs use `127.0.0.1`, and login throttling is bypassed only for named seeded E2E accounts. This addresses the observed HTTP 429 failures caused by concurrent legacy tests sharing `admin@acme.local`; it does not bypass production controls.

## Product-bug conclusion so far

The previously reproduced direct-URL session-loss regression is **resolved**. The initial auth hydration effect could write an empty session before it had restored browser storage, while login navigation could happen before React state persistence. `auth-provider.tsx` now restores storage synchronously, suppresses writes until hydration is complete, and writes the successful login session before route navigation. The real seeded UAT regression `auth-session-persistence.spec.ts` passed three sequential Chromium runs covering immediate redirect, direct `/documents`, refresh, same-session new tab, and an isolated context.

Apart from that reproduced direct-URL issue, no D or E issue has yet been proven by this 31-failure baseline. The failures currently establish that the legacy frontend suite is not a release-quality UAT suite. All real business/permission flows still require dedicated browser tests with real PostgreSQL data.
