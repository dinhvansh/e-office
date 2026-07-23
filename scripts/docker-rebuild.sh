#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  echo "Missing .env. Follow INSTALL-DEMO.md or INSTALL-PRODUCTION.md." >&2
  exit 1
fi

docker compose config --quiet
docker compose up -d --build
docker compose ps

echo "Rebuild complete. Data volumes were preserved."
