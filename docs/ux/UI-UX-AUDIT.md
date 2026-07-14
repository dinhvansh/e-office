# E-Office UI/UX Audit

Date: 2026-07-14
Scope: initial source review plus Playwright runtime review; no production code was changed.

## Evidence and confidence

- **E1 — source review:** application routes, navigation, signing, and shared UI components were mapped in the initial review.
- **E2 — Playwright runtime:** Chromium ran the configured local application at `http://localhost:3000`; public authentication routes, pending-account login, invalid external-sign link, keyboard order, mobile registration, unauthenticated redirects, super-admin dashboard/admin surfaces, sign-request creation/editor, an external OTP resend failure, and an OTP-success crash were exercised. Key screenshots: [`dashboard-super-admin.png`](evidence/auth-dashboard.png), [`sign-request-create-configured.png`](evidence/auth-sign-requests-create.png), [`sign-request-editor-saved-coordinate.png`](evidence/sign-request-editor-saved-coordinate.png), [`external-otp-verified.png`](evidence/external-otp-verified.png), and [`dashboard-mobile-super-admin.png`](evidence/dashboard-mobile-super-admin.png).
- **E3 — remaining limitation:** requester, approver and internal-signer role variants remain untested. The super-admin and isolated external-signer paths were tested with database records created solely in the local audit tenant.

## Overall assessment

## Critical blocker remediation — 2026-07-14

- **UX-002, UX-011, UX-012 and UX-018 — Fixed and browser verified:** OTP now supports numeric/autofill/paste input, expiry and resend cooldown feedback, and safe localized recovery states. Missing API configuration renders a service-unavailable screen, while inactive account codes receive localized activation guidance.

- **UX-013 — Fixed and browser verified:** the verified OTP session is now included in the public-sign contract, the client refreshes verified metadata before opening the signing surface, and absent document/request data renders a Vietnamese retry state rather than a runtime overlay. Playwright covered valid, missing-data, invalid and expired OTP responses; see `evidence/external-otp-after-fix.png`.
- **Approval list / My Tasks — Fixed and browser verified:** pending approvals are filtered by both assigned approver and document tenant; the combined task query scopes signing requests by tenant. React Query failures now produce an inline retry state instead of an indefinite loading message. See `evidence/approvals-after-fix.png` and `evidence/my-tasks-after-fix.png`.
- **UX-014 — Fixed and browser verified:** PDF field insertion now uses the rendered canvas rectangle, so display zoom and responsive sizing cannot collapse non-edge click coordinates to `0,0`. Editor reload and signer rendering consume the same normalized values. Desktop and 375 px captures: `evidence/sign-request-editor-mobile-after-fix.png` and `evidence/sign-editor-mobile-restart.png`.

Runtime supplement: An isolated approver could authenticate, but its locally
seeded pending approval did not appear in `Phê duyệt của tôi` (all counters
remained zero), and `Công việc của tôi` remained at `Đang tải...`; therefore
an approve/reject action could not be replayed. The approval-required request
preview also rendered unaccented Vietnamese labels. This is evidence of an
incomplete runtime path, not attributed to user error.

Supporting approver captures: `approvals-pending-task.png` shows the empty
approval counters for the isolated approver, and `approver-my-tasks.png` shows
the persistent loading state.

**Overall UX score: 4.9 / 10 (medium confidence).** Public authentication screens render clear Vietnamese copy at desktop and 375 px, and empty states are generally understandable. However, a valid external OTP causes a runtime crash before signing, API configuration gaps can blank a protected route, and the navigation/status model differs across desktop and mobile. These must be corrected before public beta.

| Major flow | Score | Assessment |
| --- | ---: | --- |
| Login and first entry | 6.0 | Registration and reset-password surfaces render correctly, but a pending account receives raw English status copy with no recovery guidance when it attempts login. |
| Dashboard and navigation | 4.5 | Empty dashboard is understandable, but a super-admin sees only three desktop sidebar destinations while direct admin routes work; mobile shows a different fixed set. |
| Create sign request | 5.0 | End-to-end creation and editor transition work, but configuration is dense and the UI does not direct an admin with no document types to the prerequisite screen. |
| Approval workflow | 6.0 | Dedicated approval/task routes and status UI exist; action context needs validation in a browser. |
| Internal signing | 4.5 | PDF signing fields rely on pointer/canvas interaction without an equivalent keyboard path. |
| External signing with OTP | 2.0 | Invalid-token state is readable, but resend gives a generic system error and a valid OTP crashes the page before signing. |
| Document detail and tracking | 5.0 | Editor shows participant/field counts and request status, but saved field coordinates became `0,0` after a click elsewhere and mobile dashboard displays raw `pending_signature`. |
| Notifications | 4.5 | Bell/dropdown, loading and empty state exist; a full notification-history route needs browser/API confirmation. |
| Admin/settings | 5.5 | Broad configuration surface with permission-filtered desktop entry; destructive confirms are inconsistent. |
| Mobile, responsive and accessibility | 4.5 | Public registration fits at 375 px, but authenticated mobile navigation omits admin destinations and dashboard exposes raw internal status values. |

