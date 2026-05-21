#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${REPO_ROOT}"

TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-60}"
SLEEP_SECONDS="${SLEEP_SECONDS:-2}"

log() {
  printf '[local-stack] %s\n' "$*"
}

check_postgres() {
  docker compose exec -T postgres sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
}

check_redis() {
  docker compose exec -T redis redis-cli ping | grep -q PONG
}

check_nats_jetstream() {
  docker compose exec -T nats sh -c "wget -qO- 'http://127.0.0.1:8222/healthz?js-enabled-only=true' | grep -q 'ok'"
}

wait_for() {
  local name="$1"
  local check_function="$2"
  local deadline=$((SECONDS + TIMEOUT_SECONDS))

  log "Waiting for ${name}..."
  until "${check_function}" >/dev/null 2>&1; do
    if (( SECONDS >= deadline )); then
      log "Timed out waiting for ${name} after ${TIMEOUT_SECONDS}s"
      log "Last status for ${name}:"
      "${check_function}" || true
      return 1
    fi
    sleep "${SLEEP_SECONDS}"
  done
  log "${name} is ready."
}

wait_for "PostgreSQL" check_postgres
wait_for "Redis" check_redis
wait_for "NATS JetStream" check_nats_jetstream

log "Local stack is ready."
