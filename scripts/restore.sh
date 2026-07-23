#!/usr/bin/env bash

set -Eeuo pipefail

usage() {
  echo "Usage: ./scripts/restore.sh BACKUP_DIRECTORY --yes"
}

BACKUP_DIR="${1:-}"
CONFIRM="${2:-}"
if [[ -z "$BACKUP_DIR" || "$CONFIRM" != "--yes" ]]; then
  usage
  exit 2
fi

BACKUP_DIR="$(cd "$BACKUP_DIR" && pwd)"
for required_file in database.dump storage.tar.gz; do
  if [[ ! -s "$BACKUP_DIR/$required_file" ]]; then
    echo "Missing or empty backup file: $BACKUP_DIR/$required_file" >&2
    exit 1
  fi
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Stopping application services..."
docker compose stop frontend backend outbox-worker

restore_failed=true
finish() {
  if [[ "$restore_failed" == true ]]; then
    echo "Restore failed; application services remain stopped." >&2
  fi
}
trap finish EXIT

echo "Resetting the application schema..."
docker compose exec -T db sh -c \
  'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" "$POSTGRES_DB" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"'

echo "Restoring PostgreSQL..."
docker compose exec -T db sh -c \
  'exec pg_restore --exit-on-error --no-owner --no-privileges -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < "$BACKUP_DIR/database.dump"

echo "Restoring document storage..."
docker compose run --rm --no-deps -T backend sh -c \
  'find /app/storage -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +; tar -C /app/storage -xzf -' \
  < "$BACKUP_DIR/storage.tar.gz"

echo "Starting application services..."
docker compose up -d backend outbox-worker frontend
restore_failed=false
trap - EXIT
docker compose ps
echo "Restore completed. Verify login and a representative document download."
