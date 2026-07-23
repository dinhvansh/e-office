# Backup and restore

Back up before every upgrade and test restores regularly on an isolated host.
Backup directories contain credentials, database records, and generated
documents; store them as sensitive data.

## Create a backup

From the repository root:

```bash
./scripts/backup.sh
```

An optional destination root may be supplied:

```bash
./scripts/backup.sh /secure/backup/e-office
```

Each timestamped backup contains:

- `database.dump`: PostgreSQL custom-format dump;
- `storage.tar.gz`: the backend document-storage volume;
- `environment.env`: the current environment file, when present;
- `compose.resolved.yaml`: the resolved deployment shape;
- `manifest.txt`: timestamp and Git commit.

The database command reads `POSTGRES_USER` and `POSTGRES_DB` inside the database
container. It does not depend on shell variables being exported on the host.

If `FILE_STORAGE_DRIVER=s3`, the local storage archive is not a substitute for
the object store's versioning or backup policy. Back up the configured bucket
separately.

## Restore

Restore is destructive: it replaces the current PostgreSQL schema and local
document storage. Confirm the exact backup path before running:

```bash
./scripts/restore.sh /secure/backup/e-office/20260723T010203Z --yes
```

The helper stops application services, resets the `public` schema, restores the
database and storage, then restarts the stack. If restore fails, application
services remain stopped so the partial state is not served.

After restore:

```bash
docker compose ps
curl --fail http://localhost:4000/health
```

Then verify:

1. an administrator can sign in;
2. a representative retained document can be opened and downloaded;
3. background outbox processing resumes without repeated failures;
4. the restored Git version is compatible with the restored migration state.

## Upgrade procedure

```bash
./scripts/backup.sh
git fetch origin
git pull --ff-only origin main
./deploy.sh production
```

Never use `docker compose down --volumes` during a normal update.
