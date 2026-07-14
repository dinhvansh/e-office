# E-Office UI/UX Audit

Date: 2026-07-14
Scope: initial source review plus Playwright runtime review; no production code was changed.

## Evidence and confidence

- **E1 — source review:** application routes, navigation, signing, and shared UI components were mapped in the initial review.
- **E2 — Playwright runtime:** Chromium ran the configured local application at `http://localhost:3000`; public authentication routes, invalid external-sign link, keyboard order, mobile registration, and unauthenticated redirects for `/`, `/documents`, `/sign-requests/create`, `/approvals`, `/my-tasks`, and `/settings/system` were exercised. Screenshots: [`login-desktop.png`](evidence/login-desktop.png), [`register-mobile-375.png`](evidence/register-mobile-375.png), [`external-sign-invalid-token.png`](evidence/external-sign-invalid-token.png), and [`protected-settings-system.png`](evidence/protected-settings-system.png).
- **E3 — authenticated-flow limitation:** a fresh workspace registration correctly remains pending administrator approval. No approved requester, approver, internal signer, external signer, or administrator test account was available, so those flows remain source-informed and need a role-based browser replay.

## Overall assessment

**Overall UX score: 5.8 / 10 (medium confidence).** The public login, registration and reset-password screens render clear Vietnamese copy at desktop and 375 px, and registration has a distinct pending-approval success state. The product has a meaningful route surface, permission-filtered desktop navigation, reusable skeleton/empty-state primitives, and an explicit external signing flow. Signing/PDF interactions, role-aware mobile navigation, and authenticated workflow clarity still need a role-based browser replay before public beta.

| Major flow | Score | Assessment |
| --- | ---: | --- |
| Login and first entry | 7.0 | Login, registration, password reset and pending-registration confirmation render correctly in Playwright; legal links and missing-environment error handling need work. |
| Dashboard and navigation | 5.5 | Permission-aware desktop sidebar and dashboard skeletons exist; mobile role behavior still needs an authenticated browser replay. |
| Create sign request | 5.5 | Covers document, workflow and signer setup, but is a long, dense, one-page decision flow. |
| Approval workflow | 6.0 | Dedicated approval/task routes and status UI exist; action context needs validation in a browser. |
| Internal signing | 4.5 | PDF signing fields rely on pointer/canvas interaction without an equivalent keyboard path. |
| External signing with OTP | 4.5 | Invalid-token state is compact and readable; real OTP validation, retry and expiry need a test invitation. |
| Document detail and tracking | 6.0 | Status badges and artifact retry exist; next action and timeline clarity need browser confirmation. |
| Notifications | 4.5 | Bell/dropdown, loading and empty state exist; a full notification-history route needs browser/API confirmation. |
| Admin/settings | 5.5 | Broad configuration surface with permission-filtered desktop entry; destructive confirms are inconsistent. |
| Mobile, responsive and accessibility | 5.0 | The public registration screen fits and remains legible at 375 px; signed-in navigation, dialogs and signing controls need remediation and browser validation. |

## Flows and screens mapped

| Flow | Routes/components inspected | Evidence |
| --- | --- | --- |
| Authentication | `/login`, `/forgot-password`, `/register` | E2: Playwright desktop/mobile snapshots; valid pending-registration success and invalid-credential failure |
| Dashboard/navigation | `/`, dashboard layout, `sidebarItems.ts`, `mobile-nav.tsx` | E1 |
| Documents and requests | `/documents`, `/sign-requests`, `/sign-requests/create`, `/sign-requests/[id]`, editor and sign routes | E1 |
| Approval/work | `/approvals`, `/approvals/[id]`, `/my-tasks` | E1 |
| Internal/external signing | internal/sign routes, `/sign/[token]`, `PDFSigningViewer.tsx` | E1; E2 invalid external token state |
| Tracking/audit | request detail, `/documents/[id]/flow`, `/audit/[documentId]` | E1 |
| Notifications | `NotificationBell`, `NotificationDropdown`, `NotificationItem` | E1 |
| Administration | users, roles, departments, positions, types, workflows, webhooks, tenant/system/billing settings | E1 |

## What is working well

