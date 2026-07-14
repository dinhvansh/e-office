# UI/UX Backlog

Source: [UI-UX-AUDIT.md](UI-UX-AUDIT.md), 2026-07-14. Evidence labels: **E1** source review, **E2** Playwright runtime, **E3** authenticated-flow limitation; source-informed items require role-based browser replay before implementation.

## P0 — public-beta readiness

### UX-001 — Publish usable legal links from registration

- **Screen/flow:** `/register`.
- **Problem:** A user must accept Terms of Use and Privacy Policy, but both links resolve to `#`. The agreement cannot be reviewed before consent.
- **Severity:** High.
- **Affected role:** First-time user/workspace owner.
- **Evidence:** E2 Playwright accessibility snapshot of `/register` shows both links with `/url: "#"`; see `docs/ux/evidence/register-mobile-375.png`.
- **Recommended fix:** Publish versioned Terms and Privacy pages, link to them from registration, and record the accepted policy version with the registration where required by policy.
- **Acceptance criteria:** Both links resolve to accessible, non-placeholder pages; pages work at mobile width; acceptance copy identifies the current policy version/effective date; registration remains keyboard-operable.

### UX-002 — Make external OTP signing recoverable and mobile-friendly

- **Screen/flow:** `/sign/[token]` external signing.
- **Problem:** A single plain text OTP input accepts six digits but lacks `inputMode="numeric"`, one-time-code autocomplete, paste/autofocus segmentation, resend cooldown/expiry countdown, remaining-attempt guidance, and a durable inline error/recovery region.
- **Severity:** High.
- **Affected role:** External signer.
- **Evidence:** E1: `frontend/app/sign/[token]/page.tsx` OTP form and resend button; E3 browser/OTP email replay unavailable.
- **Recommended fix:** Use a labelled numeric OTP control with paste support, `autoComplete="one-time-code"`, inline `aria-live` feedback, a visible resend countdown and server-provided expiry/attempt information.
- **Acceptance criteria:** Mobile numeric keyboard opens; a pasted six-digit OTP validates; resend is disabled while cooling down; expiry/invalid states explain the next action; keyboard and screen-reader-only completion is tested.

### UX-003 — Provide accessible PDF signing-field interaction

- **Screen/flow:** Internal signing and signed-field completion.
- **Problem:** Signature uses a canvas/pointer interaction and modal inputs/buttons do not expose a complete dialog/focus/keyboard contract. Fields displayed on the PDF do not provide a clear accessible field list or progress alternative.
- **Severity:** High.
- **Affected role:** Internal signer and accessibility-tool users.
- **Evidence:** E1: `frontend/components/pdf/PDFSigningViewer.tsx` canvas signature modal and overlay fields; E3 no interactive browser test.
- **Recommended fix:** Add a labelled signing-field list, keyboard focus order, semantic dialog, visible focus, text alternative for each field, and an accessible signature method consistent with product/legal policy.
- **Acceptance criteria:** All required fields are discoverable and completable without a mouse; focus is trapped/restored in dialogs; field completion status is announced; signature and PDF preview work at 200% zoom.

## P1 — high-priority experience and safety

### UX-004 — Align mobile navigation with role permissions

- **Screen/flow:** Dashboard mobile navigation.
- **Problem:** Desktop navigation uses permission filtering, while `MOBILE_NAV_ITEMS` is a fixed list with no permission filtering; users can see entries they cannot use or lose access to their most relevant permitted area.
- **Severity:** High.
- **Affected role:** All mobile users, particularly restricted roles.
- **Evidence:** E1: `frontend/app/(dashboard)/layout.tsx` calls `filterSidebarByPermissions`; `frontend/components/ui/mobile-nav.tsx` uses static items only.
- **Recommended fix:** Derive mobile items from the same authorization-aware navigation model and add a safe overflow/menu path for permitted areas.
- **Acceptance criteria:** Each tested role sees only permitted mobile destinations; each desktop-available primary destination has an intentional mobile path; deep links still enforce server authorization.

### UX-005 — Break sign-request setup into guided, recoverable steps

- **Screen/flow:** `/sign-requests/create`.
- **Problem:** Upload, document type, workflow rules/customization and signer configuration occupy a single dense form. Validation happens late, making it difficult to understand readiness or recover from a missing prerequisite.
- **Severity:** High.
- **Affected role:** Requester/administrator.
- **Evidence:** E1: `frontend/app/(dashboard)/sign-requests/create/page.tsx` includes upload, document type, workflow modes, customization and `SignersSection` in one page.
- **Recommended fix:** Introduce a clear stepper with readiness summary, per-step validation, preserved draft values, and a final review screen. Start frontend-only; scope autosave separately.
- **Acceptance criteria:** A user can identify the current step and blocking field; leaving/returning preserves entered client state; review shows file, workflow and all signers before submit; invalid fields have inline errors.

### UX-006 — Replace native destructive confirmations

- **Screen/flow:** Users, roles, documents, positions, external organizations, sign requests, document types and signer management.
- **Problem:** Destructive actions use browser-native `confirm()`, producing inconsistent styling, copy, focus behavior and no opportunity to state permanent consequences.
- **Severity:** High.
- **Affected role:** Administrator, requester, document manager.
- **Evidence:** E1: `confirm()` found in `users/page.tsx`, `roles/page.tsx`, `documents/page.tsx`, `positions/page.tsx`, `external-orgs/page.tsx`, `sign-requests/page.tsx`, `document-types/page.tsx`, and `ManageSignersDialog.tsx`.
- **Recommended fix:** Standardize on the existing accessible dialog primitive with action-specific consequence copy, destructive button styling, pending state and focus restoration.
- **Acceptance criteria:** No product destructive action uses native `confirm()`; dialogs identify the target and irreversible consequence; Escape/cancel are safe; focus returns to the invoking control; double-submit is prevented.

