#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CLUSTER_NAME="${KIND_CLUSTER_NAME:-campaign-platform}"
NAMESPACE="${KUBE_NAMESPACE:-campaign-platform}"

if ! kind get clusters | grep -qx "${CLUSTER_NAME}"; then
  kind create cluster --config "${ROOT_DIR}/deploy/kind/cluster.yaml"
fi

# Build local images into kind so this phase does not require a registry.
docker build -t campaign-api:local -f "${ROOT_DIR}/apps/campaign-api/Dockerfile" "${ROOT_DIR}"
docker build -t dispatcher:local -f "${ROOT_DIR}/apps/dispatcher/Dockerfile" "${ROOT_DIR}"
docker build -t provider-simulator:local -f "${ROOT_DIR}/apps/provider-simulator/Dockerfile" "${ROOT_DIR}"
docker build -t web-ui:local -f "${ROOT_DIR}/apps/web-ui/Dockerfile" "${ROOT_DIR}"

kind load docker-image --name "${CLUSTER_NAME}" campaign-api:local dispatcher:local provider-simulator:local web-ui:local

kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -
helm upgrade --install campaign-platform "${ROOT_DIR}/deploy/helm/campaign-platform" \
  --namespace "${NAMESPACE}" \
  --set campaignApi.service.port=8080

kubectl -n "${NAMESPACE}" rollout status deploy/campaign-platform-campaign-api
kubectl -n "${NAMESPACE}" rollout status deploy/campaign-platform-provider-simulator
kubectl -n "${NAMESPACE}" rollout status deploy/campaign-platform-web-ui
kubectl -n "${NAMESPACE}" rollout status deploy/campaign-platform-dispatcher