## Flows and screens mapped

| Flow | Routes/components inspected | Evidence |
| --- | --- | --- |
| Authentication | `/login`, `/forgot-password`, `/register` | E2: Playwright desktop/mobile snapshots; valid pending-registration success and invalid-credential failure |
| Dashboard/navigation | `/`, `/documents`, `/sign-requests`, `/approvals`, `/my-tasks`, `/settings/system`, `/users`, `/roles` | E2 super-admin desktop/mobile plus E1 |
| Documents and requests | `/documents`, `/sign-requests`, `/sign-requests/create`, `/sign-requests/79/editor` | E2 isolated audit request creation/editor plus E1 |
| Approval/work | `/approvals`, `/approvals/[id]`, `/my-tasks` | E2 empty-state routes plus E1 |
| Internal/external signing | internal/sign routes, `/sign/[token]`, `PDFSigningViewer.tsx` | E2 external invalid token, resend and OTP-success error; E1 internal |
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
- An isolated request was created through the full upload → type → external signer → editor → send path; its editor correctly showed field and participant counts before submission.

## Top 10 UX problems

1. **UX-013:** A valid external OTP produces an unhandled runtime error before signing (Critical).
2. **UX-011:** Inconsistent required API environment-variable names can expose raw technical errors and render a settings route blank (High).
3. **UX-012:** A pending user gets raw English “Account is not active” after an otherwise clear Vietnamese pending-approval registration flow (High).
4. **UX-015:** Super-admin desktop and mobile navigation omit direct admin destinations despite those routes working (High).
5. **UX-014:** A signature field placed on the PDF persisted at `x=0, y=0`, not at the selected location (High).
6. **UX-018:** OTP resend fails with a generic system error and no actionable recovery guidance (High).
7. **UX-001:** Registration’s Terms of Use and Privacy Policy links resolve to `#` (High).
8. **UX-002:** External OTP is a single free-text input with no numeric mobile keypad, paste/autofocus segmentation, resend timer, or remaining-attempt feedback (High).
9. **UX-005:** Creation of a sign request combines upload, classification, workflow selection/customization and signer setup in one dense flow (High).
10. **UX-009:** Loading and error recovery patterns are inconsistent across list and mutation flows (Medium).

## Critical issues required before public beta

- **UX-013 — external OTP success must not crash.** A verified external signer cannot reach the signing surface, so this is release-blocking.

The following High issues should be completed or browser-verified before public beta: UX-001, UX-002, UX-003, UX-005, UX-006, UX-011, UX-012, UX-014, UX-015 and UX-018.

## Suggested implementation order

1. **P0 external signing and runtime failure handling:** UX-013, UX-011, UX-014, UX-018.
2. **P0 onboarding/account state:** UX-001, UX-012, UX-002.
3. **P1 navigation and safety:** UX-015, UX-004, UX-006, UX-008.
4. **P1 completion clarity:** UX-005, UX-007, UX-009.
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
| UX-012 pending-account recovery | Possibly | Prefer a stable user/account status code and an activation/support path returned by the auth API. |
| UX-013 external OTP success crash | Yes | The sign-token response must include the document data expected by the signing view, or the view must handle its absence safely. |
| UX-014 saved signature coordinate | Possibly | Verify API field-coordinate serialization and the PDF coordinate transform together. |
| UX-015 role-aware navigation | No | Reuse current role/permission data consistently in desktop and mobile navigation. |
| UX-016 approval-preview language consistency | No | Correct localized frontend copy and add locale rendering coverage. |
| UX-018 OTP resend recovery | Yes | Return a safe, specific delivery/configuration status and make SMTP readiness observable. |

## Audit follow-up

Before closing the remaining authenticated findings, replay the listed flows in Chromium at desktop and 375 px / 768 px widths with approved requester, approver, signer and administrator accounts. Capture screenshots for each high-severity item and test real OTP delivery, keyboard-only signing, screen-reader labels, and destructive confirmation focus restoration.