### UX-007 — Make status tracking answer “what happens next?”

- **Screen/flow:** Sign-request/document detail, approval and task pages.
- **Problem:** State badges exist, including `artifact_failed`, but the user does not consistently receive the current owner, required next action, deadline or expected artifact completion context.
- **Severity:** Medium.
- **Affected role:** Requester, approver, signer, administrator.
- **Evidence:** E1: `frontend/app/(dashboard)/sign-requests/[id]/page.tsx` maps status and exposes artifact retry; E3 workflow replay unavailable.
- **Recommended fix:** Add a status timeline and contextual action panel driven by stable status/next-action API fields.
- **Acceptance criteria:** Every state has plain-language label, actor/owner, next action and deadline/ETA when applicable; artifact failure explains retry eligibility; no raw internal enum is shown.

### UX-008 — Complete and verify the notification destination

- **Screen/flow:** Notification bell/dropdown.
- **Problem:** The footer links to `/notifications`, while no `app/**/notifications/page.tsx` route was found in the initial mapping. Loading is a generic spinner without an accessible loading announcement.
- **Severity:** Medium.
- **Affected role:** All authenticated users.
- **Evidence:** E1: `frontend/components/notifications/NotificationDropdown.tsx`; route scan of `frontend/app` found no notifications page.
- **Recommended fix:** Provide a tested notification-history destination or remove the unsupported link, and add an accessible loading/empty/read-state pattern.
- **Acceptance criteria:** “View all notifications” resolves to a working route; empty/loading/read/unread states are readable; mark-read/delete actions show a result and are keyboard-operable.

### UX-009 — Standardize loading, empty, error and success recovery

- **Screen/flow:** Dashboard, list pages, notifications and mutation forms.
- **Problem:** Dashboard/roles use skeletons and empty states, but notifications use a spinner and many mutation failures only use transient toasts. Users can lose error context before correcting a field or retrying.
- **Severity:** Medium.
- **Affected role:** All roles.
- **Evidence:** E1: dashboard and roles import `Skeleton`/`EmptyState`; `NotificationDropdown.tsx` has spinner-only loading; create request and external signing use toast-driven errors.
- **Recommended fix:** Define shared async-state standards: skeletons for structured content, persistent inline errors near failed actions, retry affordances, and `aria-live` success/error messaging.
- **Acceptance criteria:** Each audited flow has loading, empty, error and success states; errors name a recovery action; retries keep safe form values; screen-reader announcements are testable.

### UX-010 — Improve keyboard labels, focus, and responsive controls

- **Screen/flow:** Dashboard header/sidebar, mobile nav, PDF viewer and image controls.
- **Problem:** Icon-only controls rely on title or no accessible label, and responsive behavior has not been browser-tested. The PDF signature image uses generic alt text; multiple source `<img>` uses also appear in lint findings.
- **Severity:** Medium.
- **Affected role:** Keyboard-only, screen-reader and mobile users.
- **Evidence:** E1: dashboard layout icon buttons, `mobile-nav.tsx`, and `PDFSigningViewer.tsx`; E3 no viewport/browser audit.
- **Recommended fix:** Add meaningful accessible names, visible focus states, appropriate image alt text, responsive overflow tests, and a keyboard test matrix.
- **Acceptance criteria:** All icon-only controls have accessible names; focus is visible at keyboard navigation; 375 px and 768 px screenshots have no obscured primary action; PDF fields have meaningful labels.

### UX-011 — Do not expose local configuration variable names in login errors

- **Screen/flow:** `/login` when the frontend API base URL is not configured.
- **Problem:** A failed sign-in displayed `NEXT_PUBLIC_API_BASE_URL environment variable is required` below the generic failure heading. This is technical deployment detail, not an actionable user message.
- **Severity:** Medium.
- **Affected role:** First-time user, support staff.
- **Evidence:** E2 Playwright invalid-credential submission against the unconfigured local frontend. Re-running the frontend with its local API base configured correctly showed the safe message “Email hoặc mật khẩu không đúng”.
- **Recommended fix:** Validate required public runtime configuration at startup/deployment and show a generic service-unavailable message with a support/retry path if configuration is absent; log diagnostic detail only server-side/developer-side.
- **Acceptance criteria:** No public page exposes environment variable names, stack traces or internal endpoint details; a missing configuration condition is observable in deployment health checks; the UI gives a non-sensitive retry/support action.

## Implementation classification

| Frontend-only | Requires/benefits from backend/API |
| --- | --- |
| UX-001 legal pages/links, UX-003 baseline, UX-004, UX-005 stepper baseline, UX-006, UX-009 visual states, UX-010 | UX-002 resend/expiry/attempt metadata, UX-005 durable drafts, UX-007 next-action/SLA data, UX-008 paginated notification history |

## Verification checklist for every backlog item

- Test requester, approver, signer and administrator permissions.
- Test keyboard-only path and visible focus.
- Test at 375 px, 768 px and desktop widths.
- Validate Vietnamese and English copy intentionally, including mobile rendering.
- Capture before/after screenshots and link them from the implementation PR.
- Preserve existing authorization and signing security behavior.
