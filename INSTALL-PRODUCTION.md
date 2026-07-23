# Install a retained self-hosted deployment

This guide targets a small Linux server or VM. It uses Docker Compose and keeps
PostgreSQL data, generated documents, and backups in named volumes.

## 1. Prepare the host

Install Docker Engine and the Docker Compose v2 plugin using Docker's official
instructions. Configure DNS, TLS, firewall rules, and the reverse proxy using
your normal infrastructure process.

Confirm:

```bash
docker --version
docker compose version
openssl version
```

Clone a reviewed release or commit:

```bash
git clone https://github.com/dinhvansh/e-office.git
cd e-office
```

## 2. Generate production configuration

Set the externally reachable HTTPS URL. When the reverse proxy routes `/api/`
to the backend, both frontend API variables can use the same origin:

```bash
APP_BASE_URL=https://office.example.com \
CORS_ORIGIN=https://office.example.com \
NEXT_PUBLIC_API_URL=https://office.example.com/api/v1 \
NEXT_PUBLIC_API_BASE_URL=https://office.example.com/api/v1 \
./install.sh production --no-start
```

The installer generates unique secrets and creates `.env` with mode `600`. It
will not overwrite an existing `.env` unless `--force-env` is supplied.

Review `.env`. Production requirements:

- `AUTO_INIT_DB=false`
- `RATE_LIMIT_BYPASS_EMAILS` empty
- unique `POSTGRES_PASSWORD`, `JWT_SECRET`, and `REFRESH_TOKEN_SECRET`
- explicit HTTPS `APP_BASE_URL` and `CORS_ORIGIN`
- both `NEXT_PUBLIC_API_*` variables aligned with the public API route
- `AUTH_COOKIE_SECURE=true`
- `SMTP_ENABLED=false` until all SMTP settings are valid

## 3. Validate and start

```bash
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

The backend applies `prisma migrate deploy` automatically. Never use
`prisma db push` against a retained, staging, or production database.

Wait for readiness:

```bash
for attempt in $(seq 1 60); do
  curl --fail --silent http://localhost:4000/health && break
  sleep 2
done
curl --fail http://localhost:3000/
```

## 4. Configure the reverse proxy

Publish only HTTPS:

- route `/api/` to backend port `4000`;
- route all other paths to frontend port `3000`;
- preserve the original `Host` and forwarding headers;
- do not expose PostgreSQL or Redis publicly.

Changing either `NEXT_PUBLIC_API_*` value requires rebuilding the frontend:

```bash
docker compose up -d --build frontend
```

## 5. Bootstrap the first tenant owner

The Open Source Core has no public registration endpoint. Run this command once
after migrations complete:

```bash
docker compose exec \
  -e BOOTSTRAP_WORKSPACE_NAME='Example Organization' \
  -e BOOTSTRAP_OWNER_EMAIL='owner@example.com' \
  -e BOOTSTRAP_OWNER_NAME='Initial Owner' \
  -e BOOTSTRAP_OWNER_PASSWORD='replace-with-a-long-unique-password' \
  backend node scripts/bootstrap-tenant.js
```

The command is idempotency-safe: it refuses to overwrite an existing owner
email or create a second tenant with the same name. It creates the permission
catalog, default roles, and the owner membership without demo documents or demo
users.

Remove the password from shell history where applicable. Sign in and change the
password according to your organization's credential policy.

## 6. SMTP, storage, and optional license service

Keep `SMTP_ENABLED=false` until `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, and
`EMAIL_FROM` are configured.

Local named-volume storage is the default. For S3-compatible storage configure
all `S3_*` variables before setting `FILE_STORAGE_DRIVER=s3`. Follow
[`docs/operations/file-storage.md`](docs/operations/file-storage.md) for AWS S3,
external MinIO, or the optional bundled MinIO overlay. Existing local files are
not migrated automatically when the driver changes.

The license service is optional and disabled in the core stack. Its supported
profile is documented in `docs/docker/README.md`.

## 7. Backup and update

Before every update:

```bash
./scripts/backup.sh
git fetch origin
git pull --ff-only origin main
./deploy.sh production
```

See [docs/BACKUP-RESTORE.md](docs/BACKUP-RESTORE.md) and test restores on an
isolated deployment.
