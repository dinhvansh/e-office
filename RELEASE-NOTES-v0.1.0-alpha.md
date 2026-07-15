# E-Office v0.1.0-alpha

> Pre-release. Not for regulated production signing without separate legal and
> technical assessment.

## Highlights

- Document workflow, approvals, internal/external signing, outbox delivery,
  local storage and optional S3-compatible storage.
- Next 16 / React 19 frontend migration and public-source packaging.
- Security hardening for refresh-token replay, webhook SSRF and Unicode PDF
  watermarks.

## Before trying it

Use the Docker quick start and example environment files. Set strong secrets,
SMTP and storage configuration yourself. Demo seeding requires an explicit
`DEMO_ADMIN_PASSWORD`; no production default credentials exist.

The signing workflow is not a claim of qualified electronic signature, PKI
service, or PAdES compliance. Use approved certificates, key management, and
legal/compliance controls for any regulated deployment.

## Licensing

Source is available under draft Fair-Code/community terms. It is not OSI open
source. Redistribution, white-labeling and hosted resale require a commercial
license, subject to legal review.
