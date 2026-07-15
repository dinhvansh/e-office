# Final security review (release gates in progress)

## Fixed

- Refresh sessions now carry a `family_id`; replay of a rotated refresh token
  revokes all still-active sessions in that family. Legacy sessions are
  backfilled safely to a single-session family.
- Outbound webhooks reject loopback, private, link-local and DNS-resolved
  private targets. Redirects are disabled.
- PDF watermarks embed the configured Unicode Noto Sans font, including
  Vietnamese text, rather than PDF standard fonts.
- `npm audit --omit=dev` reports zero vulnerabilities for backend and the
  license server after dependency updates.
- Frontend is migrated to Next 16.2.10 and React 19.2.4. Its build uses
  webpack explicitly because the existing `canvas`/`encoding` aliases are a
  webpack configuration.
- Docker E2E cleanup is idempotent and also runs on SIGINT/SIGTERM.

## Verification completed

- Backend tests: 101 passing, including refresh replay, webhook SSRF and
  Unicode watermark regression coverage.
- Backend build: passing.
- Frontend lint, typecheck and production build: passing.
- Docker workflow E2E and MinIO/S3 workflow E2E: passing with exit code 0.

## Deferred / not yet release-ready

- Playwright could not be run in this sandbox: `next start` was denied a local
  port bind with `EACCES`, so it is not recorded as passing.
- Secret-pattern scanning found no private keys, AWS keys or runtime JWT
  secrets. It did find many clearly weak demo passwords in legacy
  `backend/scripts/`; these must be removed, parameterized or excluded before
  public-source packaging, even though they are not production credentials.

## Credential classification

- **Runtime validation:** the only source-runtime matches are `secret123` and
  `password123` in `backend/src/config/env.ts`; they are deny-list values that
  reject weak deployment secrets, not usable credentials.
- **Runtime/CI seed:** `backend/scripts/seed.js` requires a strong
  `DEMO_ADMIN_PASSWORD`; CI supplies it through its environment. No weak
  default is accepted.
- **Isolated E2E:** the registered E2E runners use `.env.test.example` and
  temporary Docker env files, never the legacy script literals.
- **Dev seed:** `backend/scripts/seed.js` retains weak-string deny-list checks
  and requires `DEMO_ADMIN_PASSWORD`; all account-creating dev seeds use that
  environment variable and have no password default.
- **Manual/admin scripts:** reset, admin creation, user provisioning and seed
  launchers require `DEMO_ADMIN_PASSWORD`; no active/manual script retains a
  weak credential literal.
- **Test/debug and docs:** remaining literals occur only in explicit fixture,
  debug/test scripts or documentation examples. They are not called by CI or
  package scripts and are not runtime credentials.

## Release decision

Release-blocking security debt: **None**. The verified Playwright suite runs
against the standalone build on `127.0.0.1`; the earlier issue was a
loopback-bind/configuration setup issue, not a product regression.
