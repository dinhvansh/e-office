# Docker Deployment

## Secure default startup

For end-to-end installation instructions, use
[`../../INSTALL-DEMO.md`](../../INSTALL-DEMO.md) or
[`../../INSTALL-PRODUCTION.md`](../../INSTALL-PRODUCTION.md). The commands below
explain the Compose layer rather than defining a separate installation path.

```powershell
# 1. Create a private environment file and replace every GENERATE_* value.
Copy-Item .env.compose.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Generate different values for POSTGRES_PASSWORD, JWT_SECRET, and
# REFRESH_TOKEN_SECRET. Set CORS_ORIGIN and APP_BASE_URL to the public URL.

# 2. Validate, build, and start the open-source core stack.
docker compose config
docker compose up -d --build

# 3. Check application readiness.
docker compose ps
curl http://localhost:4000/health
curl http://localhost:3000/
```

The backend runs `prisma migrate deploy` before it starts. Seed scripts remain
separate and run only when `AUTO_INIT_DB=true` and a unique
`DEMO_ADMIN_PASSWORD` is supplied; use that option only for a new, disposable
demo database. It never replaces migrations and must not be used to seed a
production database.

Production startup rejects missing or weak JWT/refresh secrets, a wildcard or
empty `CORS_ORIGIN`, a missing `APP_BASE_URL`, and any
`RATE_LIMIT_BYPASS_EMAILS`. Set `SMTP_ENABLED=true` only when `SMTP_HOST`,
`SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_FROM` are all configured.
The backend image includes Noto Sans; the default `PDF_UNICODE_FONT_PATH` and
`PDF_UNICODE_BOLD_FONT_PATH` values in the Compose example match that image.

## Reproducible PostgreSQL E2E

Run the isolated Docker E2E stack from the repository root:

```powershell
npm run e2e:docker
```

The helper creates a temporary env file from `.env.test.example`, starts only
PostgreSQL, Redis, backend and the outbox worker with `docker-compose.test.yml`,
waits for health/readiness, applies migrations and executes the workflow E2E
inside the backend container. It removes containers and volumes afterward. The
committed values are deterministic **test-only** credentials and are never used
by the production Compose command. The helper never overwrites `.env`; use
`E2E_KEEP_CONTAINERS=1` to retain a failing stack for diagnosis.

GitHub Actions invokes this exact helper with `E2E_KEEP_CONTAINERS=1`, prints
Compose logs when it fails, then always removes its test containers and volumes.

## Reproducible MinIO/S3 E2E

Local filesystem storage remains the default (`FILE_STORAGE_DRIVER=local`). Run
the S3-compatible workflow separately with a disposable MinIO stack:

```powershell
npm run e2e:s3
```

This uses `.env.s3.test.example` only to create a temporary environment file.
It starts PostgreSQL, Redis, MinIO, a one-shot bucket initializer, backend and
outbox worker; all application services use path-style S3 calls to
`http://minio:9000`. The committed MinIO credentials are deterministic,
test-only fixtures, not production credentials. No MinIO console setup is
required. The runner verifies upload/download, tenant authorization, generated
artifact persistence and idempotent object deletion, prints service logs on
failure, and removes test containers and volumes afterward.

Configure a real S3-compatible deployment with `FILE_STORAGE_DRIVER=s3`,
`S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`,
`S3_SECRET_ACCESS_KEY`, and (where required) `S3_FORCE_PATH_STYLE=true`. Do
not put production values in either E2E env example. GitHub Actions runs both
`npm run e2e:docker` and `npm run e2e:s3` using these same entry points.

## Network and optional services

PostgreSQL and Redis use the internal Compose network by default; only frontend
and backend publish host ports. The default backend storage and backup paths are
named Docker volumes so the non-root app user can write safely. To expose
PostgreSQL/Redis or mount host storage for local tools, use the explicit
development override:

```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

The demo license server is not part of the default open-source stack and the
default Compose configuration sets `DISABLE_LICENSE_CHECK=true`. If a legacy
license integration is specifically required, generate a separate
`LICENSE_SIGNING_SECRET`, set `DISABLE_LICENSE_CHECK=false`, set
`LICENSE_SERVER_URL=http://license-server:5000/api/v1`, and start its profile:

```powershell
docker compose --profile license up -d --build
```

Application images run as an unprivileged `app` user. PostgreSQL, Redis,
backend, frontend, and the optional license service have health checks and use
`restart: unless-stopped`. If health remains unhealthy, start with
`docker compose logs backend db redis`; migration failures usually mean the
database is populated without the `0_init` migration recorded. Follow
[`docs/database-migrations.md`](../database-migrations.md) instead of resetting
or pushing an existing database.

## Files

- `DOCKER-DEPLOYMENT-GUIDE.md` - Hướng dẫn đầy đủ
- `DOCKER-BUILD-SUCCESS.md` - Kết quả test và troubleshooting
- `docker-test.md` - Test guide chi tiết
- `start-docker-test.ps1` - Script kiểm tra Docker Desktop
- `docker-quick-test.ps1` - Script test tự động (Windows)
- `docker-quick-test.sh` - Script test tự động (Linux/Mac)

## Services

- Backend: Node.js + TypeScript + Prisma (port 4000)
- Frontend: Next.js 16 (port 3000)
- Database: PostgreSQL 16 (internal by default; development override port 5432)
- Redis: 7-alpine (internal by default; development override port 6379)
- License Server: Node.js (optional `license` profile)

## Notes

- Docker images install locked dependencies with `npm ci` and build TypeScript
  before starting production processes.
- JWT and refresh secrets must be independently generated random values of at
  least 32 characters. The optional license profile has its own secret.
- The backend uses Debian slim with OpenSSL for Prisma compatibility; frontend
  and the optional license service remain Alpine-based.
