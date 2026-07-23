#!/usr/bin/env bash

set -euo pipefail

cat >&2 <<'EOF'
clean-reset.sh has been retired because it performed Docker-wide deletion.

For a disposable demo only, review INSTALL-DEMO.md and run the scoped command:

  docker compose down --volumes

This removes only the current Compose project's containers and named volumes.
It does not remove .env, unrelated images, networks, or Docker host data.
EOF
exit 1
