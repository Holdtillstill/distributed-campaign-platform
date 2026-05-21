#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${REPO_ROOT}"

CAMPAIGN_API_URL="${CAMPAIGN_API_URL:-http://127.0.0.1:8081}"
PROVIDER_URL="${PROVIDER_URL:-http://127.0.0.1:8082}"
DISPATCHER_URL="${DISPATCHER_URL:-http://127.0.0.1:8083}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-60}"
SLEEP_SECONDS="${SLEEP_SECONDS:-2}"
MESSAGE_COUNT="${MESSAGE_COUNT:-3}"
EXPECT_SENT_ALL="${EXPECT_SENT_ALL:-true}"

log() {
  printf '[e2e-smoke] %s\n' "$*"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log "Required command not found: $1"
    exit 1
  fi
}

wait_for_http() {
  local name="$1"
  local url="$2"
  local deadline=$((SECONDS + TIMEOUT_SECONDS))

  log "Waiting for ${name} at ${url}..."
  until curl -fsS --max-time 2 "${url}" >/dev/null; do
    if (( SECONDS >= deadline )); then
      log "Timed out waiting for ${name} after ${TIMEOUT_SECONDS}s"
      curl -v --max-time 5 "${url}" || true
      return 1
    fi
    sleep "${SLEEP_SECONDS}"
  done
  log "${name} is ready."
}

json_field() {
  local field="$1"
  python3 -c 'import json,sys; print(json.load(sys.stdin)[sys.argv[1]])' "${field}"
}

status_summary() {
  python3 -c '
import json, sys
payload = json.load(sys.stdin)
counts = payload.get("status_counts", {})
terminal_statuses = ("sent", "retried", "failed", "dead_lettered")
queued = int(counts.get("queued", 0) or 0)
terminal = sum(int(counts.get(status, 0) or 0) for status in terminal_statuses)
sent = int(counts.get("sent", 0) or 0)
total = queued + terminal
print(queued, terminal, sent, total)
'
}

require_command docker
require_command curl
require_command python3

log "Repository root: ${REPO_ROOT}"
"${SCRIPT_DIR}/wait-for-local-stack.sh"

wait_for_http "Campaign API" "${CAMPAIGN_API_URL}/healthz"
wait_for_http "Provider Simulator" "${PROVIDER_URL}/healthz"
wait_for_http "Dispatcher" "${DISPATCHER_URL}/healthz"

campaign_name="local-smoke-$(date +%Y%m%d%H%M%S)"
log "Creating campaign ${campaign_name} with ${MESSAGE_COUNT} recipients..."

create_payload=$(python3 -c '
import json, sys
message_count = int(sys.argv[1])
recipients = [f"+1555000{index:03d}" for index in range(1, message_count + 1)]
print(json.dumps({
    "name": sys.argv[2],
    "body": "Local Docker Compose smoke test",
    "recipients": recipients,
}))
' "${MESSAGE_COUNT}" "${campaign_name}")

create_response=$(curl -fsS \
  -H 'Content-Type: application/json' \
  -d "${create_payload}" \
  "${CAMPAIGN_API_URL}/campaigns")

campaign_id=$(printf '%s' "${create_response}" | json_field id)
created_count=$(printf '%s' "${create_response}" | json_field message_count)
log "Created campaign ${campaign_id}; initial response: ${create_response}"

if [[ "${created_count}" != "${MESSAGE_COUNT}" ]]; then
  log "Expected ${MESSAGE_COUNT} messages, but campaign API created ${created_count}"
  exit 1
fi

log "Polling campaign status until all messages leave queued status..."
deadline=$((SECONDS + TIMEOUT_SECONDS))
last_response=""
while true; do
  last_response=$(curl -fsS "${CAMPAIGN_API_URL}/campaigns/${campaign_id}")
  read -r queued terminal sent total <<EOF_SUMMARY
$(printf '%s' "${last_response}" | status_summary)
EOF_SUMMARY

  log "Status counts: ${last_response}"

  if [[ "${queued}" == "0" && "${terminal}" == "${MESSAGE_COUNT}" ]]; then
    if [[ "${EXPECT_SENT_ALL}" == "true" && "${sent}" != "${MESSAGE_COUNT}" ]]; then
      log "All messages reached terminal statuses, but expected provider success to send all ${MESSAGE_COUNT}; sent=${sent}"
      exit 1
    fi
    log "Smoke test passed: ${terminal}/${MESSAGE_COUNT} messages reached terminal status."
    exit 0
  fi

  if (( SECONDS >= deadline )); then
    log "Timed out waiting for terminal statuses after ${TIMEOUT_SECONDS}s"
    log "Last campaign response: ${last_response}"
    log "Recent service logs:"
    docker compose logs --tail=80 campaign-api provider-simulator dispatcher || true
    exit 1
  fi

  sleep "${SLEEP_SECONDS}"
done
