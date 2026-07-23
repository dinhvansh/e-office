#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! docker compose ps --status running --services | grep -qx db; then
  echo "The Compose database service is not running." >&2
  exit 1
fi

BACKUP_ROOT="${1:-${BACKUP_ROOT:-$ROOT_DIR/backups}}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$BACKUP_ROOT/$STAMP"
mkdir -p "$BACKUP_DIR"

echo "Creating PostgreSQL backup..."
docker compose exec -T db sh -c \
  'exec pg_dump --format=custom --no-owner --no-privileges -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  > "$BACKUP_DIR/database.dump"

echo "Creating document-storage backup..."
docker compose exec -T backend sh -c \
  'exec tar -C /app/storage -czf - .' \
  > "$BACKUP_DIR/storage.tar.gz"

if [[ -f .env ]]; then
  cp .env "$BACKUP_DIR/environment.env"
  chmod 600 "$BACKUP_DIR/environment.env" 2>/dev/null || true
fi

docker compose config > "$BACKUP_DIR/compose.resolved.yaml"
printf '%s\n' \
  "created_utc=$STAMP" \
  "git_commit=$(git rev-parse HEAD 2>/dev/null || echo unknown)" \
  > "$BACKUP_DIR/manifest.txt"

test -s "$BACKUP_DIR/database.dump"
test -s "$BACKUP_DIR/storage.tar.gz"

echo "Backup created: $BACKUP_DIR"
echo "Treat this directory as sensitive data."
