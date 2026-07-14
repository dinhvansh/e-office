# E-Office UI/UX Audit

Date: 2026-07-14
Scope: frontend source review and local runtime baseline only; no production code was changed.

## Evidence and confidence

- **E1 — source review:** all application routes, navigation, signing, and shared UI components were inspected.
- **E2 — local runtime:** `http://localhost:3200/login` and `http://localhost:4000/health` returned HTTP 200.
- **E3 — limitation:** browser automation had no available browser session in this environment. Therefore screenshots, authenticated walkthroughs, viewport screenshots, and real OTP delivery could not be captured. Findings that need visual confirmation are marked **source-informed** and should be replayed in a browser before implementation.

## Overall assessment

**Overall UX score: 5.4 / 10 (medium confidence).** The product has a meaningful route surface, permission-filtered desktop navigation, reusable skeleton/empty-state primitives, and an explicit external signing flow. However, widespread broken Vietnamese text encoding is visible in high-traffic screens and makes essential instructions unreadable. Signing/PDF interactions also need stronger accessibility and recovery guidance before a public beta.

| Major flow | Score | Assessment |
| --- | ---: | --- |
| Login and first entry | 5.0 | Route is reachable and error copy is defined, but encoding and incomplete first-run guidance undermine recovery. |
| Dashboard and navigation | 5.5 | Permission-aware desktop sidebar and dashboard skeletons exist; text corruption and mobile role mismatch remain. |
| Create sign request | 5.5 | Covers document, workflow and signer setup, but is a long, dense, one-page decision flow. |
| Approval workflow | 6.0 | Dedicated approval/task routes and status UI exist; action context needs validation in a browser. |
| Internal signing | 4.5 | PDF signing fields rely on pointer/canvas interaction without an equivalent keyboard path. |
| External signing with OTP | 4.0 | OTP validation exists, but user-facing instructions are visibly mojibake and retry/expiry context is thin. |
| Document detail and tracking | 6.0 | Status badges and artifact retry exist; next action and timeline clarity need browser confirmation. |
| Notifications | 4.5 | Bell/dropdown, loading and empty state exist; copy is corrupted and there is no discovered `/notifications` page route. |
| Admin/settings | 5.5 | Broad configuration surface with permission-filtered desktop entry; destructive confirms are inconsistent. |
| Mobile, responsive and accessibility | 4.0 | Responsive classes and bottom nav exist, but fixed generic mobile navigation, unlabeled icon buttons and signing controls need remediation. |

## Flows and screens mapped

| Flow | Routes/components inspected | Evidence |
| --- | --- | --- |
| Authentication | `/login`, `/forgot-password`, `/reset-password`, `/register` | E1, E2 login HTTP 200 |
| Dashboard/navigation | `/`, dashboard layout, `sidebarItems.ts`, `mobile-nav.tsx` | E1 |
| Documents and requests | `/documents`, `/sign-requests`, `/sign-requests/create`, `/sign-requests/[id]`, editor and sign routes | E1 |
| Approval/work | `/approvals`, `/approvals/[id]`, `/my-tasks` | E1 |
| Internal/external signing | internal/sign routes, `/sign/[token]`, `PDFSigningViewer.tsx` | E1 |
| Tracking/audit | request detail, `/documents/[id]/flow`, `/audit/[documentId]` | E1 |
| Notifications | `NotificationBell`, `NotificationDropdown`, `NotificationItem` | E1 |
| Administration | users, roles, departments, positions, types, workflows, webhooks, tenant/system/billing settings | E1 |

## What is working well

- The desktop sidebar is filtered through `filterSidebarByPermissions`, which checks each menu item’s required permissions.
- The dashboard and role-management views use shared `Skeleton` and `EmptyState` components.
- External signing validates the OTP as six digits and disables verification while processing.
- Sign-request detail exposes a retry action when the artifact state is `artifact_failed`.
- The shared Radix dialog foundation provides a focus-ring treatment for its close control.

## Top 10 UX problems

1. **UX-001:** Broken Vietnamese character encoding on navigation, external OTP, notifications and PDF signing (Critical).
2. **UX-002:** External OTP is a single free-text input with no numeric mobile keypad, paste/autofocus segmentation, resend timer, or remaining-attempt feedback (High).
3. **UX-003:** Signing PDF field completion is pointer/canvas-centric and lacks keyboard semantics and accessible labels (High).
4. **UX-004:** Mobile bottom navigation is fixed and not permission-filtered, unlike the desktop sidebar (High).
5. **UX-005:** Creation of a sign request combines upload, classification, workflow selection/customization and signer setup in one dense flow (High).
6. **UX-006:** Destructive actions use browser-native `confirm()` in many screens rather than a consistent, accessible application dialog (High).
7. **UX-007:** Status tracking shows state but does not consistently identify the owner, required next action, or expected completion time (Medium).
8. **UX-008:** Notification copy is corrupted and the dropdown links to `/notifications`, but no corresponding app route was found (Medium).
9. **UX-009:** Loading and error recovery patterns are inconsistent: some screens use skeletons; notifications use a spinner; many operations depend on transient toasts (Medium).
10. **UX-010:** Several interactive icon controls and signing inputs do not expose accessible names/instructions; image usage also lacks a consistent optimized/accessible strategy (Medium).

## Critical issues required before public beta

- **UX-001 — repair text encoding everywhere.** Any authentication, signing, navigation or notification message must render as valid Vietnamese or intentionally selected English. This is release-blocking because an external signer cannot reliably understand OTP or signature instructions.

The following High issues should be completed in the same beta-readiness tranche: UX-002, UX-003, UX-004, UX-005 and UX-006.

## Suggested implementation order

1. **P0 UX copy and signing accessibility:** UX-001, UX-002, UX-003.
2. **P1 navigation and safety:** UX-004, UX-006, UX-008.
3. **P1 completion clarity:** UX-005, UX-007, UX-009.
4. **P2 consistency polish:** UX-010 and responsive/table refinements after device-based replay.

## Backend/API dependencies

| Item | Needs backend/API change? | Reason |
| --- | --- | --- |
| UX-001 text encoding | No | Source encoding/copy correction. |
| UX-002 OTP clarity | Possibly | A resend cooldown, expiry timestamp and remaining attempts should come from a stable API contract. |
| UX-003 accessible signing | No for baseline | Keyboard alternatives and labels can be frontend-only; server-side signature policy must remain unchanged. |
| UX-004 mobile permission filtering | No | Reuse current client permission data. |
| UX-005 request creation | No for initial stepper | Draft persistence/autosave would require API support. |
| UX-006 confirmation dialogs | No | Replace UI confirmation pattern only. |
| UX-007 next-action/status | Likely | Reliable `next_action`, actor and SLA/expiry information should be returned by the detail API. |
| UX-008 notification route | Possibly | A dedicated page needs pagination/history API if not already available. |
| UX-009 recovery states | No for visual states | Retry metadata/errors may need stable API codes. |

## Audit follow-up

Before prioritizing visual polish, replay the ten listed flows in Chromium at desktop and 375 px / 768 px widths with at least requester, approver, signer and administrator accounts. Capture screenshots for each high-severity item and test real OTP delivery, keyboard-only signing, screen-reader labels, and destructive confirmation focus restoration.
