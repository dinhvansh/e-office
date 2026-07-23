#!/usr/bin/env bash

set -Eeuo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./install.sh demo [--no-start] [--force-env]
  ./install.sh production [--no-start] [--force-env]

Demo environment:
  DEMO_ADMIN_PASSWORD     Required, at least 16 characters.

Production environment:
  APP_BASE_URL            Required public HTTPS application URL.
  CORS_ORIGIN             Required explicit public origin.
  NEXT_PUBLIC_API_URL     Required public API URL ending in /api/v1.
  NEXT_PUBLIC_API_BASE_URL Required public API URL ending in /api/v1.

Optional:
  INSTALL_ENV_FILE        Alternate output env file (default: .env).
  COMPOSE_PROJECT_NAME    Alternate Compose project name.

The installer requires Docker Compose v2, OpenSSL, and curl. It does not install
host packages, modify firewall rules, configure DNS, or issue TLS certificates.
EOF
}

MODE="${1:-}"
if [[ "$MODE" != "demo" && "$MODE" != "production" ]]; then
  usage
  exit 2
fi
shift

START_STACK=true
FORCE_ENV=false
while (($#)); do
  case "$1" in
    --no-start) START_STACK=false ;;
    --force-env) FORCE_ENV=true ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 2
      ;;
  esac
  shift
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${INSTALL_ENV_FILE:-$ROOT_DIR/.env}"
TEMPLATE_FILE="$ROOT_DIR/.env.compose.example"

for command_name in docker openssl curl sed grep; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Required command not found: $command_name" >&2
    exit 1
  fi
done

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is required (docker compose)." >&2
  exit 1
fi

if [[ ! -f "$TEMPLATE_FILE" ]]; then
  echo "Missing environment template: $TEMPLATE_FILE" >&2
  exit 1
fi

