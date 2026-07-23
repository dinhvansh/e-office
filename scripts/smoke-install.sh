#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -e .env ]]; then
  echo "Smoke install requires a clean checkout without .env." >&2
  exit 1
fi

export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-eoffice-install-smoke}"
export BACKEND_PORT="${BACKEND_PORT:-44000}"
export FRONTEND_PORT="${FRONTEND_PORT:-44001}"
export DEMO_ADMIN_PASSWORD="${DEMO_ADMIN_PASSWORD:-SmokeDemoPassword-2026}"

SMOKE_BACKUP_ROOT="$(mktemp -d)"

cleanup() {
  local status=$?
  if [[ "$status" -ne 0 && "${INSTALL_SMOKE_KEEP_CONTAINERS:-false}" == "true" ]]; then
    echo "Retaining failed smoke stack for workflow diagnostics." >&2
    return "$status"
  fi
  docker compose --env-file .env down --volumes --remove-orphans || true
  rm -f .env
  rm -rf "$SMOKE_BACKUP_ROOT"
  return "$status"
}
trap cleanup EXIT

./install.sh demo

curl --fail --silent "http://localhost:${BACKEND_PORT}/health" >/dev/null
curl --fail --silent "http://localhost:${FRONTEND_PORT}/" >/dev/null

LOGIN_RESPONSE="$(
  curl --fail --silent \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"admin@acme.local\",\"password\":\"${DEMO_ADMIN_PASSWORD}\"}" \
    "http://localhost:${BACKEND_PORT}/api/v1/auth/login"
)"
node -e '
  const result = JSON.parse(process.argv[1]);
  if (result.success !== true || !result.data?.tokens?.accessToken) process.exit(1);
' "$LOGIN_RESPONSE"

./scripts/backup.sh "$SMOKE_BACKUP_ROOT"
BACKUP_DIR="$(find "$SMOKE_BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
test -n "$BACKUP_DIR"
./scripts/restore.sh "$BACKUP_DIR" --yes

for _ in $(seq 1 60); do
  if curl --fail --silent "http://localhost:${BACKEND_PORT}/health" >/dev/null; then
    break
  fi
  sleep 2
done
curl --fail --silent "http://localhost:${BACKEND_PORT}/health" >/dev/null

curl --fail --silent \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"admin@acme.local\",\"password\":\"${DEMO_ADMIN_PASSWORD}\"}" \
  "http://localhost:${BACKEND_PORT}/api/v1/auth/login" >/dev/null

echo "Install, health, login, backup, and restore smoke checks passed."
