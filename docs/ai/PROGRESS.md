# Implementation Progress

## 2026-07-14 — Critical signing and approval blockers

- **UX-013 fixed:** public OTP verification creates a signing session; verified metadata is refreshed before the PDF signing surface is shown. Missing document/request metadata displays a Vietnamese retry state. Playwright covered valid, missing-data, invalid and expired OTP responses.
- **Approval and My Tasks fixed:** approval queries now constrain both `approver_user_id` and document tenant; signing tasks are tenant-scoped. List failures render a retryable error rather than an endless loading state.
- **UX-014 fixed:** PDF field placement uses the rendered canvas bounds and retains normalized coordinates through persistence, reload and signer rendering. Coordinate tests cover three non-edge positions.

Verification evidence is stored in `docs/ux/evidence/`.

## 2026-07-14 — Authentication and OTP recovery

- **UX-002 / UX-018 fixed:** OTP input supports numeric keyboards, browser one-time-code autofill and sanitized six-digit paste. Resend now shows an expiry countdown, cooldown, accessible live feedback and localized recovery for delivery, expiry and attempts errors.
- **UX-011 fixed and browser verified:** the frontend uses one public API base setting and a localized configuration guard prevents blank routes or exposed configuration names. An isolated Playwright server with all API URL variables removed verified `/login` and `/settings/system` at desktop and 375 px.
- **UX-012 fixed:** login maps account and workspace activation codes to localized, non-enumerating recovery guidance.
