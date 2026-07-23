#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  echo "Missing .env. Follow INSTALL-PRODUCTION.md first." >&2
  exit 1
fi
if grep -q '^AUTO_INIT_DB=true$' .env; then
  echo "Refusing retained deployment while AUTO_INIT_DB=true." >&2
  exit 1
fi

compose=(docker compose)
if grep -q '^S3_ENDPOINT=http://minio:9000$' .env; then
  compose+=(-f docker-compose.yml -f docker-compose.minio.yml)
fi
PROXY_NETWORK_NAME_VALUE="$(sed -n 's/^PROXY_NETWORK_NAME=//p' .env | tail -n 1)"
if [[ -n "$PROXY_NETWORK_NAME_VALUE" ]]; then
  if [[ ! "$PROXY_NETWORK_NAME_VALUE" =~ ^[a-zA-Z0-9][a-zA-Z0-9_.-]*$ ]]; then
    echo "Invalid PROXY_NETWORK_NAME." >&2
    exit 1
  fi
  docker network inspect "$PROXY_NETWORK_NAME_VALUE" >/dev/null
  compose+=(-f docker-compose.yml -f docker-compose.proxy.yml)
fi

"${compose[@]}" version >/dev/null
"${compose[@]}" config --quiet

if [[ "${SKIP_BACKUP:-false}" != "true" ]] &&
  "${compose[@]}" ps --status running --services | grep -qx db; then
  ./scripts/backup.sh
fi

"${compose[@]}" up -d --build

BACKEND_PORT_VALUE="$(sed -n 's/^BACKEND_PORT=//p' .env | tail -n 1)"
BACKEND_PORT_VALUE="${BACKEND_PORT_VALUE:-4000}"
for _ in $(seq 1 90); do
  if curl --fail --silent "http://localhost:${BACKEND_PORT_VALUE}/health" >/dev/null; then
    "${compose[@]}" ps
    echo "Deployment completed."
    exit 0
  fi
  sleep 2
done

echo "Backend did not become healthy after deployment." >&2
"${compose[@]}" ps >&2 || true
"${compose[@]}" logs --tail=200 backend frontend outbox-worker >&2 || true
exit 1
