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

### UX-011 — Make missing frontend API configuration safe and consistent

- **Screen/flow:** `/login` when the frontend API base URL is not configured.
- **Problem:** An unconfigured login displayed `NEXT_PUBLIC_API_BASE_URL environment variable is required`. A direct visit to `/settings/system` then failed hydration with `NEXT_PUBLIC_API_URL environment variable is required` and rendered a blank page. The inconsistent public variable names make a deployment/configuration mistake visible to users as technical detail or an empty screen.
- **Severity:** High.
- **Affected role:** First-time user, support staff, administrator.
- **Evidence:** E2 Playwright invalid-credential submission against the unconfigured local frontend; `protected-settings-system.png` captures the blank route. Re-running with both variables configured redirected the unauthenticated settings route safely to `/login`.
- **Recommended fix:** Consolidate on one documented public API base variable, validate it in startup/deployment checks, and render a safe service-unavailable screen with a support/retry path if configuration is absent; retain diagnostic detail only in developer/server logs.
- **Acceptance criteria:** No public page exposes environment variable names, stack traces or internal endpoint details; one documented variable configures all frontend API clients; missing configuration is caught by deployment health checks; protected routes never render blank because of configuration absence.

### UX-012 — Give pending accounts a localized recovery path

- **Screen/flow:** New-workspace registration followed by `/login`.
- **Problem:** Registration says the account is awaiting administrator approval. Logging in with that same valid account instead shows the raw English message `Account is not active`, without explaining that the account is pending, who can activate it, or what the user should do next.
- **Severity:** High.
- **Affected role:** First-time workspace owner/user awaiting approval.
- **Evidence:** E2 Playwright registration created a pending account, then its login attempt produced the message; see `docs/ux/evidence/login-pending-account.png`.
- **Recommended fix:** Map pending/inactive account codes to localized, user-safe messages with clear next actions. If the tenant has no administrator who can act, provide an appropriate support/contact route without exposing account details.
- **Acceptance criteria:** A pending account receives Vietnamese (or selected locale) copy that says approval is pending; message identifies the next action and support route; disabled/rejected/unknown accounts remain safely distinguishable without account enumeration.

### UX-013 — Prevent the verified external signer from hitting a runtime crash

- **Status: Fixed (browser verified 2026-07-14).** Valid, missing-data, invalid and expired OTP paths were replayed in Playwright. Evidence: `evidence/external-otp-after-fix.png`.

- **Screen/flow:** External `/sign/[token]` after successful OTP verification.
- **Problem:** A valid OTP for the isolated signer produced an “Unhandled Runtime Error” instead of the signing screen: `TypeError: Cannot read properties of undefined (reading 'title')`.
- **Severity:** Critical.
- **Affected role:** External signer.
- **Evidence:** E2 Playwright with an active local sign request and valid audit OTP; see `docs/ux/evidence/external-otp-verified.png`.
- **Recommended fix:** Make the token/signing API response and view contract consistent; render a safe recoverable error if required document data is absent, never a framework error overlay.
- **Acceptance criteria:** Valid OTP reaches the PDF signing surface; missing document data displays a localized recovery state; no client exception, source excerpt, or stack information is rendered; success, expired and invalid OTP cases have browser coverage.

### UX-014 — Preserve the field location selected on the PDF

- **Status: Fixed (browser verified 2026-07-14).** Three non-edge locations persist as normalized coordinates; editor reload and signer rendering agree at desktop and 375 px. Evidence: `evidence/sign-request-editor-mobile-after-fix.png`, `evidence/sign-editor-mobile-restart.png`.

- **Screen/flow:** Sign-request editor `/sign-requests/79/editor`.
- **Problem:** A signature field was placed by clicking inside the PDF and initially showed fractional coordinates near the click. After save, the editor listed the same field at `x 0.000 • y 0.000`, causing it to appear at the top-left rather than the chosen location.
- **Severity:** High.
- **Affected role:** Requester/editor and external signer.
- **Evidence:** E2 Playwright create → editor path; `docs/ux/evidence/sign-request-editor-saved-coordinate.png` and saved-editor browser snapshot.
- **Recommended fix:** Trace the UI-to-API coordinate transform and persistence contract; persist normalized coordinates exactly and validate both dimensions are non-zero when a non-edge click is made.
- **Acceptance criteria:** A field placed at three distinct PDF locations remains at each location after save/reload; coordinates remain correct across zoom and 375 px/desktop viewports; editor and signer preview agree.