- The desktop sidebar is filtered through `filterSidebarByPermissions`, which checks each menu item’s required permissions.
- The dashboard and role-management views use shared `Skeleton` and `EmptyState` components.
- External signing validates the OTP as six digits and disables verification while processing.
- Sign-request detail exposes a retry action when the artifact state is `artifact_failed`.
- The shared Radix dialog foundation provides a focus-ring treatment for its close control.
- Public Vietnamese copy was verified visually on login and registration; the earlier source-encoding concern was not reproduced in the running application.
- Registration clearly explains that a new workspace/account is pending administrator approval and retains the registered email/workspace in the confirmation.
- With both required local API variables supplied, all six sampled unauthenticated protected routes redirected to `/login` after hydration.

## Top 10 UX problems

1. **UX-001:** Registration’s Terms of Use and Privacy Policy links resolve to `#`, leaving a public user unable to read the agreement they must accept (High).
2. **UX-002:** External OTP is a single free-text input with no numeric mobile keypad, paste/autofocus segmentation, resend timer, or remaining-attempt feedback (High).
3. **UX-003:** Signing PDF field completion is pointer/canvas-centric and lacks keyboard semantics and accessible labels (High).
4. **UX-004:** Mobile bottom navigation is fixed and not permission-filtered, unlike the desktop sidebar (High).
5. **UX-005:** Creation of a sign request combines upload, classification, workflow selection/customization and signer setup in one dense flow (High).
6. **UX-006:** Destructive actions use browser-native `confirm()` in many screens rather than a consistent, accessible application dialog (High).
7. **UX-007:** Status tracking shows state but does not consistently identify the owner, required next action, or expected completion time (Medium).
8. **UX-008:** Notification history needs route/API confirmation; the dropdown’s “View all” destination was not verified in an authenticated browser session (Medium).
9. **UX-009:** Loading and error recovery patterns are inconsistent: some screens use skeletons; notifications use a spinner; many operations depend on transient toasts (Medium).
10. **UX-010:** Several interactive icon controls and signing inputs do not expose accessible names/instructions; image usage also lacks a consistent optimized/accessible strategy (Medium).
11. **UX-011:** Inconsistent required API environment-variable names can expose raw technical errors and render a settings route blank (High).

## Critical issues required before public beta

No Critical issue was confirmed in the public Playwright run. The following High issues should be completed or browser-verified before public beta: UX-001, UX-002, UX-003, UX-004, UX-005, UX-006 and UX-011.

## Suggested implementation order

1. **P0 public onboarding, runtime failure handling and signing accessibility:** UX-001, UX-011, UX-002, UX-003.
2. **P1 navigation and safety:** UX-004, UX-006, UX-008.
3. **P1 completion clarity:** UX-005, UX-007, UX-009.
4. **P2 consistency polish:** UX-010 and responsive/table refinements after device-based replay.

## Backend/API dependencies

| Item | Needs backend/API change? | Reason |
| --- | --- | --- |
| UX-001 legal links | No | Publish valid legal routes/documents and link them from registration. |
| UX-002 OTP clarity | Possibly | A resend cooldown, expiry timestamp and remaining attempts should come from a stable API contract. |
| UX-003 accessible signing | No for baseline | Keyboard alternatives and labels can be frontend-only; server-side signature policy must remain unchanged. |
| UX-004 mobile permission filtering | No | Reuse current client permission data. |
| UX-005 request creation | No for initial stepper | Draft persistence/autosave would require API support. |
| UX-006 confirmation dialogs | No | Replace UI confirmation pattern only. |
| UX-007 next-action/status | Likely | Reliable `next_action`, actor and SLA/expiry information should be returned by the detail API. |
| UX-008 notification route | Possibly | A dedicated page needs pagination/history API if not already available. |
| UX-009 recovery states | No for visual states | Retry metadata/errors may need stable API codes. |
| UX-011 configuration failure handling | No business API change | Consolidate the public API base configuration and fail with a safe startup/deployment message. |

## Audit follow-up

Before closing the remaining authenticated findings, replay the listed flows in Chromium at desktop and 375 px / 768 px widths with approved requester, approver, signer and administrator accounts. Capture screenshots for each high-severity item and test real OTP delivery, keyboard-only signing, screen-reader labels, and destructive confirmation focus restoration.
