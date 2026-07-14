# Implementation Progress

## 2026-07-14 — Critical signing and approval blockers

- **UX-013 fixed:** public OTP verification creates a signing session; verified metadata is refreshed before the PDF signing surface is shown. Missing document/request metadata displays a Vietnamese retry state. Playwright covered valid, missing-data, invalid and expired OTP responses.
- **Approval and My Tasks fixed:** approval queries now constrain both `approver_user_id` and document tenant; signing tasks are tenant-scoped. List failures render a retryable error rather than an endless loading state.
- **UX-014 fixed:** PDF field placement uses the rendered canvas bounds and retains normalized coordinates through persistence, reload and signer rendering. Coordinate tests cover three non-edge positions.

Verification evidence is stored in `docs/ux/evidence/`.