### UX-015 — Make super-admin navigation consistent across desktop and mobile

- **Screen/flow:** Super-admin dashboard at desktop and 375 px.
- **Problem:** The authenticated `super_admin` can directly open `/users`, `/roles`, `/document-types`, and `/settings/system`, but desktop sidebar only shows three Workspace links. Mobile shows a different fixed set. This hides needed destinations and makes role navigation unpredictable.
- **Severity:** High.
- **Affected role:** Administrator/super-admin, mobile administrator.
- **Evidence:** E2 `auth-dashboard.png` and `dashboard-mobile-super-admin.png`; direct Playwright navigation to the admin routes succeeded.
- **Recommended fix:** Build desktop and mobile navigation from the same permission-aware model, with a mobile overflow for less-frequent admin destinations.
- **Acceptance criteria:** Super-admin sees every permitted admin destination through both navigation modes; restricted roles do not see unauthorized destinations; desktop/mobile destination sets are intentionally documented and tested.

### UX-016 — Keep approval workflow preview in one consistent Vietnamese locale

- **Screen/flow:** Create sign request with an approval-required document type.
- **Problem:** The workflow preview rendered `Quy trinh phe duyet`, `1 buoc 1`, and `Nguoi dung 3 ngay` while surrounding product copy uses accented Vietnamese. This makes a key confirmation step look unfinished and harder to scan.
- **Severity:** Medium.
- **Affected role:** Requester/administrator.
- **Evidence:** E2 Playwright local audit workflow preview; see `docs/ux/evidence/approval-request-create.png`.
- **Recommended fix:** Move preview labels into the same locale resource/translation path as the rest of the request flow and add a Vietnamese snapshot or UI test.
- **Acceptance criteria:** Approval preview labels are grammatically correct Vietnamese with diacritics; English is used only when the selected locale is English; preview remains readable at 375 px and desktop.

### UX-018 — Give external OTP resend a usable failure and recovery state

- **Screen/flow:** External `/sign/[token]`, “Gửi lại OTP”.
- **Problem:** Resending OTP failed and showed only `🔧 Lỗi hệ thống. Vui lòng thử lại sau.` The flow does not tell the signer whether the request expired, email delivery is unavailable, or what safe next action to take.
- **Severity:** High.
- **Affected role:** External signer.
- **Evidence:** E2 Playwright isolated external signer; `docs/ux/evidence/external-otp-resent.png`.
- **Recommended fix:** Return a stable safe error code and present localized retry/support guidance; pair this with SMTP/delivery readiness monitoring and a resend cooldown/expiry display.
- **Acceptance criteria:** A delivery failure names a safe next action without infrastructure detail; resend state has cooldown and expiry information; valid resend delivers/records an OTP; failure and retry behavior is browser-tested.

## UX-004 / UX-015 verification (Fixed — browser verified 2026-07-14)

- Desktop sidebar and mobile navigation now receive the same permission-filtered group model.
- `super_admin` receives every configured administration destination; requester, approver and signer sessions do not receive unauthorized entries.
- Mobile exposes permitted overflow links through the keyboard-accessible “Thêm” menu. Chromium replay passed at desktop, 768 px and 375 px; an unauthenticated `/users` deep link still redirects to `/login`.
- Evidence: `evidence/ux015-super-admin-desktop-after-fix.png`, `evidence/ux015-super-admin-tablet-after-fix.png`, `evidence/ux015-super-admin-mobile-overflow-after-fix.png`.

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

## Verified fixes — 2026-07-14

- **UX-002 / UX-018:** numeric/autofill/paste OTP input, expiry and resend cooldown feedback, plus stable localized recovery codes.
- **UX-011:** missing API configuration renders a safe localized service-unavailable screen.
- **UX-012:** inactive-account codes map to localized approval/support guidance without revealing account state to unknown users.
- **UX-011:** isolated Chromium verification starts a dedicated server with every API URL variable removed and a dedicated `.next-ux011` directory; `/login` and `/settings/system` render the safe guard at desktop and 375 px.
