# Archived pre-baseline migrations

`0_init` is the active, reviewed Prisma baseline for an empty PostgreSQL
database. The migrations in this directory are retained only as historical
reference: they were incremental changes applied after the project had already
used `prisma db push`, so they cannot initialize an empty database on their own.

Do not move these files back into `backend/prisma/migrations`. Existing
databases must follow `docs/database-migrations.md` and record the `0_init`
baseline with `prisma migrate resolve --applied 0_init` only after a backup and
a schema-drift check confirm the database already matches the baseline.
