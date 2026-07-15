# v0.1.0-alpha publication review

## Release candidate

- Source-fix commit: `e7508c4901210eab8f4bcf1d0c7e648636858519`.
- Local filesystem storage is the default. S3-compatible storage and the
  license service remain optional and disabled unless explicitly configured.
- The source is Fair-Code/source-available, not OSI open source. The license,
  commercial terms, trademark notice, and policy copy are internally coherent
  drafts subject to maintainer approval; they are not external legal approval.
- Public ownership and contact details: copyright holder and trademark owner
  Nguyễn Đình Văn; commercial, privacy, and security contact
  vanqn95@gmail.com. Governing law, venue, and contracting legal entity remain
  [TO BE CONFIRMED BY MAINTAINER].
- The signing flow must not be represented as qualified electronic signing,
  PKI service, or PAdES compliance.

## History remediation

- Gitleaks baseline: 279 findings across 118 commits.
- Removed from history: database backup snapshots/private tenant data, obsolete
  LibreSign reference fixtures containing private keys, hard-coded signing/JWT
  helper scripts, stale example JWT secrets, archived token-bearing notes,
  private document/test-output storage, backup archives, and historical private
  documentation paths.
- The remaining documented values are verified placeholders or a CI-only test
  fixture, covered by narrow rules in `.gitleaks.toml`.
- Full-ref scan after the final history rewrite: **PASS**, zero findings.
- A separate full-history content scan found no private-key markers, access-token
  markers, private tenant/contact values, or private storage-path references.
- The historical JWT/signing values were local fixture/example values, not a
  repository-managed deployed credential. They were retired from tracked
  configuration and history. Deployment operators must rotate any value that
  was ever copied from an old example before accepting the rewritten history.

## Fresh-clone verification

Fresh clone of the remediated candidate, using only tracked example environment
files:

- `npm ci` at root, backend, frontend, and license-server: **PASS**.
- `docker compose run --rm backend npx prisma migrate deploy`: **PASS**;
  three migrations applied.
- Backend: 99 tests, lint, and build: **PASS**.
- Frontend: lint, typecheck, and webpack production build: **PASS**.
- `npm run e2e:docker`: **PASS** (exit code 0).
- `npm run e2e:s3`: **PASS** (exit code 0).
- Production dependency audit: no high/critical vulnerability. Frontend has
  two moderate transitive `postcss` advisories; the proposed automatic fix
  downgrades Next to 9 and was not applied.

## Publication approval

Technical release blockers: **None**. No tag or public release is created by
this audit.

Legal/Fair-Code review is a separate, non-technical approval requirement.
