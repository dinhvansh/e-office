# Changelog

All notable changes to FlowDocker E-Office are documented here.

## Unreleased

- Finalized public alpha draft ownership, contact, and trademark information:
  copyright © 2026 Nguyễn Đình Văn. All rights reserved; FlowDocker™ and
  FlowDocker E-Office™ are trademarks of Nguyễn Đình Văn.

### Security

- Authentication requires active users and active tenants.
- External PDF access requires an OTP-verified signing session.
- Signing field writes are restricted to the assigned signer or a shared field
  in the same sign request.

### Reliability

- Signed artifacts move to `artifact_failed` instead of `completed` when PDF
  generation fails.
- Added an outbox event schema and atomic producers for sign-request creation
  and approval rejection.

## v0.1.0-alpha

- Initial public source alpha packaging, draft Fair-Code licensing, commercial
  licensing path and public onboarding/security documentation.
- See `RELEASE-NOTES-v0.1.0-alpha.md` for limitations and release context.
