#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NAMESPACE="${OBSERVABILITY_NAMESPACE:-observability}"
CONFIGMAP_NAME="${GRAFANA_DASHBOARDS_CONFIGMAP:-campaign-platform-grafana-dashboards}"
DASHBOARD_DIR="${ROOT_DIR}/platform/observability/dashboards"

kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -
kubectl -n "${NAMESPACE}" create configmap "${CONFIGMAP_NAME}" \
  --from-file="${DASHBOARD_DIR}/kubernetes-essential-overview.json" \
  --from-file="${DASHBOARD_DIR}/campaign-platform-essential-overview.json" \
  --dry-run=client -o yaml \
  | kubectl label --local -f - grafana_dashboard=1 -o yaml \
  | kubectl apply -f -