if [[ "$MODE" == "demo" ]]; then
  if [[ -z "${DEMO_ADMIN_PASSWORD:-}" ]] && [[ -t 0 ]]; then
    read -r -s -p "Demo admin password (minimum 16 characters): " DEMO_ADMIN_PASSWORD
    echo
  fi
  if [[ -z "${DEMO_ADMIN_PASSWORD:-}" || ${#DEMO_ADMIN_PASSWORD} -lt 16 ]]; then
    echo "DEMO_ADMIN_PASSWORD must be a unique value of at least 16 characters." >&2
    exit 1
  fi
else
  : "${APP_BASE_URL:?APP_BASE_URL is required for production}"
  : "${CORS_ORIGIN:?CORS_ORIGIN is required for production}"
  : "${NEXT_PUBLIC_API_URL:?NEXT_PUBLIC_API_URL is required for production}"
  : "${NEXT_PUBLIC_API_BASE_URL:?NEXT_PUBLIC_API_BASE_URL is required for production}"

  case "$APP_BASE_URL $CORS_ORIGIN $NEXT_PUBLIC_API_URL $NEXT_PUBLIC_API_BASE_URL" in
    *http://*)
      echo "Production public URLs must use https://." >&2
      exit 1
      ;;
  esac
fi

escape_sed_replacement() {
  printf '%s' "$1" | sed 's/[&|\\]/\\&/g'
}

set_env_value() {
  local key="$1"
  local value="$2"
  local escaped
  escaped="$(escape_sed_replacement "$value")"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i.bak "s|^${key}=.*|${key}=${escaped}|" "$ENV_FILE"
    rm -f "${ENV_FILE}.bak"
  else
    printf '%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

read_env_value() {
  local key="$1"
  grep -E "^${key}=" "$ENV_FILE" | tail -n 1 | cut -d= -f2-
}

if [[ -e "$ENV_FILE" && "$FORCE_ENV" != true ]]; then
  echo "Environment file already exists: $ENV_FILE" >&2
  echo "Review it and run Docker Compose directly, or rerun with --force-env." >&2
  exit 1
fi

cp "$TEMPLATE_FILE" "$ENV_FILE"

DB_PASSWORD="$(openssl rand -hex 24)"
JWT_SECRET="$(openssl rand -hex 32)"
REFRESH_SECRET="$(openssl rand -hex 32)"
LICENSE_SECRET="$(openssl rand -hex 32)"

set_env_value POSTGRES_PASSWORD "$DB_PASSWORD"
set_env_value DATABASE_URL "postgresql://eoffice:${DB_PASSWORD}@db:5432/eoffice_db"
set_env_value JWT_SECRET "$JWT_SECRET"
set_env_value REFRESH_TOKEN_SECRET "$REFRESH_SECRET"
set_env_value LICENSE_SIGNING_SECRET "$LICENSE_SECRET"
set_env_value RATE_LIMIT_BYPASS_EMAILS ""
set_env_value SMTP_ENABLED "false"
set_env_value BACKEND_PORT "${BACKEND_PORT:-4000}"
set_env_value FRONTEND_PORT "${FRONTEND_PORT:-3000}"

if [[ "$MODE" == "demo" ]]; then
  set_env_value APP_BASE_URL "${APP_BASE_URL:-http://localhost:3000}"
  set_env_value CORS_ORIGIN "${CORS_ORIGIN:-http://localhost:3000}"
  set_env_value NEXT_PUBLIC_API_URL "${NEXT_PUBLIC_API_URL:-http://localhost:4000/api/v1}"
  set_env_value NEXT_PUBLIC_API_BASE_URL "${NEXT_PUBLIC_API_BASE_URL:-http://localhost:4000/api/v1}"
  set_env_value AUTH_COOKIE_SECURE "false"
  set_env_value AUTO_INIT_DB "true"
  set_env_value DEMO_ADMIN_PASSWORD "$DEMO_ADMIN_PASSWORD"
else
  set_env_value APP_BASE_URL "$APP_BASE_URL"
  set_env_value CORS_ORIGIN "$CORS_ORIGIN"
  set_env_value NEXT_PUBLIC_API_URL "$NEXT_PUBLIC_API_URL"
  set_env_value NEXT_PUBLIC_API_BASE_URL "$NEXT_PUBLIC_API_BASE_URL"
  set_env_value AUTH_COOKIE_SECURE "true"
  set_env_value AUTO_INIT_DB "false"
  set_env_value DEMO_ADMIN_PASSWORD ""
fi

chmod 600 "$ENV_FILE" 2>/dev/null || true

compose=(docker compose --env-file "$ENV_FILE")
"${compose[@]}" config --quiet
echo "Validated Compose configuration: $ENV_FILE"

if [[ "$START_STACK" != true ]]; then
  echo "Configuration created. Start with:"
  echo "  docker compose --env-file \"$ENV_FILE\" up -d --build"
  exit 0
fi

"${compose[@]}" up -d --build

BACKEND_PORT="$(read_env_value BACKEND_PORT)"
FRONTEND_PORT="$(read_env_value FRONTEND_PORT)"
BACKEND_PORT="${BACKEND_PORT:-4000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

wait_for_url() {
  local name="$1"
  local url="$2"
  for _ in $(seq 1 90); do
    if curl --fail --silent --show-error "$url" >/dev/null 2>&1; then
      echo "$name is ready: $url"
      return 0
    fi
    sleep 2
  done
  echo "$name did not become ready: $url" >&2
  "${compose[@]}" ps >&2 || true
  "${compose[@]}" logs --tail=200 backend frontend >&2 || true
  return 1
}

wait_for_url "Backend" "http://localhost:${BACKEND_PORT}/health"
wait_for_url "Frontend" "http://localhost:${FRONTEND_PORT}/"

"${compose[@]}" ps
echo "Installation complete."
if [[ "$MODE" == "demo" ]]; then
  echo "Login email: admin@acme.local"
  echo "Login password: the value supplied through DEMO_ADMIN_PASSWORD"
else
  echo "Next: bootstrap the first tenant owner using INSTALL-PRODUCTION.md."
fi
