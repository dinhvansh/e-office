# Prisma migration baseline

The active Prisma history begins with `backend/prisma/migrations/0_init`.
It is a squashed baseline generated from `backend/prisma/schema.prisma` with:

```bash
cd backend
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
```

The resulting SQL creates the complete schema, indexes, and foreign keys for a
**blank PostgreSQL database**. It contains no seed data and no destructive or
data-changing statements.

## New or empty database

Set `DATABASE_URL` to a newly created, empty database, then run:

```bash
cd backend
npx prisma migrate deploy
npx prisma migrate status
```

Run idempotent seed scripts only when a local demo or E2E environment needs
synthetic data. Seeds are intentionally separate from migrations.

## Existing database adoption

Do not run `prisma migrate deploy` with `0_init` against an already populated
database. The baseline contains `CREATE TABLE` statements and will fail rather
than overwrite existing tables.

Use this procedure only when the existing database is expected to match the
current Prisma schema:

1. Take and verify a database backup.
2. Compare the live database to the Prisma schema before changing migration
   metadata:

   ```bash
   cd backend
   npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --exit-code
   ```

   Exit code `0` means no drift. Any other result requires review and repair;
   do not mark the baseline applied.
3. If and only if the database schema matches and the backup is available,
   record the baseline without executing its SQL:

   ```bash
   npx prisma migrate resolve --applied 0_init
   ```
4. Confirm the recorded history and absence of drift:

   ```bash
   npx prisma migrate status
   npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --exit-code
   ```

Never use `migrate resolve --applied` to hide a mismatch, and never rerun the
baseline against a populated matching schema. The previous incremental migration
files are retained under `backend/prisma/migrations_archive` for historical
reference and are not an active deployment path.

## Future schema changes

Create a new reviewed migration after `0_init` with `prisma migrate dev` in a
disposable development database. Deploy it with `prisma migrate deploy`; do not
use `prisma db push` for CI, Docker bootstrap, staging, or production.
